import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import CareTask from "../models/CareTask.js";
import FileUpload from "../models/FileUpload.js";
import Comment from "../models/Comment.js";
import { deleteUploadBlob } from "../utils/deleteUploadBlob.js";
import { expandOccurrences } from "../utils/schedule.js";
import { checkBudgetAndNotify } from "../services/budgetMonitor.js";

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

function endOfYearUTC(year) {
  // 23:59:59.999 UTC on Dec 31 of `year`
  const startNext = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return new Date(startNext.getTime() - 1);
}

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

    // Check budget and send notifications if item has a purchase cost
    if (item.purchaseCost && item.purchaseCost > 0) {
      // Run budget check asynchronously to avoid blocking the response
      setImmediate(async () => {
        try {
          const currentYear = new Date().getFullYear();
          await checkBudgetAndNotify(item.personId, currentYear);
        } catch (error) {
          console.error('Error checking budget after care need item creation:', error);
        }
      });
    }

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

// Helper: combine date + "HH:mm"
function combineDateAndTime(dateOnly, hhmm) {
  if (!dateOnly || !hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
}

async function updateItem(req, res) {
  const existing = await CareNeedItem.findById(req.params.itemId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  // Permission against the item's person
  const perm = await ensureCanManagePerson(req.user, existing.personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  // Normalize payload
  const patch = { ...req.body };

  // Preserve frequency.startDate unless explicitly provided
  if (patch.frequency) {
    const next = {
      intervalType:
        patch.frequency.intervalType ?? existing.frequency?.intervalType,
      intervalValue: Number(
        patch.frequency.intervalValue ?? existing.frequency?.intervalValue ?? 1
      ),
      startDate: patch.frequency.startDate ?? existing.frequency?.startDate, // ← keep it
    };
    // Replace the nested-object write with dot-notation so we don't nuke keys
    patch["frequency.intervalType"] = next.intervalType;
    patch["frequency.intervalValue"] = next.intervalValue;
    patch["frequency.startDate"] = next.startDate
      ? new Date(next.startDate)
      : undefined;
    delete patch.frequency;
  }

  // If personId changes, re-check permission + org
  if (patch.personId && String(patch.personId) !== String(existing.personId)) {
    const reperm = await ensureCanManagePerson(req.user, patch.personId);
    if (!reperm.ok) return res.status(403).json({ error: reperm.code });
    patch.organizationId = reperm.person.organizationId;
  }

  // Validate scheduleType/timeWindow if provided
  if (patch.scheduleType === "Timed") {
    const tw = patch.timeWindow || existing.timeWindow;
    if (!tw || !tw.startTime || !tw.endTime)
      return res.status(400).json({ error: "TIME_WINDOW_REQUIRED" });
    const re = /^[0-2]\d:[0-5]\d$/;
    if (!re.test(tw.startTime) || !re.test(tw.endTime)) {
      return res.status(400).json({ error: "INVALID_TIME_FORMAT" });
    }
    if (tw.endTime <= tw.startTime) {
      return res
        .status(400)
        .json({ error: "END_TIME_MUST_BE_AFTER_START_TIME" });
    }
    patch.timeWindow = { startTime: tw.startTime, endTime: tw.endTime };
  } else if (patch.scheduleType === "AllDay") {
    // clear timeWindow if switching to AllDay
    patch.timeWindow = undefined;
  }

  // Enforce “JustPurchase => occurrenceCost = 0”
  const nextIntervalType =
    patch["frequency.intervalType"] ?? existing.frequency?.intervalType;
  if (nextIntervalType === "JustPurchase") {
    patch.occurrenceCost = 0;
  }

  // Detect changes that impact schedules (freq and schedule period/name)
  const scheduleImpact =
    (patch.name && patch.name !== existing.name) ||
    "frequency.intervalType" in patch ||
    "frequency.intervalValue" in patch ||
    "frequency.startDate" in patch ||
    (Object.prototype.hasOwnProperty.call(patch, "endDate") &&
      String(patch.endDate) !== String(existing.endDate)) ||
    (Object.prototype.hasOwnProperty.call(patch, "occurrenceCount") &&
      Number(patch.occurrenceCount ?? null) !==
        Number(existing.occurrenceCount ?? null)) ||
    (patch.scheduleType && patch.scheduleType !== existing.scheduleType) ||
    (patch.timeWindow &&
      JSON.stringify(patch.timeWindow) !== JSON.stringify(existing.timeWindow));

  // Track if budgetCost changed
  const budgetCostChanged =
    Object.prototype.hasOwnProperty.call(patch, "budgetCost") &&
    Number(patch.budgetCost) !== Number(existing.budgetCost);

  // Save the item first
  const updated = await CareNeedItem.findByIdAndUpdate(
    req.params.itemId,
    patch,
    { new: true, runValidators: true }
  );

  // 1) If budgetCost changed, upsert/update only current year's budgets[] row
  if (budgetCostChanged) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const amt = Number(updated.budgetCost || 0);

    const upd = await CareNeedItem.updateOne(
      { _id: updated._id, "budgets.year": y },
      { $set: { "budgets.$.amount": amt } }
    );

    if (!upd.matchedCount) {
      // add new current-year row
      await CareNeedItem.updateOne(
        { _id: updated._id },
        { $push: { budgets: { year: y, amount: amt } } }
      );
    }
  }

  // 2) If schedule-impacting fields changed AND item is not JustPurchase, rewrite pending tasks
  if (
    scheduleImpact &&
    (updated.frequency?.intervalType || "") !== "JustPurchase"
  ) {
    // Remove pending tasks (Scheduled or Skipped) — do not touch Completed/Missed/Cancelled
    await CareTask.deleteMany({
      careNeedItemId: updated._id,
      status: { $in: ["Scheduled", "Skipped"] },
    });

    // Rebuild full window (same policy as your /generate-tasks route)
    const start = updated.frequency?.startDate
      ? new Date(updated.frequency.startDate)
      : null;
    if (start) {
      const windowStart = start;
      // end = (a) explicit endDate, (b) last date from occurrenceCount, or
      //       (c) end of the CURRENT year for “year end” items
      let windowEnd;
      if (updated.endDate) {
        windowEnd = new Date(updated.endDate);
      } else if (updated.occurrenceCount) {
        const steps = Math.max(Number(updated.occurrenceCount) - 1, 0);
        const t = updated.frequency.intervalType;
        const iv = Number(updated.frequency.intervalValue) || 1;
        const d = new Date(start);
        if (t === "Daily") d.setDate(d.getDate() + iv * steps);
        if (t === "Weekly") d.setDate(d.getDate() + 7 * iv * steps);
        if (t === "Monthly") d.setMonth(d.getMonth() + iv * steps);
        if (t === "Yearly") d.setFullYear(d.getFullYear() + iv * steps);
        windowEnd = d;
      } else {
        const now = new Date();
        windowEnd = endOfYearUTC(now.getUTCFullYear());
      }

      const dates = expandOccurrences(
        {
          intervalType: updated.frequency.intervalType,
          intervalValue: updated.frequency.intervalValue || 1,
          startDate: start,
          endDate: updated.endDate || null,
          occurrenceCount: updated.occurrenceCount || null,
        },
        windowStart,
        windowEnd
      );

      // Upsert idempotently; ensure scheduleType/start/end set consistently
      for (const dueDate of dates) {
        const query = { careNeedItemId: updated._id, dueDate };
        const update = {
          $setOnInsert: {
            personId: updated.personId,
            organizationId: updated.organizationId,
            careNeedItemId: updated._id,
            title: updated.name,
            dueDate,
            status: "Scheduled",
          },
          $set: {
            scheduleType: updated.scheduleType === "Timed" ? "Timed" : "AllDay",
            startAt: null,
            endAt: null,
          },
        };

        if (updated.scheduleType === "Timed" && updated.timeWindow) {
          const startAt = combineDateAndTime(
            dueDate,
            updated.timeWindow.startTime
          );
          const endAt = combineDateAndTime(dueDate, updated.timeWindow.endTime);
          update.$set.startAt = startAt;
          update.$set.endAt = endAt;
        }

        await CareTask.updateOne(query, update, { upsert: true });
      }
    }
  }

  // Check budget if purchase cost was added or changed
  const oldPurchaseCost = existing.purchaseCost || 0;
  const newPurchaseCost = updated.purchaseCost || 0;
  const purchaseCostChanged = oldPurchaseCost !== newPurchaseCost;
  
  if (purchaseCostChanged && newPurchaseCost > 0) {
    // Run budget check asynchronously to avoid blocking the response
    setImmediate(async () => {
      try {
        const currentYear = new Date().getFullYear();
        await checkBudgetAndNotify(updated.personId, currentYear);
      } catch (error) {
        console.error('Error checking budget after care need item update:', error);
      }
    });
  }

  res.json(updated);
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

// Mark item as Returned + cancel all of its tasks
router.patch("/:id/return", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const item = await CareNeedItem.findById(id);
    if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });
    if (String(item.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    item.status = "Returned";
    await item.save();

    await CareTask.updateMany(
      { careNeedItemId: id },
      { $set: { status: "Cancelled" }, $unset: { cost: "" } } // cost unset => won't count anywhere
    );

    res.json({ ok: true, itemId: id, status: "Returned" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Hard delete item + EVERYTHING related to it
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const item = await CareNeedItem.findById(id);
    if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });
    if (String(item.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    // 1) Find associated tasks
    const tasks = await CareTask.find({ careNeedItemId: id }).select("_id");
    const taskIds = tasks.map((t) => t._id);

    // 2) Delete comments for those tasks
    if (taskIds.length) {
      await Comment.deleteMany({ careTaskId: { $in: taskIds } });
    }

    // 3) Delete file uploads attached to those tasks (DB + blob)
    if (taskIds.length) {
      const taskFiles = await FileUpload.find({
        scope: "CareTask",
        targetId: { $in: taskIds },
      }).lean();

      // unlink blobs (best effort)
      await Promise.all(taskFiles.map((f) => deleteUploadBlob(f.urlOrPath)));

      // delete docs
      await FileUpload.deleteMany({
        _id: { $in: taskFiles.map((f) => f._id) },
      });
    }

    // 4) Delete the tasks themselves
    await CareTask.deleteMany({ careNeedItemId: id });

    // 5) Delete direct uploads to the item (DB + blob)
    const itemFiles = await FileUpload.find({
      scope: "CareNeedItem",
      targetId: id,
    }).lean();

    await Promise.all(itemFiles.map((f) => deleteUploadBlob(f.urlOrPath)));
    await FileUpload.deleteMany({ _id: { $in: itemFiles.map((f) => f._id) } });

    // 6) Delete the associated comments
    await Comment.deleteMany({ careNeedItemId: id });

    // 6) Finally delete the item
    await CareNeedItem.deleteOne({ _id: id });

    res.json({ ok: true, deletedItemId: id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
