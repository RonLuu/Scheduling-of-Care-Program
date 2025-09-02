import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import Person from "../models/PersonWithNeeds.js";
import { requireAuth, requireRole, ensureCanManagePerson } from "../middleware/authz.js";

const router = Router();

router.get("/", requireAuth, listItems);

// Only Admin, Family, PoA can create/update/delete items
router.post("/", requireAuth, requireRole("Admin","Family","PoA"), createItem);
router.get("/:itemId", requireAuth, getItem);
router.put("/:itemId", requireAuth, requireRole("Admin","Family","PoA"), updateItem);
router.delete("/:itemId", requireAuth, requireRole("Admin","Family","PoA"), deleteItem);

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
  const { personId } = req.body;

  // Permission: creator must manage this person (Admin in same org OR Family/PoA linked)
  const perm = await ensureCanManagePerson(req.user, personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  const doc = {
    ...req.body,
    organizationId: perm.person.organizationId,
    createdByUserId: req.user.id || req.user._id
  };
  const item = await CareNeedItem.create(doc);
  res.status(201).json(item);
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