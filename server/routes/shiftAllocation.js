import { Router } from "express";
import ShiftAllocation from "../models/ShiftAllocation.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import PersonUserLink from "../models/PersonUserLink.js";
import User from "../models/User.js";
import {
  requireAuth,
  requireRole,
  ensureCanManagePerson,
} from "../middleware/authz.js";

const router = Router();

/**
 * GET /api/shift-allocations?personId=...&from=2025-01-01&to=2025-01-31
 * Anyone linked to the person (or Admin in org) can view.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { personId, from, to } = req.query;
    if (!personId) return res.status(400).json({ error: "MISSING_PERSON_ID" });

    const person = await PersonWithNeeds.findById(personId).lean();
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    // If not Admin, must be linked
    if (req.user.role !== "Admin") {
      const link = await PersonUserLink.findOne({
        personId,
        userId: req.user.id,
        active: true,
      }).lean();
      if (!link) return res.status(403).json({ error: "NOT_LINKED" });
    }

    const filter = { personId, organizationId: person.organizationId };
    if (from || to) {
      filter.$and = [];
      if (from) filter.$and.push({ end: { $gte: new Date(from) } });
      if (to) filter.$and.push({ start: { $lte: new Date(to) } });
      if (!filter.$and.length) delete filter.$and;
    }

    const shifts = await ShiftAllocation.find(filter)
      .populate("staffUserId", "name email role")
      .lean();

    res.json(
      shifts.map((s) => ({
        ...s,
        staff: s.staffUserId
          ? {
              id: s.staffUserId._id,
              name: s.staffUserId.name,
              email: s.staffUserId.email,
            }
          : null,
        shiftType: s.shiftType || "custom", // Include shift type
      }))
    );
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/shift-allocations
 * Admin only. body: { personId, staffUserId, start, end, notes, shiftType }
 */
router.post("/", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { personId, staffUserId, start, end, notes, shiftType } = req.body;
    if (!personId || !staffUserId || !start || !end) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const person = await PersonWithNeeds.findById(personId).lean();
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const staff = await User.findById(staffUserId).lean();
    if (!staff) return res.status(400).json({ error: "STAFF_NOT_FOUND" });
    if (String(staff.organizationId) !== String(person.organizationId)) {
      return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
    }

    // Ensure staff is linked to this person
    const link = await PersonUserLink.findOne({
      personId,
      userId: staffUserId,
      active: true,
    }).lean();
    if (
      !link ||
      (link.relationshipType !== "GeneralCareStaff" &&
        link.relationshipType !== "Admin")
    ) {
      return res.status(400).json({ error: "STAFF_NOT_LINKED_TO_PERSON" });
    }

    // Validate shift type
    const validShiftTypes = ["morning", "afternoon", "evening", "custom"];
    const finalShiftType = validShiftTypes.includes(shiftType)
      ? shiftType
      : "custom";

    const doc = await ShiftAllocation.create({
      organizationId: person.organizationId,
      personId,
      staffUserId,
      allDay: false, // Always false now
      start: new Date(start),
      end: new Date(end),
      notes: notes || "",
      shiftType: finalShiftType,
      createdByUserId: req.user.id,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * PUT /api/shift-allocations/:id  (Admin only)
 */
router.put("/:id", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const cur = await ShiftAllocation.findById(req.params.id);
    if (!cur) return res.status(404).json({ error: "NOT_FOUND" });
    if (String(cur.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const patch = { ...req.body };

    if (patch.staffUserId) {
      const u = await User.findById(patch.staffUserId).lean();
      if (!u || String(u.organizationId) !== String(cur.organizationId)) {
        return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
      }
      // Ensure new staff is linked to the same person
      const link = await PersonUserLink.findOne({
        personId: cur.personId,
        userId: patch.staffUserId,
        active: true,
      }).lean();
      if (
        !link ||
        (link.relationshipType !== "GeneralCareStaff" &&
          link.relationshipType !== "Admin")
      ) {
        return res.status(400).json({ error: "STAFF_NOT_LINKED_TO_PERSON" });
      }
    }

    // Validate shift type if provided
    if (patch.shiftType) {
      const validShiftTypes = ["morning", "afternoon", "evening", "custom"];
      if (!validShiftTypes.includes(patch.shiftType)) {
        patch.shiftType = "custom";
      }
    }

    const updated = await ShiftAllocation.findByIdAndUpdate(
      cur._id,
      {
        ...(patch.allDay !== undefined ? { allDay: false } : {}), // Always false
        ...(patch.start ? { start: new Date(patch.start) } : {}),
        ...(patch.end ? { end: new Date(patch.end) } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.staffUserId ? { staffUserId: patch.staffUserId } : {}),
        ...(patch.shiftType ? { shiftType: patch.shiftType } : {}),
      },
      { new: true, runValidators: true }
    ).populate("staffUserId", "name email role");

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * DELETE /api/shift-allocations/:id  (Admin only)
 */
router.delete("/:id", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const cur = await ShiftAllocation.findById(req.params.id);
    if (!cur) return res.status(404).json({ error: "NOT_FOUND" });
    if (String(cur.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }
    await ShiftAllocation.deleteOne({ _id: cur._id });
    res.json({ ok: true, deletedId: cur._id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/shift-allocations/stats
 * Get shift statistics for reporting (Admin only)
 */
router.get("/stats", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { from, to, personId, staffUserId } = req.query;

    const filter = { organizationId: req.user.organizationId };
    if (personId) filter.personId = personId;
    if (staffUserId) filter.staffUserId = staffUserId;

    if (from || to) {
      filter.$and = [];
      if (from) filter.$and.push({ end: { $gte: new Date(from) } });
      if (to) filter.$and.push({ start: { $lte: new Date(to) } });
      if (!filter.$and.length) delete filter.$and;
    }

    const shifts = await ShiftAllocation.find(filter).lean();

    // Calculate statistics
    const stats = {
      totalShifts: shifts.length,
      byType: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        custom: 0,
      },
      totalHours: 0,
      averageShiftLength: 0,
    };

    shifts.forEach((shift) => {
      stats.byType[shift.shiftType || "custom"]++;
      const hours =
        (new Date(shift.end) - new Date(shift.start)) / (1000 * 60 * 60);
      stats.totalHours += hours;
    });

    if (shifts.length > 0) {
      stats.averageShiftLength = stats.totalHours / shifts.length;
    }

    res.json(stats);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
