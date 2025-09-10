import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import Person from "../models/PersonWithNeeds.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";

const router = Router();

// GET /api/reports/budget?personId=...&year=2025
router.get("/budget", requireAuth, async (req, res) => {
  try {
    const { personId, year } = req.query;
    if (!personId || !year)
      return res.status(400).json({ error: "MISSING_PARAMS" });
    const y = Number(year);
    const from = new Date(Date.UTC(y, 0, 1));
    const to = new Date(Date.UTC(y + 1, 0, 1));

    // Load person + org guard
    const person = await Person.findById(personId).lean();
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const annualBudget = Number(person.currentAnnualBudget || 0);

    // --- completed spend from CareTask.cost ---
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

    // expected remaining from uncompleted tasks (join to item.occurrenceCost + category) ---
    const pendingAgg = await CareTask.aggregate([
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
          _id: null,
          total: { $sum: "$item.occurrenceCost" },
        },
      },
    ]);
    const expectedRemaining = pendingAgg[0]?.total || 0;

    // --- purchase cost counted in the year items start ---
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
    const currentBalance = annualBudget - totalSpent;
    const expectedBalanceAtYearEnd =
      annualBudget - totalSpent - expectedRemaining;

    // --- category breakdowns: spent (completed+purchase) and expected ---
    // completed by category
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

    // purchase by category (items that started this year)
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

    // expected by category (pending tasks)
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

    // category annual budgets (sum of item.budgetCost per category) FOR THE YEAR
    const catBudgetAgg = await CareNeedItem.aggregate([
      {
        $match: {
          personId: person._id,
          organizationId: person.organizationId,
          createdAt: { $gte: from, $lt: to }, // <-- bound to report year
          budgetCost: { $gt: 0 },
        },
      },
      { $group: { _id: "$category", annualBudget: { $sum: "$budgetCost" } } },
    ]);

    // merge per-category results
    const cats = {};
    for (const r of completedByCat)
      cats[r._id] = {
        category: r._id,
        spent: r.spent || 0,
        purchase: 0,
        expected: 0,
      };
    for (const r of purchaseByCat)
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        expected: 0,
      }).purchase = r.purchase || 0;
    for (const r of expectedByCat)
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        expected: 0,
      }).expected = r.expected || 0;
    for (const r of catBudgetAgg)
      (cats[r._id] ||= {
        category: r._id,
        spent: 0,
        purchase: 0,
        expected: 0,
        annualBudget: 0,
      }).annualBudget = r.annualBudget || 0;

    const categories = Object.values(cats).map((c) => {
      const totalCatSpent = c.spent + c.purchase;
      const currentCatBalance = c.annualBudget - totalCatSpent;
      const expectedCatBalanceAtYearEnd =
        c.annualBudget - totalCatSpent - c.expected;

      // keep existing percentage columns (optional)
      const spentPct = totalSpent > 0 ? totalCatSpent / totalSpent : 0;
      const expectedPct =
        expectedRemaining > 0 ? c.expected / expectedRemaining : 0;

      return {
        category: c.category,
        annualBudget: c.annualBudget,
        totalSpent: totalCatSpent,
        currentBalance: currentCatBalance,
        expected: c.expected,
        expectedBalanceAtYearEnd: expectedCatBalanceAtYearEnd,
        spentPct,
        expectedPct,
      };
    });

    res.json({
      personId,
      year: y,
      annualBudget,
      spent: {
        purchase: purchaseSpend,
        completed: completedSpend,
        total: totalSpent,
      },
      expected: {
        remaining: expectedRemaining,
      },
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
