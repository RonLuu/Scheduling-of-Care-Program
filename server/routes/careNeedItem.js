import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import {
  requireAuth,
  requireRole,
  ensureCanManagePerson,
} from "../middleware/authz.js";

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
      category, // may be "Other" or any predefined/custom
      newCategoryName, // optional: custom category typed by user
      frequency,
      endDate,
      occurrenceCount,
      budgetCost,
      purchaseCost,
      occurrenceCost,
      scheduleType,
      timeWindow,
    } = req.body;

    // Load person to derive org & validate scope
    const person = await PersonWithNeeds.findById(personId).select(
      "organizationId"
    );
    if (!person) return res.status(400).json({ error: "INVALID_PERSON" });

    // Optional: role guard (only Family/Admin can create)
    if (!["Family", "Admin", "PoA"].includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    // Optional: ensure caller is same org as the person
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    // Validate scheduleType/timeWindow
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

    // Decide final category
    let finalCategory =
      newCategoryName && newCategoryName.trim()
        ? newCategoryName.trim()
        : (category || "").trim();
    if (!finalCategory)
      return res.status(400).json({ error: "CATEGORY_REQUIRED" });

    // If new, persist into person's customCategories (case-insensitive uniqueness)
    const existing = new Set(
      (person.customCategories || []).map((s) => s.toLowerCase())
    );
    const predefined = [
      "HygieneProducts",
      "Clothing",
      "Health",
      "Entertainment",
      "Other",
    ].map((s) => s.toLowerCase());
    if (
      !existing.has(finalCategory.toLowerCase()) &&
      !predefined.includes(finalCategory.toLowerCase())
    ) {
      await PersonWithNeeds.updateOne(
        { _id: person._id },
        { $addToSet: { customCategories: finalCategory } }
      );
    }

    // Create item (force organizationId from person)
    const item = await CareNeedItem.create({
      personId,
      organizationId: person.organizationId,
      name,
      description,
      category: finalCategory,
      frequency,
      endDate: endDate || null,
      occurrenceCount: occurrenceCount || null,
      budgetCost: Number(budgetCost) || 0,
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

export default router;
