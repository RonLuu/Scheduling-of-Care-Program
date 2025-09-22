import { Router } from "express";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import PersonUserLink from "../models/PersonUserLink.js";
import {
  requireAuth,
  requireRole,
  ensureCanManagePerson,
  ensureCanWorkOnTask,
} from "../middleware/authz.js";

const router = Router();

router.get("/", requireAuth, listTasks);

// Only Admin/Family/PoA can create/update/delete tasks
router.post(
  "/",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  createTask
);
router.get("/:taskId", requireAuth, getTask);
router.put(
  "/:taskId",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  updateTask
);
router.delete(
  "/:taskId",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  deleteTask
);

// Anyone who can work on the task (incl. GeneralCareStaff) can mark complete
router.patch("/:taskId", requireAuth, completeTask);
router.post("/sweep-overdue", requireAuth, sweepOverdue);

async function listTasks(req, res) {
  const { personId, organizationId, assignedToUserId, status } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (organizationId) filter.organizationId = organizationId;
  if (assignedToUserId) filter.assignedToUserId = assignedToUserId;
  if (status) filter.status = status;

  const tasks = await CareTask.find(filter)
    .populate("assignedToUserId", "name email role")
    .populate("completedByUserId", "name email role")
    .lean();
  res.json(tasks);
}

async function createTask(req, res) {
  const { personId, careNeedItemId, assignedToUserId } = req.body;

  const perm = await ensureCanManagePerson(req.user, personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  // Validate item and org alignment
  const item = await CareNeedItem.findById(careNeedItemId);
  if (!item) return res.status(400).json({ error: "INVALID_CARE_NEED_ITEM" });
  if (
    String(item.personId) !== String(personId) ||
    String(item.organizationId) !== String(perm.person.organizationId)
  ) {
    return res.status(400).json({ error: "ITEM_PERSON_OR_ORG_MISMATCH" });
  }

  // Validate assignee (if provided)
  if (assignedToUserId) {
    const u = await User.findById(assignedToUserId);
    if (!u || String(u.organizationId) !== String(perm.person.organizationId)) {
      return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
    }
  }

  const doc = {
    ...req.body,
    organizationId: perm.person.organizationId,
    title: req.body.title || item.name,
  };
  const task = await CareTask.create(doc);
  res.status(201).json(task);
}

async function getTask(req, res) {
  const task = await CareTask.findById(req.params.taskId).lean();
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
}

async function updateTask(req, res) {
  const existing = await CareTask.findById(req.params.taskId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const perm = await ensureCanManagePerson(req.user, existing.personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  const patch = { ...req.body };
  const personId = patch.personId || existing.personId;
  const itemId = patch.careNeedItemId || existing.careNeedItemId;

  const person = await Person.findById(personId);
  if (!person) return res.status(400).json({ error: "INVALID_PERSON" });

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(400).json({ error: "INVALID_CARE_NEED_ITEM" });
  if (
    String(item.personId) !== String(personId) ||
    String(item.organizationId) !== String(person.organizationId)
  ) {
    return res.status(400).json({ error: "ITEM_PERSON_OR_ORG_MISMATCH" });
  }

  if (patch.assignedToUserId) {
    const u = await User.findById(patch.assignedToUserId);
    if (!u || String(u.organizationId) !== String(person.organizationId)) {
      return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
    }
  }

  patch.organizationId = person.organizationId;
  if (!patch.title && String(existing.careNeedItemId) !== String(itemId)) {
    patch.title = item.name;
  }

  const updated = await CareTask.findByIdAndUpdate(req.params.taskId, patch, {
    new: true,
    runValidators: true,
  });
  res.json(updated);
}

async function deleteTask(req, res) {
  const existing = await CareTask.findById(req.params.taskId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const perm = await ensureCanManagePerson(req.user, existing.personId);
  if (!perm.ok) return res.status(403).json({ error: perm.code });

  await CareTask.deleteOne({ _id: req.params.taskId });
  res.json({ message: "Task deleted" });
}

// Helper: ensure user can manage this task (same org + linked where applicable)
async function canManageTask(user, task) {
  if (!task) return { ok: false, code: "TASK_NOT_FOUND" };
  if (String(task.organizationId) !== String(user.organizationId)) {
    return { ok: false, code: "ORG_SCOPE_INVALID" };
  }
  if (user.role === "Admin") return { ok: true };
  // Family/PoA/Staff must be linked to the person
  const link = await PersonUserLink.findOne({
    userId: user.id,
    personId: task.personId,
    active: true,
  }).lean();
  if (!link) return { ok: false, code: "NOT_LINKED" };
  return { ok: true };
}

async function completeTask(req, res) {
  try {
    const task = await CareTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: "NOT_FOUND" });

    const perm = await canManageTask(req.user, task);
    if (!perm.ok) return res.status(403).json({ error: perm.code });

    const patch = {};
    let nextStatus = task.status;
    if (req.body.status) {
      const allowed = [
        "Scheduled",
        "Completed",
        "Missed",
        "Skipped",
        "Cancelled",
      ];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({ error: "INVALID_STATUS" });
      }
      patch.status = req.body.status;
      if (req.body.status === "Completed") {
        patch.completedAt = req.body.completedAt
          ? new Date(req.body.completedAt)
          : new Date();
        patch.completedByUserId = req.user.id;
      } else {
        patch.completedAt = null;
        patch.completedByUserId = null;
      }
    }
    // cost update (only when completed)
    if (req.body.cost !== undefined) {
      const n = Number(req.body.cost);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ error: "INVALID_COST" });
      }
      // allow if task is already Completed OR we're also marking it Completed in this request
      const willBeCompleted = nextStatus === "Completed";
      if (!willBeCompleted) {
        return res
          .status(400)
          .json({ error: "COST_ONLY_ALLOWED_WHEN_COMPLETED" });
      }
      patch.cost = n;
    }
    // (Optional) allow reassignment by Admin
    if (req.body.assignedToUserId && req.user.role === "Admin") {
      patch.assignedToUserId = req.body.assignedToUserId;
    }

    if (patch.status === "Scheduled") {
      const now = new Date();
      if (task.dueDate && new Date(task.dueDate) < now) {
        patch.status = "Missed";
      }
    }

    const updated = await CareTask.findByIdAndUpdate(task._id, patch, {
      new: true,
      runValidators: true,
    })
      .populate("assignedToUserId", "name email role")
      .populate("completedByUserId", "name email role");

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function sweepOverdue(req, res) {
  try {
    const now = new Date();

    let filter = {
      organizationId: req.user.organizationId,
      status: "Scheduled",
      dueDate: { $lt: now },
    };

    // // Restrict scope for Staff to only their linked persons
    // if (req.user.role === "GeneralCareStaff") {
    //   const links = await PersonUserLink.find({ userId: req.user.id, active: true }).select("personId");
    //   const ids = links.map(l => l.personId);
    //   filter.personId = { $in: ids.length ? ids : [null] }; // none if empty
    // }

    const result = await CareTask.updateMany(filter, {
      $set: { status: "Missed" },
    });
    res.json({ updated: result.modifiedCount || 0 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

export default router;
