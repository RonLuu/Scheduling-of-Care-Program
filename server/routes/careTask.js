// careTask.js
import { Router } from "express";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import PersonUserLink from "../models/PersonUserLink.js";
import BudgetPlan from "../models/BudgetPlan.js";
import FileUpload from "../models/FileUpload.js";
import Comment from "../models/Comment.js";
import { deleteUploadBlob } from "../utils/deleteUploadBlob.js";
import { checkBudgetAndNotify } from "../services/budgetMonitor.js";

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

  // Only validate careNeedItem if it exists (for non-standalone tasks)
  if (itemId) {
    const item = await CareNeedItem.findById(itemId);
    if (!item) return res.status(400).json({ error: "INVALID_CARE_NEED_ITEM" });
    if (
      String(item.personId) !== String(personId) ||
      String(item.organizationId) !== String(person.organizationId)
    ) {
      return res.status(400).json({ error: "ITEM_PERSON_OR_ORG_MISMATCH" });
    }
  }

  if (patch.assignedToUserId) {
    const u = await User.findById(patch.assignedToUserId);
    if (!u || String(u.organizationId) !== String(person.organizationId)) {
      return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
    }
  }

  patch.organizationId = person.organizationId;
  // Only update title from item if we have an item and are changing the item ID
  if (!patch.title && itemId && String(existing.careNeedItemId) !== String(itemId)) {
    const item = await CareNeedItem.findById(itemId);
    if (item) {
      patch.title = item.name;
    }
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
        "Returned",
      ];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({ error: "INVALID_STATUS" });
      }
      patch.status = req.body.status;
      nextStatus = req.body.status; // Update nextStatus when status is changed
      if (req.body.status === "Completed") {
        patch.completedAt = req.body.completedAt
          ? new Date(req.body.completedAt)
          : new Date();
        patch.completedByUserId = req.user.id;
      } else if (req.body.status !== "Returned") {
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

    // Check budget and send notifications if task was completed with a cost
    if (patch.status === "Completed" && patch.cost !== undefined && patch.cost > 0) {
      // Run budget check asynchronously to avoid blocking the response
      setImmediate(async () => {
        try {
          const currentYear = new Date().getFullYear();
          console.log('[Budget Check] Task completed with cost, checking budget for personId:', updated.personId);
          console.log('[Budget Check] Task details:', {
            taskId: updated._id,
            title: updated.title,
            personId: updated.personId,
            cost: updated.cost
          });
          await checkBudgetAndNotify(updated.personId, currentYear);
        } catch (error) {
          console.error('Error checking budget after task completion:', error);
        }
      });
    }

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

async function getOrCreatePlan({ personId, orgId, year, userId }) {
  let plan = await BudgetPlan.findOne({
    personId,
    organizationId: orgId,
    year,
  });
  if (!plan) {
    plan = await BudgetPlan.create({
      personId,
      organizationId: orgId,
      createdByUserId: userId,
      year,
      yearlyBudget: 0,
      categories: [],
      deletedCategories: [],
      status: "Active",
    });
  }
  return plan;
}

function findCategoryByIdOrName(plan, { id, name }) {
  if (!plan?.categories) return null;
  let cat = plan.categories.find((c) => c.id === id);
  if (!cat && name) {
    cat = plan.categories.find(
      (c) =>
        (c.name || "").trim().toLowerCase() ===
        (name || "").trim().toLowerCase()
    );
  }
  return cat || null;
}

function upsertCategory(plan, sourceCategory) {
  let cat = findCategoryByIdOrName(plan, {
    id: sourceCategory.id,
    name: sourceCategory.name,
  });

  if (!cat) {
    // Push the new category
    plan.categories.push({
      id: sourceCategory.id,
      name: sourceCategory.name,
      emoji: sourceCategory.emoji || "📋",
      description: sourceCategory.description || "",
      isCustom: !!sourceCategory.isCustom,
      items: [],
      budget: 0,
    });

    // CRITICAL FIX: Get reference to the actual Mongoose subdocument
    // that was just added, not the plain object we pushed
    cat = plan.categories.find((c) => c.id === sourceCategory.id);

    if (!cat) {
      throw new Error(`Failed to create category: ${sourceCategory.name}`);
    }
  } else {
    // Update existing category metadata (but preserve items and budget)
    cat.name = sourceCategory.name;
    cat.emoji = sourceCategory.emoji || cat.emoji || "📋";
    cat.description = sourceCategory.description || cat.description || "";
    cat.isCustom = !!sourceCategory.isCustom;
  }

  return cat;
}

function upsertItemByName(cat, sourceItem) {
  if (!cat || !sourceItem) {
    throw new Error("Category and sourceItem are required");
  }

  const nm = (sourceItem.name || "").trim().toLowerCase();
  let item = (cat.items || []).find(
    (it) => (it.name || "").trim().toLowerCase() === nm
  );

  if (!item) {
    // Create new item with source values
    cat.items.push({
      name: sourceItem.name,
      description: sourceItem.description || "",
      budget: Number(sourceItem.budget) || 0,
    });

    // Get reference to the newly added item subdocument
    item = cat.items[cat.items.length - 1];

    // Recalculate category budget
    cat.budget = cat.items.reduce(
      (sum, it) => sum + (Number(it.budget) || 0),
      0
    );
  }
  // If item exists, leave its budget/description unchanged

  return item;
}

function addInterval(date, pattern, interval) {
  const step = Math.max(1, Number(interval) || 1);
  const d = new Date(date);
  if (pattern === "daily") d.setDate(d.getDate() + step);
  else if (pattern === "weekly") d.setDate(d.getDate() + 7 * step);
  else if (pattern === "monthly") d.setMonth(d.getMonth() + step);
  else d.setDate(d.getDate() + step);
  return d;
}

async function ensureLinkForDate(
  jsDate,
  personId,
  orgId,
  userId,
  sourceCategory,
  sourceItem
) {
  const yr = jsDate.getFullYear();

  const plan = await getOrCreatePlan({
    personId,
    orgId,
    year: yr,
    userId,
  });

  // Upsert category and item in the plan
  const cat = upsertCategory(plan, sourceCategory);
  const item = upsertItemByName(cat, sourceItem);

  // Mark as modified and save
  plan.markModified("categories");
  await plan.save();

  // After save, the subdocuments should have their IDs
  // Reload to ensure we have fresh data with all IDs
  const freshPlan = await BudgetPlan.findById(plan._id);
  const freshCat = freshPlan.categories.find((c) => c.id === sourceCategory.id);

  if (!freshCat) {
    throw new Error(
      `Category ${sourceCategory.name} not found after save for year ${yr}`
    );
  }

  const freshItem = freshCat.items.find(
    (it) =>
      (it.name || "").trim().toLowerCase() ===
      (sourceItem.name || "").trim().toLowerCase()
  );

  if (!freshItem || !freshItem._id) {
    throw new Error(
      `Item ${sourceItem.name} not found or missing ID after save for year ${yr}`
    );
  }

  return {
    budgetCategoryId: freshCat.id,
    budgetItemId: freshItem._id,
  };
}

// Create standalone task (not linked to careNeedItem)
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
        budgetCategoryId,
        budgetItemId,
        expectedCost,
      } = req.body;

      // Validate access
      const perm = await ensureCanManagePerson(req.user, personId);
      if (!perm.ok) return res.status(403).json({ error: perm.code });

      // Validate assignee
      if (assignedToUserId) {
        const u = await User.findById(assignedToUserId);
        if (
          !u ||
          String(u.organizationId) !== String(perm.person.organizationId)
        ) {
          return res.status(400).json({ error: "ASSIGNEE_ORG_MISMATCH" });
        }
      }

      // Get source budget plan and validate category/item
      if (!budgetCategoryId || !budgetItemId) {
        return res.status(400).json({ error: "MISSING_BUDGET_LINK" });
      }

      const start = new Date(dueDate);
      const sourceYear = start.getFullYear();

      const sourcePlan = await BudgetPlan.findOne({
        personId,
        organizationId: perm.person.organizationId,
        year: sourceYear,
      }).lean();

      if (!sourcePlan) {
        return res.status(400).json({
          error: `Budget plan not found for year ${sourceYear}. Please create a budget plan for ${sourceYear} first.`,
        });
      }

      const sourceCategory = (sourcePlan.categories || []).find(
        (c) => c.id === budgetCategoryId
      );
      if (!sourceCategory) {
        return res.status(400).json({ error: "SOURCE_CATEGORY_NOT_FOUND" });
      }

      const sourceItem = (sourceCategory.items || []).find(
        (it) => String(it._id) === String(budgetItemId)
      );
      if (!sourceItem) {
        return res.status(400).json({ error: "SOURCE_ITEM_NOT_FOUND" });
      }

      const tasksToCreate = [];

      // Helper to combine date and time
      const combineDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return undefined;
        const date = new Date(dateStr);
        const [hours, minutes] = timeStr.split(":");
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date;
      };

      // Create tasks
      if (isRecurring && recurrencePattern) {
        const endDate = recurrenceEndDate
          ? new Date(recurrenceEndDate)
          : addInterval(
              start,
              recurrencePattern,
              Math.max(1, recurrenceInterval || 1) * 9999
            );

        let currentDate = new Date(start);
        let count = 0;
        const maxTasks = 10000;
        const yearsProcessed = new Set();

        while (currentDate <= endDate && count < maxTasks) {
          const currentDateStr = currentDate.toISOString().split("T")[0];
          const currentYear = currentDate.getFullYear();

          try {
            // Track which years we're creating tasks for
            yearsProcessed.add(currentYear);

            const link = await ensureLinkForDate(
              currentDate,
              personId,
              perm.person.organizationId,
              req.user.id,
              sourceCategory,
              sourceItem
            );

            const taskDoc = {
              personId,
              organizationId: perm.person.organizationId,
              title,
              dueDate: new Date(currentDate),
              scheduleType: scheduleType || "AllDay",
              status: "Scheduled",
              assignedToUserId: assignedToUserId || undefined,
              budgetCategoryId: link.budgetCategoryId,
              budgetItemId: link.budgetItemId,
            };

            if (scheduleType === "Timed") {
              if (startAt)
                taskDoc.startAt = combineDateTime(currentDateStr, startAt);
              if (endAt) taskDoc.endAt = combineDateTime(currentDateStr, endAt);
            }

            if (expectedCost !== undefined) {
              taskDoc.expectedCost = Number(expectedCost);
            }

            tasksToCreate.push(taskDoc);
          } catch (err) {
            console.error(
              `[care-tasks] Error creating budget link for ${currentDateStr}:`,
              err.message
            );
            // Continue with next date instead of failing completely
          }

          currentDate = addInterval(
            currentDate,
            recurrencePattern,
            recurrenceInterval || 1
          );
          count++;
        }

        if (tasksToCreate.length === 0) {
          return res.status(400).json({
            error:
              "Failed to create any tasks. Check budget plans exist for all years.",
          });
        }

        const createdTasks = await CareTask.insertMany(tasksToCreate);
        const yearsAffected = Array.from(yearsProcessed).sort().join(", ");

        res.status(201).json({
          success: true,
          tasksCreated: createdTasks.length,
          tasks: createdTasks,
          message: `Created ${createdTasks.length} recurring task(s) across years: ${yearsAffected}`,
        });
      } else {
        // Single task
        const link = await ensureLinkForDate(
          new Date(dueDate),
          personId,
          perm.person.organizationId,
          req.user.id,
          sourceCategory,
          sourceItem
        );

        const taskDoc = {
          personId,
          organizationId: perm.person.organizationId,
          title,
          dueDate: new Date(dueDate),
          scheduleType: scheduleType || "AllDay",
          status: "Scheduled",
          assignedToUserId: assignedToUserId || undefined,
          budgetCategoryId: link.budgetCategoryId,
          budgetItemId: link.budgetItemId,
        };

        if (scheduleType === "Timed") {
          if (startAt) taskDoc.startAt = combineDateTime(dueDate, startAt);
          if (endAt) taskDoc.endAt = combineDateTime(dueDate, endAt);
        }

        if (expectedCost !== undefined) {
          taskDoc.expectedCost = Number(expectedCost);
        }

        tasksToCreate.push(taskDoc);
        const createdTasks = await CareTask.insertMany(tasksToCreate);

        res.status(201).json({
          success: true,
          tasksCreated: 1,
          tasks: createdTasks,
          message: "Task created successfully",
        });
      }
    } catch (e) {
      console.error("standalone-create error:", e);
      res.status(400).json({
        error: e.message || "Failed to create task",
        details: process.env.NODE_ENV === "development" ? e.stack : undefined,
      });
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
