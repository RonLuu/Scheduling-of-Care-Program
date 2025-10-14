// budgetPlan.js
import { Router } from "express";
import BudgetPlan from "../models/BudgetPlan.js";
import CareTask from "../models/CareTask.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

// GET /api/budget-plans?personId=xxx&year=2024
router.get("/", requireAuth, async (req, res) => {
  try {
    const { personId, year } = req.query;

    if (!personId || !year) {
      return res.status(400).json({ error: "personId and year are required" });
    }

    // ✅ Build query to match user's org (including null)
    const query = {
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId || null,
    };

    const budgetPlan = await BudgetPlan.findOne(query);

    res.json({ budgetPlan });
  } catch (error) {
    console.error("Error loading budget plan:", error);
    res.status(500).json({ error: "Failed to load budget plan" });
  }
});

// POST /api/budget-plans - Create new budget plan
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      personId,
      year,
      yearlyBudget,
      categories,
      budgetPeriodStart,
      budgetPeriodEnd,
      deletedCategories,
    } = req.body;

    if (!personId || !year || yearlyBudget === undefined) {
      return res.status(400).json({
        error: "personId, year, and yearlyBudget are required",
      });
    }

    // ✅ Check if budget plan already exists (matching org or null)
    const query = {
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId || null,
    };

    const existing = await BudgetPlan.findOne(query);

    if (existing) {
      return res.status(409).json({
        error: "Budget plan already exists for this person and year",
      });
    }

    const budgetPlan = new BudgetPlan({
      personId,
      organizationId: req.user.organizationId || null, // ✅ Allow null
      createdByUserId: req.user.id,
      year: parseInt(year),
      yearlyBudget: parseFloat(yearlyBudget),
      budgetPeriodStart: budgetPeriodStart || undefined,
      budgetPeriodEnd: budgetPeriodEnd || undefined,
      categories: categories || [],
      deletedCategories: deletedCategories || [],
      status: "Active",
    });

    await budgetPlan.save();

    res.status(201).json({ budgetPlan });
  } catch (error) {
    console.error("Error creating budget plan:", error);
    if (error.code === 11000) {
      res.status(409).json({
        error: "Budget plan already exists for this person and year",
      });
    } else {
      res.status(500).json({
        error: "Failed to create budget plan",
        details: error.message,
      });
    }
  }
});

// PUT /api/budget-plans - Update existing budget plan
router.put("/", requireAuth, async (req, res) => {
  try {
    const {
      personId,
      year,
      yearlyBudget,
      categories,
      budgetPeriodStart,
      budgetPeriodEnd,
      deletedCategories,
    } = req.body;

    if (!personId || !year) {
      return res.status(400).json({
        error: "personId and year are required",
      });
    }

    // ✅ Build query matching user's org (including null)
    const query = {
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId || null,
    };

    const budgetPlan = await BudgetPlan.findOneAndUpdate(
      query,
      {
        yearlyBudget:
          yearlyBudget !== undefined ? parseFloat(yearlyBudget) : undefined,
        categories: categories || undefined,
        deletedCategories:
          deletedCategories !== undefined ? deletedCategories : undefined,
        budgetPeriodStart: budgetPeriodStart || undefined,
        budgetPeriodEnd: budgetPeriodEnd || undefined,
        status: "Active",
      },
      {
        new: true,
        runValidators: true,
        omitUndefined: true,
      }
    );

    if (!budgetPlan) {
      return res.status(404).json({ error: "Budget plan not found" });
    }

    res.json({ budgetPlan });
  } catch (error) {
    console.error("Error updating budget plan:", error);
    res.status(500).json({ error: "Failed to update budget plan" });
  }
});

// DELETE /api/budget-plans?personId=xxx&year=2024
router.delete("/", requireAuth, async (req, res) => {
  try {
    const { personId, year } = req.query;

    if (!personId || !year) {
      return res.status(400).json({ error: "personId and year are required" });
    }

    // ✅ Build query matching user's org (including null)
    const query = {
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId || null,
    };

    const result = await BudgetPlan.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Budget plan not found" });
    }

    res.json({ message: "Budget plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget plan:", error);
    res.status(500).json({ error: "Failed to delete budget plan" });
  }
});

// GET /api/budget-plans/:personId/spending?year=2024
// Calculate actual spending, returns, and expected costs for incomplete tasks
router.get("/:personId/spending", requireAuth, async (req, res) => {
  try {
    const { personId } = req.params;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: "year is required" });
    }

    // Get date range for the year
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);

    // ✅ Build query matching user's org (including null)
    const taskQuery = {
      personId,
      organizationId: req.user.organizationId || null,
      cost: { $exists: true, $ne: null },
      budgetCategoryId: { $exists: true, $ne: null },
      budgetItemId: { $exists: true, $ne: null },
      dueDate: { $gte: startDate, $lte: endDate },
    };

    // Find all completed care tasks with budget tracking
    const completedTasks = await CareTask.find({
      ...taskQuery,
      status: "Completed",
    });

    // Find all returned care tasks with budget tracking
    const returnedTasks = await CareTask.find({
      ...taskQuery,
      status: "Returned",
      cost: { $exists: true, $ne: null },
      budgetCategoryId: { $exists: true, $ne: null },
      budgetItemId: { $exists: true, $ne: null },
      dueDate: { $gte: startDate, $lte: endDate },
    });

    // Find all incomplete tasks with expectedCost for this person and year
    const incompleteTasks = await CareTask.find({
      personId,
      organizationId: req.user.organizationId,
      status: { $in: ["Scheduled", "Missed", "Skipped"] },
      expectedCost: { $exists: true, $ne: null },
      budgetCategoryId: { $exists: true, $ne: null },
      budgetItemId: { $exists: true, $ne: null },
      dueDate: { $gte: startDate, $lte: endDate },
    });

    // Aggregate spending by category and item for completed tasks
    const spending = {};
    for (const task of completedTasks) {
      const categoryId = task.budgetCategoryId;
      const itemId = task.budgetItemId.toString();
      const cost = task.cost || 0;

      if (!spending[categoryId]) {
        spending[categoryId] = { items: {} };
      }

      if (!spending[categoryId].items[itemId]) {
        spending[categoryId].items[itemId] = 0;
      }

      spending[categoryId].items[itemId] += cost;
    }

    // Aggregate returned amounts by category and item
    const returned = {};
    for (const task of returnedTasks) {
      const categoryId = task.budgetCategoryId;
      const itemId = task.budgetItemId.toString();
      const cost = task.cost || 0;

      if (!returned[categoryId]) {
        returned[categoryId] = { items: {} };
      }

      if (!returned[categoryId].items[itemId]) {
        returned[categoryId].items[itemId] = 0;
      }

      returned[categoryId].items[itemId] += cost;

      // Also add to spending if not already there
      if (!spending[categoryId]) {
        spending[categoryId] = { items: {} };
      }
      if (!spending[categoryId].items[itemId]) {
        spending[categoryId].items[itemId] = 0;
      }
      spending[categoryId].items[itemId] += cost;
    }

    // Aggregate expected costs for incomplete tasks
    const expected = {};
    for (const task of incompleteTasks) {
      const categoryId = task.budgetCategoryId;
      const itemId = task.budgetItemId.toString();
      const expectedCost = task.expectedCost || 0;

      if (!expected[categoryId]) {
        expected[categoryId] = { items: {} };
      }

      if (!expected[categoryId].items[itemId]) {
        expected[categoryId].items[itemId] = 0;
      }

      expected[categoryId].items[itemId] += expectedCost;
    }

    res.json({ spending, returned, expected });
  } catch (error) {
    console.error("Error calculating spending:", error);
    res.status(500).json({ error: "Failed to calculate spending" });
  }
});

export default router;
