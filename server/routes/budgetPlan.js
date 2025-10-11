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

    const budgetPlan = await BudgetPlan.findOne({
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId,
    });

    res.json({ budgetPlan });
  } catch (error) {
    console.error("Error loading budget plan:", error);
    res.status(500).json({ error: "Failed to load budget plan" });
  }
});

// POST /api/budget-plans - Create new budget plan
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log("POST /api/budget-plans received:", {
      body: req.body,
      user: req.user
        ? { _id: req.user._id, organizationId: req.user.organizationId }
        : null,
    });

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
      console.log("Missing required fields:", {
        personId: !!personId,
        year: !!year,
        yearlyBudget: yearlyBudget !== undefined,
      });
      return res.status(400).json({
        error: "personId, year, and yearlyBudget are required",
      });
    }

    // Check if budget plan already exists
    const existing = await BudgetPlan.findOne({
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId,
    });

    if (existing) {
      return res.status(409).json({
        error: "Budget plan already exists for this person and year",
      });
    }

    const budgetPlan = new BudgetPlan({
      personId,
      organizationId: req.user.organizationId,
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
    console.error("Error stack:", error.stack);
    if (error.code === 11000) {
      res
        .status(409)
        .json({ error: "Budget plan already exists for this person and year" });
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

    const budgetPlan = await BudgetPlan.findOneAndUpdate(
      {
        personId,
        year: parseInt(year),
        organizationId: req.user.organizationId,
      },
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

    const result = await BudgetPlan.deleteOne({
      personId,
      year: parseInt(year),
      organizationId: req.user.organizationId,
    });

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
// Calculate actual spending and returns from care tasks
router.get("/:personId/spending", requireAuth, async (req, res) => {
  try {
    const { personId } = req.params;
    const { year } = req.query;
    console.log("Calculating spending for:", { personId, year });

    if (!year) {
      return res.status(400).json({ error: "year is required" });
    }

    // Get date range for the year
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);

    // Find all completed care tasks with budget tracking for this person and year
    const completedTasks = await CareTask.find({
      personId,
      organizationId: req.user.organizationId,
      status: "Completed",
      cost: { $exists: true, $ne: null },
      budgetCategoryId: { $exists: true, $ne: null },
      budgetItemId: { $exists: true, $ne: null },
      //completedAt: { $gte: startDate, $lte: endDate },
      dueDate: { $gte: startDate, $lte: endDate }, // Use dueDate to capture tasks completed in different years
    });

    // Find all returned care tasks with budget tracking for this person and year
    const returnedTasks = await CareTask.find({
      personId,
      organizationId: req.user.organizationId,
      status: "Returned",
      cost: { $exists: true, $ne: null },
      budgetCategoryId: { $exists: true, $ne: null },
      budgetItemId: { $exists: true, $ne: null },
      // For returned tasks, we check completedAt as it was originally completed before being returned
      //completedAt: { $gte: startDate, $lte: endDate },
      dueDate: { $gte: startDate, $lte: endDate }, // Use dueDate to capture tasks completed in different years
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

      // Also add to spending if not already there (as returned items were initially spent)
      if (!spending[categoryId]) {
        spending[categoryId] = { items: {} };
      }
      if (!spending[categoryId].items[itemId]) {
        spending[categoryId].items[itemId] = 0;
      }
      spending[categoryId].items[itemId] += cost;
    }

    res.json({ spending, returned });
  } catch (error) {
    console.error("Error calculating spending:", error);
    res.status(500).json({ error: "Failed to calculate spending" });
  }
});

export default router;
