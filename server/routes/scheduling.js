import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import CareTask from "../models/CareTask.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import { expandOccurrences } from "../utils/schedule.js";
import { requireAuth, requireRole, ensureCanManagePerson } from "../middleware/authz.js";

const router = Router();

/**
 * POST /care-need-items/:itemId/generate-tasks?from=2025-01-01&to=2025-12-31
 * Body (optional): { assignToUserId? }
 * Creates (or upserts) CareTasks for the date window based on the item's frequency.
 */
router.post("/care-need-items/:itemId/generate-tasks",
  requireAuth, requireRole("Admin","Family","PoA"), generateTasksForItem
);

async function generateTasksForItem(req, res) {
  const { itemId } = req.params;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to   = req.query.to   ? new Date(req.query.to)   : null;
  const { assignToUserId } = req.body || {};

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

  const person = await Person.findById(item.personId);
  if (!person) return res.status(400).json({ error: "INVALID_PERSON" });

  // Permission: caller must manage this person
  const perm = await ensureCanManagePerson(req.user, person._id);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  // Validate optional assignee is in the same org
  let assigneeUserId = null;
  if (assignToUserId) {
    const u = await User.findById(assignToUserId);
    if (!u || String(u.organizationId) !== String(person.organizationId)) {
      return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
    }
    assigneeUserId = u._id;
  }

  // Expand dates
  const dates = expandOccurrences(
    {
      intervalType: item.frequency.intervalType,
      intervalValue: item.frequency.intervalValue,
      startDate: item.frequency.startDate,
      endDate: item.frequency.endDate,
      occurrenceCount: item.frequency.occurrenceCount
    },
    from, to
  );

  // Upsert tasks (idempotent via unique index)
  const ops = dates.map(dueDate => ({
    updateOne: {
      filter: { careNeedItemId: item._id, dueDate },
      update: {
        $setOnInsert: {
          personId: person._id,
          organizationId: person.organizationId,
          careNeedItemId: item._id,
          title: item.name,
          dueDate,
          status: "Scheduled",
          assignedToUserId: assigneeUserId || undefined
        }
      },
      upsert: true
    }
  }));

  if (ops.length === 0) return res.json({ created: 0, upserts: 0, message: "No dates in window" });

  try {
    const result = await CareTask.bulkWrite(ops, { ordered: false });
    const upserts = result?.upsertedCount || 0;
    res.json({ upserts, window: { from, to }, itemId: item._id });
  } catch (e) {
    // Unique index collisions are fine when re-running; bulkWrite handles them unless other errors occur
    res.status(500).json({ error: e.message });
  }
}

export default router;