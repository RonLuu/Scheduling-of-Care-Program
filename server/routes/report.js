import { requireAuth } from "../middleware/authz.js";
import Person from "../models/PersonWithNeeds.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import { Router } from "express";

const router = Router();

// Simplified warning function - only for overspending
function makeWarn(spent, budget) {
  if (budget > 0) {
    if (spent > budget) {
      return {
        level: "serious",
        message: "Already spent exceeds annual budget",
      };
    }
    if (spent >= 0.8 * budget) {
      return {
        level: "light",
        message: "Already spent ≥80% of annual budget",
      };
    }
  } else if (spent > 0) {
    return {
      level: "medium",
      message: "No budget set - please set budget",
    };
  }
  return null;
}

// GET /api/reports/budget?personId=...&year=2025
router.get("/budget", requireAuth, async (req, res) => {
  try {
    const { personId, year } = req.query;
    if (!personId || !year)
      return res.status(400).json({ error: "MISSING_PARAMS" });

    const y = Number(year);
    const from = new Date(Date.UTC(y, 0, 1));
    const to = new Date(Date.UTC(y + 1, 0, 1));

    // Person + org guard
    const person = await Person.findById(personId).lean();
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    // ---------- Top-level spend aggregates ----------
    const completedAgg = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Completed",
          dueDate: { $gte: from, $lt: to },
          cost: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "careneeditems",
          localField: "careNeedItemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      { $match: { "item.status": "Active" } },
      { $group: { _id: null, total: { $sum: "$cost" } } },
    ]);
    const completedSpend = completedAgg[0]?.total || 0;

    const purchaseAgg = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: "$purchaseCost" } } },
    ]);
    const purchaseSpend = purchaseAgg[0]?.total || 0;

    const totalSpent = completedSpend + purchaseSpend;

    // ---------- Category-level rollups (spent only) ----------
    const completedByCat = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Completed",
          dueDate: { $gte: from, $lt: to },
          cost: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "careneeditems",
          localField: "careNeedItemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      { $match: { "item.status": "Active" } },
      { $group: { _id: "$item.category", spent: { $sum: "$cost" } } },
    ]);

    const purchaseByCat = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $group: { _id: "$category", purchase: { $sum: "$purchaseCost" } } },
    ]);

    // Initialize categories
    const cats = {};
    for (const r of completedByCat) {
      cats[r._id] = {
        category: r._id,
        spent: r.spent || 0,
        purchase: 0,
        annualBudget: 0,
        items: [],
      };
    }
    for (const r of purchaseByCat) {
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        annualBudget: 0,
        items: [],
      }).purchase = r.purchase || 0;
    }

    // ---------- Per-item details (year scoped) ----------
    const completedByItem = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Completed",
          dueDate: { $gte: from, $lt: to },
          cost: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "careneeditems",
          localField: "careNeedItemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      { $match: { "item.status": "Active" } },
      { $group: { _id: "$careNeedItemId", completed: { $sum: "$cost" } } },
    ]);

    const purchaseItems = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $project: { _id: 1, purchaseCost: 1, name: 1, category: 1 } },
    ]);

    const itemIdsFromReport = Array.from(
      new Set([
        ...completedByItem.map((r) => String(r._id)),
        ...purchaseItems.map((r) => String(r._id)),
      ])
    );

    let itemsMeta = {};
    if (itemIdsFromReport.length) {
      const metas = await CareNeedItem.find(
        { _id: { $in: itemIdsFromReport } },
        { _id: 1, name: 1, category: 1, budgets: 1, budgetCost: 1 }
      ).lean();
      itemsMeta = Object.fromEntries(metas.map((m) => [String(m._id), m]));
    }

    const mCompletedByItem = Object.fromEntries(
      completedByItem.map((r) => [String(r._id), r.completed || 0])
    );
    const mPurchaseByItem = purchaseItems.reduce((acc, r) => {
      acc[String(r._id)] = (acc[String(r._id)] || 0) + (r.purchaseCost || 0);
      return acc;
    }, {});

    // Function to get budget for specific year
    function budgetForYear(metaDoc, yearNumber) {
      const arr = metaDoc?.budgets || [];
      const hit = arr.find((b) => Number(b.year) === Number(yearNumber));

      if (hit) {
        return Number(hit.amount || 0);
      }

      // Fallback to budgetCost (the default annual budget)
      return Number(metaDoc?.budgetCost || 0);
    }

    const allItemIds = Object.keys({
      ...mCompletedByItem,
      ...mPurchaseByItem,
    });

    // Build items for each category
    for (const id of allItemIds) {
      const meta = itemsMeta[id] || {
        name: "(Unknown item)",
        category: "Other",
        budgets: [],
        budgetCost: 0,
      };
      const category = meta.category || "Other";
      const annualBudgetItem = budgetForYear(meta, y);
      const spentItem =
        Number(mPurchaseByItem[id] || 0) + Number(mCompletedByItem[id] || 0);
      const currentBalanceItem = annualBudgetItem - spentItem;

      // Simple warning based on spending vs budget
      const warning = makeWarn(spentItem, annualBudgetItem);

      (cats[category] ||= {
        category,
        spent: 0,
        purchase: 0,
        annualBudget: 0,
        items: [],
      }).items.push({
        itemId: id,
        name: meta.name,
        annualBudget: annualBudgetItem,
        alreadySpent: spentItem,
        currentBalance: currentBalanceItem,
        warning,
      });
    }

    // Build categories with budget = sum of its items' budgets
    const categories = Object.values(cats).map((c) => {
      const annualBudgetFromItems = (c.items || []).reduce(
        (sum, it) => sum + Number(it.annualBudget || 0),
        0
      );
      c.annualBudget = annualBudgetFromItems;

      const totalCatSpent = (c.spent || 0) + (c.purchase || 0);
      const currentCatBalance = (c.annualBudget || 0) - totalCatSpent;

      // Category-level warning
      const categoryWarning = makeWarn(totalCatSpent, c.annualBudget);

      // Sort items by warning severity, then by overspend amount
      const rank = { serious: 3, medium: 2, light: 1 };
      (c.items || []).sort((a, b) => {
        const ra = a.warning ? rank[a.warning.level] || 0 : 0;
        const rb = b.warning ? rank[b.warning.level] || 0 : 0;
        if (rb !== ra) return rb - ra;
        const oa = a.alreadySpent - a.annualBudget;
        const ob = b.alreadySpent - b.annualBudget;
        return (ob || 0) - (oa || 0);
      });

      return {
        category: c.category,
        annualBudget: c.annualBudget || 0,
        totalSpent: totalCatSpent,
        currentBalance: currentCatBalance,
        warning: categoryWarning,
        items: c.items || [],
      };
    });

    // Sort categories by name
    categories.sort((a, b) => a.category.localeCompare(b.category));

    // Report-level annual budget from categories
    const reportAnnualBudget = categories.reduce(
      (sum, cat) => sum + Number(cat.annualBudget || 0),
      0
    );

    // Compute balance
    const currentBalance = reportAnnualBudget - totalSpent;

    // Top-level warning
    const warnings = {
      spentVsBudget: makeWarn(totalSpent, reportAnnualBudget),
    };

    res.json({
      personId,
      year: y,
      annualBudget: reportAnnualBudget,
      warnings,
      spent: {
        purchase: purchaseSpend,
        completed: completedSpend,
        total: totalSpent,
      },
      balance: {
        current: currentBalance,
      },
      categories,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
