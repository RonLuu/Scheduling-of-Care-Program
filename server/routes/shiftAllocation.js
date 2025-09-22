import { Router } from "express";
import ShiftAllocation from "../models/ShiftAllocation.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

// List shifts for a person (client)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { personId, start, end } = req.query;
    if (!personId) return res.status(400).json({ error: "MISSING_PERSON_ID" });

    const person = await PersonWithNeeds.findById(personId).select(
      "organizationId"
    );
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const filter = { personId };
    if (start && end) {
      filter.start = { $lt: new Date(end) };
      filter.end = { $gt: new Date(start) };
    }

    const shifts = await ShiftAllocation.find(filter)
      .populate("staffUserId", "name email role")
      .lean();

    res.json(shifts);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin only: create shift
router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "ONLY_ADMIN_CAN_ALLOCATE" });
    }

    const { personId, staffUserId, start, end, notes } = req.body;
    if (!personId || !staffUserId || !start || !end) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const person = await PersonWithNeeds.findById(personId);
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const shift = await ShiftAllocation.create({
      personId,
      staffUserId,
      organizationId: person.organizationId,
      start: new Date(start),
      end: new Date(end),
      notes,
    });

    res.status(201).json(shift);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin only: delete shift
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "ONLY_ADMIN_CAN_DELETE" });
    }
    await ShiftAllocation.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
