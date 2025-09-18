import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import {
  requireAuth,
  requireRole,
  ensureCanManagePerson,
} from "../middleware/authz.js";
import mongoose from "mongoose";

const router = Router();

router.get("/", requireAuth, listItems);

router.post(
  "/",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  createItem
);
router.get("/:itemId", requireAuth, getItem);
router.put(
  "/:itemId",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  updateItem
);
router.delete(
  "/:itemId",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  deleteItem
);

async function listItems(req, res) {
  const { personId, organizationId, status } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (organizationId) filter.organizationId = organizationId;
  if (status) filter.status = status;
  const items = await CareNeedItem.find(filter).lean();
  res.json(items);
}

async function createItem(req, res) {
  try {
    const {
      personId,
      name,
      description,
      category,
      newCategoryName,
      frequency,
      endDate,
      occurrenceCount,
      budgetCost,
      purchaseCost,
      occurrenceCost,
      scheduleType,
      timeWindow,
    } = req.body;

    // Validate person & org scope
    const person = await PersonWithNeeds.findById(personId).select(
      "organizationId customCategories"
    );
    if (!person) return res.status(400).json({ error: "INVALID_PERSON" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    // ScheduleType/timeWindow validation
    const st = scheduleType === "Timed" ? "Timed" : "AllDay";
    let tw;
    if (st === "Timed") {
      if (!timeWindow || !timeWindow.startTime || !timeWindow.endTime) {
        return res.status(400).json({ error: "TIME_WINDOW_REQUIRED" });
      }
      const re = /^[0-2]\d:[0-5]\d$/;
      if (!re.test(timeWindow.startTime) || !re.test(timeWindow.endTime)) {
        return res.status(400).json({ error: "INVALID_TIME_FORMAT" });
      }
      if (timeWindow.endTime <= timeWindow.startTime) {
        return res
          .status(400)
          .json({ error: "END_TIME_MUST_BE_AFTER_START_TIME" });
      }
      tw = { startTime: timeWindow.startTime, endTime: timeWindow.endTime };
    }

    // Final category (persist custom to person if new)
    let finalCategory =
      newCategoryName && newCategoryName.trim()
        ? newCategoryName.trim()
        : (category || "").trim();
    if (!finalCategory)
      return res.status(400).json({ error: "CATEGORY_REQUIRED" });

    const predefined = [
      "HygieneProducts",
      "Clothing",
      "Health",
      "Entertainment",
      "Other",
    ].map((s) => s.toLowerCase());
    const existingCustom = new Set(
      (person.customCategories || []).map((s) => s.toLowerCase())
    );
    if (
      !predefined.includes(finalCategory.toLowerCase()) &&
      !existingCustom.has(finalCategory.toLowerCase())
    ) {
      await PersonWithNeeds.updateOne(
        { _id: person._id },
        { $addToSet: { customCategories: finalCategory } }
      );
    }

    // ——— Derive the year span for budgets[] ———
    const start =
      frequency?.intervalType === "JustPurchase"
        ? new Date() // purchase-only: today
        : frequency?.startDate
        ? new Date(frequency.startDate)
        : null;

    const intervalType = frequency?.intervalType;
    const intervalValue = Number(frequency?.intervalValue || 1);
    const occCount = occurrenceCount ? Number(occurrenceCount) : null;
    const hardEnd = endDate ? new Date(endDate) : null;

    const lastDate = computeLastOccurrenceDate({
      intervalType,
      intervalValue,
      startDate: start,
      endDate: hardEnd,
      occurrenceCount: occCount,
    });

    const years = deriveYearSetFromSpan(start, lastDate);
    const amount = Number(budgetCost) || 0;
    const budgets = Array.from(years).map((y) => ({ year: y, amount }));

    // Create the item (budgets filled for span)
    const item = await CareNeedItem.create({
      personId,
      organizationId: person.organizationId,
      name,
      description,
      category: finalCategory,
      frequency,
      endDate: hardEnd || null,
      occurrenceCount: occCount || null,
      budgetCost: amount, // keep legacy default
      budgets, // NEW: per-year entries
      purchaseCost: Number(purchaseCost) || 0,
      occurrenceCost: Number(occurrenceCost) || 0,
      scheduleType: st,
      timeWindow: tw,
      createdByUserId: req.user.id,
      status: "Active",
    });

    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

/** Helpers **/

function computeLastOccurrenceDate({
  intervalType,
  intervalValue,
  startDate,
  endDate,
  occurrenceCount,
}) {
  // If purchase-only or missing start, no span => use start year only
  if (!startDate) return startDate;

  // 1) If explicit endDate is provided, trust it
  if (endDate) return endDate;

  // 2) If occurrenceCount is provided, compute last by stepping (occCount-1) intervals
  if (occurrenceCount && occurrenceCount > 0) {
    const steps = Math.max(occurrenceCount - 1, 0);
    return stepDate(startDate, intervalType, intervalValue * steps);
  }

  // 3) Otherwise (no end condition): default to just the start year
  //    (You can change this policy if you want a default horizon)
  return startDate;
}

function stepDate(d0, t, n) {
  const d = new Date(d0);
  if (t === "Daily") d.setDate(d.getDate() + n);
  if (t === "Weekly") d.setDate(d.getDate() + 7 * n);
  if (t === "Monthly") d.setMonth(d.getMonth() + n);
  if (t === "Yearly") d.setFullYear(d.getFullYear() + n);
  // OneTime/JustPurchase: n should be 0; return same date
  return d;
}

function deriveYearSetFromSpan(start, end) {
  const set = new Set();
  if (!start) return set;
  const y1 = start.getUTCFullYear();
  const y2 = end ? end.getUTCFullYear() : y1;
  const low = Math.min(y1, y2);
  const high = Math.max(y1, y2);
  for (let y = low; y <= high; y++) set.add(y);
  return set;
}

async function getItem(req, res) {
  const item = await CareNeedItem.findById(req.params.itemId).lean();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
}

async function updateItem(req, res) {
  const existing = await CareNeedItem.findById(req.params.itemId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  // Permission against the item's person
  const perm = await ensureCanManagePerson(req.user, existing.personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  const patch = { ...req.body };
  // If personId changes, re-check permission + org
  if (patch.personId && String(patch.personId) !== String(existing.personId)) {
    const reperm = await ensureCanManagePerson(req.user, patch.personId);
    if (!reperm.ok) return res.status(403).json({ error: reperm.code });
    patch.organizationId = reperm.person.organizationId;
  }

  const updated = await CareNeedItem.findByIdAndUpdate(
    req.params.itemId,
    patch,
    { new: true, runValidators: true }
  );
  res.json(updated);
}

async function deleteItem(req, res) {
  const existing = await CareNeedItem.findById(req.params.itemId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const perm = await ensureCanManagePerson(req.user, existing.personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  await CareNeedItem.deleteOne({ _id: req.params.itemId });
  res.json({ message: "Item deleted" });
}

/**
 * PATCH /api/care-need-items/:itemId/budgets/:year
 * Body: { amount: number }
 * Upserts a single year budget inside CareNeedItem.budgets[]
 */
router.patch(
  "/:itemId/budgets/:year",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  async (req, res) => {
    try {
      const { itemId, year } = req.params;
      const { amount } = req.body || {};
      const y = Number(year);

      if (!mongoose.isValidObjectId(itemId)) {
        return res.status(400).json({ error: "INVALID_ITEM_ID" });
      }
      if (!Number.isFinite(y)) {
        return res.status(400).json({ error: "INVALID_YEAR" });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ error: "INVALID_AMOUNT" });
      }

      // Load item for permission + org boundary
      const item = await CareNeedItem.findById(itemId).lean();
      if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

      // Permission against the item's person
      const perm = await ensureCanManagePerson(req.user, item.personId);
      if (!perm.ok) return res.status(403).json({ error: perm.code });

      // org guard (belt-and-suspenders)
      if (String(item.organizationId) !== String(req.user.organizationId)) {
        return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
      }

      // Try update if year already exists
      const upd = await CareNeedItem.updateOne(
        { _id: item._id, "budgets.year": y },
        { $set: { "budgets.$.amount": amt } }
      );

      if (upd.matchedCount && upd.modifiedCount) {
        const updated = await CareNeedItem.findById(item._id).lean();
        return res.json({ ok: true, item: updated });
      }

      // Else push a new year row (avoid dup years; pre-save guard already exists)
      const pushRes = await CareNeedItem.findByIdAndUpdate(
        item._id,
        { $push: { budgets: { year: y, amount: amt } } },
        { new: true, runValidators: true }
      ).lean();

      return res.json({ ok: true, item: pushRes });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

export default router;
