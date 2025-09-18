import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import Person from "../models/PersonWithNeeds.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";

const router = Router();

const NEAR_THRESH = 0.8;

function levelFromRatio(ratio) {
  if (ratio > 1) return "serious";
  if (ratio >= NEAR_THRESH) return "light";
  return null;
}

function makeWarn(ratio, overMsg, nearMsg) {
  if (ratio > 1) return { level: "serious", message: overMsg };
  if (ratio >= NEAR_THRESH) return { level: "light", message: nearMsg };
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
    const predefinedAnnualBudget = Number(person.currentAnnualBudget || 0);

    // ---------- Top-level spend aggregates (independent from budget source) ----------
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
      { $group: { _id: null, total: { $sum: "$cost" } } },
    ]);
    const completedSpend = completedAgg[0]?.total || 0;

    const expectedAgg = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: { $in: ["Scheduled", "Missed"] },
          dueDate: { $gte: from, $lt: to },
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
      { $group: { _id: null, total: { $sum: "$item.occurrenceCost" } } },
    ]);
    const expectedRemaining = expectedAgg[0]?.total || 0;

    const purchaseAgg = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: "$purchaseCost" } } },
    ]);
    const purchaseSpend = purchaseAgg[0]?.total || 0;

    const totalSpent = completedSpend + purchaseSpend;

    // ---------- Category-level rollups (spent / purchase / expected) ----------
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
      { $group: { _id: "$item.category", spent: { $sum: "$cost" } } },
    ]);

    const purchaseByCat = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $group: { _id: "$category", purchase: { $sum: "$purchaseCost" } } },
    ]);

    const expectedByCat = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: { $in: ["Scheduled", "Missed"] },
          dueDate: { $gte: from, $lt: to },
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
      {
        $group: {
          _id: "$item.category",
          expected: { $sum: "$item.occurrenceCost" },
        },
      },
    ]);

    // Initialize cats from the three aggregates
    const cats = {};
    for (const r of completedByCat) {
      cats[r._id] = {
        category: r._id,
        spent: r.spent || 0,
        purchase: 0,
        expected: 0,
        annualBudget: 0,
        items: [],
      };
    }
    for (const r of purchaseByCat) {
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        expected: 0,
        annualBudget: 0,
        items: [],
      }).purchase = r.purchase || 0;
    }
    for (const r of expectedByCat) {
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        expected: 0,
        annualBudget: 0,
        items: [],
      }).expected = r.expected || 0;
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
      { $group: { _id: "$careNeedItemId", completed: { $sum: "$cost" } } },
    ]);

    const expectedByItem = await CareTask.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          status: { $in: ["Scheduled", "Missed"] },
          dueDate: { $gte: from, $lt: to },
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
      {
        $group: {
          _id: "$careNeedItemId",
          expected: { $sum: "$item.occurrenceCost" },
        },
      },
    ]);

    const purchaseItems = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          "frequency.startDate": { $gte: from, $lt: to },
          purchaseCost: { $gt: 0 },
        },
      },
      { $project: { _id: 1, purchaseCost: 1, name: 1, category: 1 } },
    ]);

    const itemIdsFromReport = Array.from(
      new Set([
        ...completedByItem.map((r) => String(r._id)),
        ...expectedByItem.map((r) => String(r._id)),
        ...purchaseItems.map((r) => String(r._id)),
      ])
    );

    let itemsMeta = {};
    if (itemIdsFromReport.length) {
      const metas = await CareNeedItem.find(
        { _id: { $in: itemIdsFromReport } },
        { _id: 1, name: 1, category: 1, budgets: 1 }
      ).lean();
      itemsMeta = Object.fromEntries(metas.map((m) => [String(m._id), m]));
    }

    const mCompletedByItem = Object.fromEntries(
      completedByItem.map((r) => [String(r._id), r.completed || 0])
    );
    const mExpectedByItem = Object.fromEntries(
      expectedByItem.map((r) => [String(r._id), r.expected || 0])
    );
    const mPurchaseByItem = purchaseItems.reduce((acc, r) => {
      acc[String(r._id)] = (acc[String(r._id)] || 0) + (r.purchaseCost || 0);
      return acc;
    }, {});

    function budgetForYear(metaDoc, yearNumber) {
      const arr = metaDoc?.budgets || [];
      const hit = arr.find((b) => Number(b.year) === Number(yearNumber));
      return hit ? Number(hit.amount || 0) : 0;
    }

    const warnFor = (budget, spent, expected) => {
      if (budget > 0) {
        if (spent > budget)
          return {
            level: "serious",
            code: "over_spent",
            message: "Already spent exceeds annual budget.",
          };
        if (spent + expected > budget)
          return {
            level: "medium",
            code: "projected_over",
            message: "Projected spend exceeds annual budget.",
          };
        if (spent >= 0.8 * budget)
          return {
            level: "light",
            code: "high_spend",
            message: "≥80% of annual budget already used.",
          };
        return null;
      } else {
        if (spent > 0 || expected > 0)
          return {
            level: "medium",
            code: "no_budget",
            message: "No budget set for this year. Please set the budget.",
          };
        return null;
      }
    };

    const allItemIds = Object.keys({
      ...mCompletedByItem,
      ...mExpectedByItem,
      ...mPurchaseByItem,
    });

    for (const id of allItemIds) {
      const meta = itemsMeta[id] || {
        name: "(Unknown item)",
        category: "Other",
        budgets: [],
      };
      const category = meta.category || "Other";
      const annualBudgetItem = budgetForYear(meta, y);
      const spentItem =
        Number(mPurchaseByItem[id] || 0) + Number(mCompletedByItem[id] || 0);
      const expectedItem = Number(mExpectedByItem[id] || 0);
      const currentBalanceItem = annualBudgetItem - spentItem;
      const expectedBalanceItem = currentBalanceItem - expectedItem;
      const warning = warnFor(annualBudgetItem, spentItem, expectedItem);

      (cats[category] ||= {
        category,
        spent: 0,
        purchase: 0,
        expected: 0,
        annualBudget: 0,
        items: [],
      }).items.push({
        itemId: id,
        name: meta.name,
        annualBudget: annualBudgetItem,
        alreadySpent: spentItem,
        currentBalance: currentBalanceItem,
        expectedRemaining: expectedItem,
        expectedBalanceAtYearEnd: expectedBalanceItem,
        warning,
      });
    }

    // ---- Build categories with budget = sum of its items' budgets for the year ---
    const categories = Object.values(cats).map((c) => {
      const annualBudgetFromItems = (c.items || []).reduce(
        (sum, it) => sum + Number(it.annualBudget || 0),
        0
      );
      c.annualBudget = annualBudgetFromItems;

      const totalCatSpent = (c.spent || 0) + (c.purchase || 0);
      const currentCatBalance = (c.annualBudget || 0) - totalCatSpent;
      const expectedCatBalanceAtYearEnd =
        (c.annualBudget || 0) - totalCatSpent - (c.expected || 0);

      const spentPct = totalSpent > 0 ? totalCatSpent / totalSpent : 0;
      const expectedPct =
        expectedRemaining > 0 ? (c.expected || 0) / expectedRemaining : 0;

      const rank = { serious: 3, medium: 2, light: 1 };
      (c.items || []).sort((a, b) => {
        const ra = a.warning ? rank[a.warning.level] || 0 : 0;
        const rb = b.warning ? rank[b.warning.level] || 0 : 0;
        if (rb !== ra) return rb - ra;
        const oa = a.alreadySpent + a.expectedRemaining - a.annualBudget;
        const ob = b.alreadySpent + b.expectedRemaining - b.annualBudget;
        return (ob || 0) - (oa || 0);
      });

      return {
        category: c.category,
        annualBudget: c.annualBudget || 0,
        totalSpent: totalCatSpent,
        currentBalance: currentCatBalance,
        expected: c.expected || 0,
        expectedBalanceAtYearEnd: expectedCatBalanceAtYearEnd,
        spentPct,
        expectedPct,
        items: c.items || [],
      };
    });

    // Report-level annual budget from categories
    const reportAnnualBudget = categories.reduce(
      (sum, cat) => sum + Number(cat.annualBudget || 0),
      0
    );

    // compute balances using the reportAnnualBudget
    const currentBalance = reportAnnualBudget - totalSpent;
    const expectedBalanceAtYearEnd =
      reportAnnualBudget - totalSpent - expectedRemaining;

    // ---------- NEW: top-level warnings ----------
    const warnings = {
      budgetVsPredefined: null,
      spentVsReportBudget: null,
      projectedVsReportBudget: null,
    };

    // Sum-of-categories vs predefined person budget
    if (predefinedAnnualBudget > 0) {
      const ratio = reportAnnualBudget / predefinedAnnualBudget;
      const w = makeWarn(
        ratio,
        "Total of category budgets exceeds the client's predefined annual budget.",
        "Total of category budgets is ≥80% of the client's predefined annual budget."
      );
      if (w) warnings.budgetVsPredefined = w;
    }

    // Already spent vs report budget (sum of categories)
    if (reportAnnualBudget > 0) {
      const ratioSpent = totalSpent / reportAnnualBudget;
      const wSpent = makeWarn(
        ratioSpent,
        "Already spent exceeds the total categories annual budget.",
        "Already spent is ≥80% of the total categories annual budget."
      );
      if (wSpent) warnings.spentVsReportBudget = wSpent;

      // Projected (spent + expected) vs report budget
      const ratioProj = (totalSpent + expectedRemaining) / reportAnnualBudget;
      const wProj = makeWarn(
        ratioProj,
        "Projected spend (spent + expected) exceeds the total categories annual budget.",
        "Projected spend is ≥80% of the total categories annual budget."
      );
      if (wProj) warnings.projectedVsReportBudget = wProj;
    }

    res.json({
      personId,
      year: y,
      annualBudget: reportAnnualBudget,
      predefinedAnnualBudget,
      warnings,
      spent: {
        purchase: purchaseSpend,
        completed: completedSpend,
        total: totalSpent,
      },
      expected: { remaining: expectedRemaining },
      balance: {
        current: currentBalance,
        expectedAtYearEnd: expectedBalanceAtYearEnd,
      },
      categories,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
