import { Router } from "express";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import PersonUserLink from "../models/PersonUserLink.js";
import FileUpload from "../models/FileUpload.js";
import Comment from "../models/Comment.js";
import { deleteUploadBlob } from "../utils/deleteUploadBlob.js";

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
  try {
    const existing = await CareTask.findById(req.params.taskId);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const perm = await ensureCanManagePerson(req.user, existing.personId);
    if (!perm.ok) return res.status(403).json({ error: perm.code });

    const taskId = existing._id;

    // 1) Delete comments for this task
    await Comment.deleteMany({ careTaskId: taskId });

    // 2) Delete file uploads attached to this task (DB + blob)
    const files = await FileUpload.find({
      scope: "CareTask",
      targetId: taskId,
    }).lean();

    // unlink blobs (best effort)
    await Promise.all(files.map((f) => deleteUploadBlob(f.urlOrPath)));

    // delete docs
    if (files.length) {
      await FileUpload.deleteMany({ _id: { $in: files.map((f) => f._id) } });
    }

    // 3) Delete the task itself
    await CareTask.deleteOne({ _id: taskId });

    res.json({ ok: true, deletedTaskId: String(taskId) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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

// NEW: Get tasks for a specific client
router.get("/client/:personId", requireAuth, async (req, res) => {
  try {
    const { personId } = req.params;

    // Check if user has access to this person
    const perm = await ensureCanManagePerson(req.user, personId);
    if (!perm.ok) {
      // If not manager, check if they're a staff member with access
      const link = await PersonUserLink.findOne({
        userId: req.user.id,
        personId,
        active: true,
      }).lean();

      if (!link && req.user.role !== "Admin") {
        return res.status(403).json({ error: "NOT_AUTHORIZED" });
      }
    }

    const tasks = await CareTask.find({ personId })
      .populate("assignedToUserId", "name email role")
      .populate("completedByUserId", "name email role")
      .sort({ dueDate: 1 })
      .lean();

    res.json(tasks);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// NEW: Create standalone task (not linked to careNeedItem)
router.post(
  "/standalone",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  async (req, res) => {
    try {
      const {
        personId,
        title,
        dueDate,
        scheduleType,
        startAt,
        endAt,
        assignedToUserId,
        isRecurring,
        recurrencePattern,
        recurrenceInterval,
        recurrenceEndDate,
      } = req.body;

      // Validate access
      const perm = await ensureCanManagePerson(req.user, personId);
      if (!perm.ok) return res.status(403).json({ error: perm.code });

      // Validate assignee (if provided)
      if (assignedToUserId) {
        const u = await User.findById(assignedToUserId);
        if (!u || String(u.organizationId) !== String(perm.person.organizationId)) {
          return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
        }
      }

      // Create a dummy CareNeedItem for standalone tasks
      // This is a temporary solution until we modify the schema
      const dummyItem = await CareNeedItem.create({
        personId,
        organizationId: perm.person.organizationId,
        name: title,
        category: "Standalone Task", // Required field
        frequency: {
          intervalType: "OneTime", // Required field
          intervalValue: 1,
        },
        scheduleType: scheduleType || "AllDay",
        status: "Active",
        isStandalone: true, // Custom flag to identify standalone items
      });

      const tasksToCreate = [];

      // Helper function to combine date and time
      const combineDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return undefined;
        const date = new Date(dateStr);
        const [hours, minutes] = timeStr.split(':');
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date;
      };

      if (isRecurring && recurrencePattern) {
        // Generate recurring tasks
        const startDate = new Date(dueDate);
        const endDate = recurrenceEndDate ? new Date(recurrenceEndDate) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        let currentDate = new Date(startDate);
        let count = 0;
        const maxTasks = 365; // Limit to prevent infinite loops

        while (currentDate <= endDate && count < maxTasks) {
          const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

          const taskDoc = {
            personId,
            organizationId: perm.person.organizationId,
            careNeedItemId: dummyItem._id,
            title,
            dueDate: new Date(currentDate),
            scheduleType: scheduleType || "AllDay",
            status: "Scheduled",
            assignedToUserId: assignedToUserId || undefined,
          };

          // Only add time fields if it's a timed task
          if (scheduleType === "Timed") {
            if (startAt) taskDoc.startAt = combineDateTime(currentDateStr, startAt);
            if (endAt) taskDoc.endAt = combineDateTime(currentDateStr, endAt);
          }

          tasksToCreate.push(taskDoc);

          // Increment date based on pattern
          if (recurrencePattern === "daily") {
            currentDate.setDate(currentDate.getDate() + (recurrenceInterval || 1));
          } else if (recurrencePattern === "weekly") {
            currentDate.setDate(currentDate.getDate() + (7 * (recurrenceInterval || 1)));
          } else if (recurrencePattern === "monthly") {
            currentDate.setMonth(currentDate.getMonth() + (recurrenceInterval || 1));
          }

          count++;
        }
      } else {
        // Single task
        const taskDoc = {
          personId,
          organizationId: perm.person.organizationId,
          careNeedItemId: dummyItem._id,
          title,
          dueDate: new Date(dueDate),
          scheduleType: scheduleType || "AllDay",
          status: "Scheduled",
          assignedToUserId: assignedToUserId || undefined,
        };

        // Only add time fields if it's a timed task
        if (scheduleType === "Timed") {
          if (startAt) taskDoc.startAt = combineDateTime(dueDate, startAt);
          if (endAt) taskDoc.endAt = combineDateTime(dueDate, endAt);
        }

        tasksToCreate.push(taskDoc);
      }

      const createdTasks = await CareTask.insertMany(tasksToCreate);

      res.status(201).json({
        success: true,
        tasksCreated: createdTasks.length,
        tasks: createdTasks,
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// NEW: Update task cost
router.patch("/:taskId/cost", requireAuth, async (req, res) => {
  try {
    const task = await CareTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: "NOT_FOUND" });

    const perm = await canManageTask(req.user, task);
    if (!perm.ok) return res.status(403).json({ error: perm.code });

    const { cost } = req.body;
    const numCost = Number(cost);

    if (Number.isNaN(numCost) || numCost < 0) {
      return res.status(400).json({ error: "INVALID_COST" });
    }

    // Allow cost update for completed tasks
    if (task.status !== "Completed") {
      return res.status(400).json({ error: "TASK_MUST_BE_COMPLETED" });
    }

    task.cost = numCost;
    await task.save();

    const updated = await CareTask.findById(task._id)
      .populate("assignedToUserId", "name email role")
      .populate("completedByUserId", "name email role");

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
