import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import Person from "../models/PersonWithNeeds.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";

const router = Router();

// Simplified warning function - only for overspending
function makeWarn(spent, budget) {
  if (budget > 0) {
    if (spent > budget) {
      return {
        level: "serious",
        message: "Expense exceeds annual budget",
      };
    }
    if (spent >= 0.8 * budget) {
      return {
        level: "light",
        message: "Expense ≥80% of annual budget",
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

    // ---------- Monthly breakdown (high-level) ----------
    const monthlyCompleted = await CareTask.aggregate([
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
      {
        $group: {
          _id: { $month: "$dueDate" },
          completed: { $sum: "$cost" },
        },
      },
    ]);

    const monthlyPurchase = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: { $month: "$frequency.startDate" },
          purchase: { $sum: "$purchaseCost" },
        },
      },
    ]);

    // Build monthly breakdown array
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyMap = {};

    // Initialize all months
    for (let m = 1; m <= 12; m++) {
      monthlyMap[m] = {
        month: m,
        monthName: monthNames[m - 1],
        year: y,
        completed: 0,
        purchase: 0,
        total: 0,
      };
    }

    // Add completed costs
    for (const mc of monthlyCompleted) {
      if (monthlyMap[mc._id]) {
        monthlyMap[mc._id].completed = mc.completed || 0;
      }
    }

    // Add purchase costs
    for (const mp of monthlyPurchase) {
      if (monthlyMap[mp._id]) {
        monthlyMap[mp._id].purchase = mp.purchase || 0;
      }
    }

    // Calculate totals and filter out zero months
    const monthlyBreakdown = Object.values(monthlyMap)
      .map((m) => ({
        ...m,
        total: m.completed + m.purchase,
      }))
      .filter((m) => m.total > 0)
      .sort((a, b) => a.month - b.month);

    // ---------- Category-level rollups with monthly breakdown ----------
    const completedByCatMonth = await CareTask.aggregate([
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
      {
        $group: {
          _id: {
            category: "$item.category",
            month: { $month: "$dueDate" },
          },
          spent: { $sum: "$cost" },
        },
      },
    ]);

    const purchaseByCatMonth = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            category: "$category",
            month: { $month: "$frequency.startDate" },
          },
          purchase: { $sum: "$purchaseCost" },
        },
      },
    ]);

    // Initialize categories with monthly data
    const cats = {};
    const catMonthlyData = {}; // {category: {month: {completed, purchase}}}

    for (const r of completedByCatMonth) {
      const cat = r._id.category;
      const month = r._id.month;

      if (!cats[cat]) {
        cats[cat] = {
          category: cat,
          spent: 0,
          purchase: 0,
          annualBudget: 0,
          items: [],
        };
      }
      cats[cat].spent += r.spent || 0;

      if (!catMonthlyData[cat]) catMonthlyData[cat] = {};
      if (!catMonthlyData[cat][month])
        catMonthlyData[cat][month] = { completed: 0, purchase: 0 };
      catMonthlyData[cat][month].completed = r.spent || 0;
    }

    for (const r of purchaseByCatMonth) {
      const cat = r._id.category;
      const month = r._id.month;

      if (!cats[cat]) {
        cats[cat] = {
          category: cat,
          spent: 0,
          purchase: 0,
          annualBudget: 0,
          items: [],
        };
      }
      cats[cat].purchase += r.purchase || 0;

      if (!catMonthlyData[cat]) catMonthlyData[cat] = {};
      if (!catMonthlyData[cat][month])
        catMonthlyData[cat][month] = { completed: 0, purchase: 0 };
      catMonthlyData[cat][month].purchase = r.purchase || 0;
    }

    // ---------- Per-item details with monthly breakdown ----------
    const completedByItemMonth = await CareTask.aggregate([
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
      {
        $group: {
          _id: {
            itemId: "$careNeedItemId",
            month: { $month: "$dueDate" },
          },
          completed: { $sum: "$cost" },
        },
      },
    ]);

    const purchaseItemsMonth = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: "Active",
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          purchaseCost: 1,
          name: 1,
          category: 1,
          month: { $month: "$frequency.startDate" },
        },
      },
    ]);

    // Build item totals and monthly data
    const itemTotals = {};
    const itemMonthlyData = {}; // {itemId: {month: {completed, purchase}}}

    for (const r of completedByItemMonth) {
      const id = String(r._id.itemId);
      const month = r._id.month;

      itemTotals[id] = (itemTotals[id] || 0) + (r.completed || 0);

      if (!itemMonthlyData[id]) itemMonthlyData[id] = {};
      if (!itemMonthlyData[id][month])
        itemMonthlyData[id][month] = { completed: 0, purchase: 0 };
      itemMonthlyData[id][month].completed = r.completed || 0;
    }

    const purchaseItemTotals = {};
    for (const r of purchaseItemsMonth) {
      const id = String(r._id);
      purchaseItemTotals[id] =
        (purchaseItemTotals[id] || 0) + (r.purchaseCost || 0);

      if (!itemMonthlyData[id]) itemMonthlyData[id] = {};
      if (!itemMonthlyData[id][r.month])
        itemMonthlyData[id][r.month] = { completed: 0, purchase: 0 };
      itemMonthlyData[id][r.month].purchase =
        (itemMonthlyData[id][r.month].purchase || 0) + r.purchaseCost;
    }

    const itemIdsFromReport = Array.from(
      new Set([...Object.keys(itemTotals), ...Object.keys(purchaseItemTotals)])
    );

    let itemsMeta = {};
    if (itemIdsFromReport.length) {
      const metas = await CareNeedItem.find(
        { _id: { $in: itemIdsFromReport } },
        { _id: 1, name: 1, category: 1, budgets: 1, budgetCost: 1 }
      ).lean();
      itemsMeta = Object.fromEntries(metas.map((m) => [String(m._id), m]));
    }

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

    // Build items for each category
    for (const id of itemIdsFromReport) {
      const meta = itemsMeta[id] || {
        name: "(Unknown item)",
        category: "Other",
        budgets: [],
        budgetCost: 0,
      };
      const category = meta.category || "Other";
      const annualBudgetItem = budgetForYear(meta, y);
      const spentItem = (itemTotals[id] || 0) + (purchaseItemTotals[id] || 0);
      const currentBalanceItem = annualBudgetItem - spentItem;

      // Simple warning based on spending vs budget
      const warning = makeWarn(spentItem, annualBudgetItem);

      // Build monthly breakdown for this item
      const itemMonthly = [];
      if (itemMonthlyData[id]) {
        for (const month in itemMonthlyData[id]) {
          const data = itemMonthlyData[id][month];
          if (data.completed > 0 || data.purchase > 0) {
            itemMonthly.push({
              month: Number(month),
              monthName: monthNames[Number(month) - 1],
              completed: data.completed || 0,
              purchase: data.purchase || 0,
              total: (data.completed || 0) + (data.purchase || 0),
            });
          }
        }
      }
      itemMonthly.sort((a, b) => a.month - b.month);

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
        monthlyBreakdown: itemMonthly,
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

      // Build category monthly breakdown
      const categoryMonthly = [];
      if (catMonthlyData[c.category]) {
        for (const month in catMonthlyData[c.category]) {
          const data = catMonthlyData[c.category][month];
          if (data.completed > 0 || data.purchase > 0) {
            categoryMonthly.push({
              month: Number(month),
              monthName: monthNames[Number(month) - 1],
              completed: data.completed || 0,
              purchase: data.purchase || 0,
              total: (data.completed || 0) + (data.purchase || 0),
            });
          }
        }
      }
      categoryMonthly.sort((a, b) => a.month - b.month);

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
        monthlyBreakdown: categoryMonthly,
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

    // Top-level warnings
    const warnings = {
      summary: makeWarn(totalSpent, reportAnnualBudget),
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
      monthlyBreakdown,
      categories,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
