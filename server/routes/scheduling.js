import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import CareTask from "../models/CareTask.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import { expandOccurrences } from "../utils/schedule.js";
import {
  requireAuth,
  requireRole,
  ensureCanManagePerson,
} from "../middleware/authz.js";
import PersonUserLink from "../models/PersonUserLink.js";

const router = Router();

function endOfYearUTC(year) {
  // 00:00 of Jan 1 next year minus 1 ms = 23:59:59.999 of Dec 31 this year
  const startNextYear = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return new Date(startNextYear.getTime() - 1);
}

function lastDateByCount(start, intervalType, intervalValue, occurrenceCount) {
  if (!start || !occurrenceCount) return start;
  const steps = Math.max(Number(occurrenceCount) - 1, 0);
  const iv = Math.max(Number(intervalValue) || 1, 1);
  const d = new Date(start);
  if (intervalType === "Daily") d.setDate(d.getDate() + iv * steps);
  else if (intervalType === "Weekly") d.setDate(d.getDate() + 7 * iv * steps);
  else if (intervalType === "Monthly") d.setMonth(d.getMonth() + iv * steps);
  else if (intervalType === "Yearly")
    d.setFullYear(d.getFullYear() + iv * steps);
  return d;
}

/**
 * POST /care-need-items/:itemId/generate-tasks?from=2025-01-01&to=2025-12-31
 * Body (optional): { assignToUserId? }
 * Creates (or upserts) CareTasks for the date window based on the item's frequency.
 */
router.post(
  "/care-need-items/:itemId/generate-tasks",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  generateTasksForItem
);

async function generateTasksForItem(req, res) {
  const { itemId } = req.params;
  const { from, to } = req.query;
  const { assignToUserId } = req.body || {};

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

  // org boundary (optional but recommended)
  if (String(item.organizationId) !== String(req.user.organizationId)) {
    return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
  }

  if (item.frequency?.intervalType === "JustPurchase") {
    return res.json({
      upserts: 0,
      totalGenerated: 0,
      windowStart: null,
      windowEnd: null,
      note: "JustPurchase item has no scheduled tasks.",
    });
  }

  const start = item.frequency?.startDate
    ? new Date(item.frequency.startDate)
    : null;
  if (!start) return res.status(400).json({ error: "ITEM_HAS_NO_START" });

  let windowStart = from ? new Date(from) : start;

  // If no query window given, derive full window:
  // - from = start
  // - to   = item.endDate OR end-of-current-year (default for open-ended)
  let windowEnd;
  if (to) {
    windowEnd = new Date(to);
  } else if (item.endDate) {
    windowEnd = new Date(item.endDate);
  } else if (item.occurrenceCount) {
    // Count-based end: compute the last expected occurrence
    windowEnd = lastDateByCount(
      start,
      item.frequency.intervalType,
      item.frequency.intervalValue || 1,
      item.occurrenceCount
    );
  } else {
    // Open-ended (year-end pattern): cap at end of current year
    const now = new Date();
    windowEnd = endOfYearUTC(now.getUTCFullYear());
  }

  const dates = expandOccurrences(
    {
      intervalType: item.frequency.intervalType,
      intervalValue: item.frequency.intervalValue || 1,
      startDate: start,
      endDate: item.endDate || null,
      occurrenceCount: item.occurrenceCount || null,
    },
    windowStart,
    windowEnd
  );

  // Upsert tasks (idempotent). Unique index (careNeedItemId, dueDate) prevents dups.
  let upserts = 0;
  for (const dueDate of dates) {
    // Build query so we can UPDATE existing tasks to Timed when needed
    const query = { careNeedItemId: item._id, dueDate };

    // Always set scheduleType (and start/end for Timed). Use $set so existing rows get corrected.
    const update = {
      $setOnInsert: {
        personId: item.personId,
        organizationId: item.organizationId,
        careNeedItemId: item._id,
        title: item.name,
        dueDate,
        status: "Scheduled",
        ...(assignToUserId ? { assignedToUserId: assignToUserId } : {}),
      },
      $set: {
        scheduleType: item.scheduleType === "Timed" ? "Timed" : "AllDay",
      },
    };

    if (item.scheduleType === "Timed" && item.timeWindow) {
      const startAt = combineDateAndTime(dueDate, item.timeWindow.startTime);
      const endAt = combineDateAndTime(dueDate, item.timeWindow.endTime);
      // ensure these are present even for existing docs
      update.$set.startAt = startAt;
      update.$set.endAt = endAt;
    } else {
      // normalize all-day rows (remove stale times if any)
      update.$set.startAt = null;
      update.$set.endAt = null;
    }

    const resUp = await CareTask.updateOne(query, update, { upsert: true });
    if (resUp.upsertedCount === 1) upserts++;
  }

  res.json({ upserts, totalGenerated: dates.length, windowStart, windowEnd });
}

router.post(
  "/care-need-items/:itemId/extend",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  extendTasksForItem
);

async function extendTasksForItem(req, res) {
  const { itemId } = req.params;
  const { horizonMonths } = req.query;
  const { newEndDate } = req.body || {};

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });
  if (String(item.organizationId) !== String(req.user.organizationId)) {
    return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
  }

  // JustPurchase => never extend tasks
  if (item.frequency?.intervalType === "JustPurchase") {
    return res.json({
      upserts: 0,
      totalGenerated: 0,
      windowStart: null,
      windowEnd: null,
      note: "JustPurchase item has no scheduled tasks to extend.",
    });
  }

  const last = await CareTask.findOne({ careNeedItemId: item._id })
    .sort({ dueDate: -1 })
    .lean();
  const fromDate = last
    ? new Date(last.dueDate)
    : new Date(item.frequency.startDate);

  // Step forward one interval to avoid duplicating the last existing task
  const step = (d) => {
    const nd = new Date(d);
    const iv = item.frequency.intervalValue || 1;
    const t = item.frequency.intervalType;
    if (t === "Daily") nd.setDate(nd.getDate() + iv);
    if (t === "Weekly") nd.setDate(nd.getDate() + 7 * iv);
    if (t === "Monthly") nd.setMonth(nd.getMonth() + iv);
    if (t === "Yearly") nd.setFullYear(nd.getFullYear() + iv);
    return nd;
  };
  const windowStart = step(fromDate);

  let windowEnd;
  if (newEndDate) {
    windowEnd = new Date(newEndDate);
  } else if (horizonMonths) {
    const d = new Date(windowStart);
    d.setMonth(d.getMonth() + Number(horizonMonths));
    windowEnd = d;
  } else {
    // default extend 6 months
    const d = new Date(windowStart);
    d.setMonth(d.getMonth() + 6);
    windowEnd = d;
  }

  const dates = expandOccurrences(
    {
      intervalType: item.frequency.intervalType,
      intervalValue: item.frequency.intervalValue || 1,
      startDate: item.frequency.startDate,
      endDate: item.endDate || null,
      occurrenceCount: item.occurrenceCount || null,
    },
    windowStart,
    windowEnd
  );

  let upserts = 0;
  for (const dueDate of dates) {
    let doc = {
      $setOnInsert: {
        personId: item.personId,
        organizationId: item.organizationId,
        careNeedItemId: item._id,
        title: item.name,
        dueDate, // anchor to the day
        scheduleType: item.scheduleType,
        status: "Scheduled",
      },
    };

    let query = { careNeedItemId: item._id, dueDate };

    if (item.scheduleType === "Timed" && item.timeWindow) {
      const startAt = combineDateAndTime(dueDate, item.timeWindow.startTime);
      const endAt = combineDateAndTime(dueDate, item.timeWindow.endTime);
      doc.$setOnInsert.startAt = startAt;
      doc.$setOnInsert.endAt = endAt;
      // include startAt in uniqueness
      query.startAt = startAt;
    }

    const resUp = await CareTask.updateOne(query, doc, { upsert: true });
    if (resUp.upsertedCount === 1) upserts++;
  }

  res.json({ upserts, totalGenerated: dates.length, windowStart, windowEnd });
}

function combineDateAndTime(dateOnly, hhmm) {
  // dateOnly is a JS Date (occurrence day)
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
}

// helpers
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function nextStepAfter(freq, fromDate) {
  // step once based on frequency so we don't duplicate the last existing dueDate
  const nd = new Date(fromDate);
  const iv = freq.intervalValue || 1;
  const t = freq.intervalType;
  if (t === "Daily") nd.setDate(nd.getDate() + iv);
  if (t === "Weekly") nd.setDate(nd.getDate() + 7 * iv);
  if (t === "Monthly") nd.setMonth(nd.getMonth() + iv);
  if (t === "Yearly") nd.setFullYear(nd.getFullYear() + iv);
  return nd;
}

/**
 * POST /api/scheduling/care-need-items/:itemId/generate-next-year
 * Generates all tasks for the entire next year, replacing any existing ones
 */
router.post(
  "/care-need-items/:itemId/generate-next-year",
  requireAuth,
  requireRole("Admin", "Family", "PoA"),
  async (req, res) => {
    try {
      const { itemId } = req.params;

      // Load the item
      const item = await CareNeedItem.findById(itemId);
      if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

      // Verify org boundary
      if (String(item.organizationId) !== String(req.user.organizationId)) {
        return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
      }

      // Check this is a "yearEnd" item (no explicit endDate, no occurrenceCount)
      if (item.endDate || item.occurrenceCount) {
        return res.status(400).json({
          error: "This action is only for open-ended (year-end) items",
        });
      }

      // Skip if JustPurchase
      if (item.frequency?.intervalType === "JustPurchase") {
        return res.json({
          deleted: 0,
          created: 0,
          note: "JustPurchase items have no scheduled tasks",
        });
      }

      const start = item.frequency?.startDate
        ? new Date(item.frequency.startDate)
        : null;
      if (!start) {
        return res.status(400).json({ error: "Item has no start date" });
      }

      // Calculate next year's date range
      const now = new Date();
      const nextYear = now.getUTCFullYear() + 1;
      const nextYearStart = new Date(Date.UTC(nextYear, 0, 1, 0, 0, 0));
      const nextYearEnd = new Date(Date.UTC(nextYear, 11, 31, 23, 59, 59, 999));

      // 1. Delete all existing tasks for next year
      const deleteResult = await CareTask.deleteMany({
        careNeedItemId: item._id,
        dueDate: {
          $gte: nextYearStart,
          $lte: nextYearEnd,
        },
        status: { $in: ["Scheduled", "Skipped"] }, // Only delete pending tasks
      });

      // 2. Generate new tasks for the entire next year
      const dates = expandOccurrences(
        {
          intervalType: item.frequency.intervalType,
          intervalValue: item.frequency.intervalValue || 1,
          startDate: start,
          endDate: null, // treat as open-ended
          occurrenceCount: null,
        },
        nextYearStart,
        nextYearEnd
      );

      // 3. Create the new tasks
      let created = 0;
      for (const dueDate of dates) {
        const taskDoc = {
          personId: item.personId,
          organizationId: item.organizationId,
          careNeedItemId: item._id,
          title: item.name,
          dueDate,
          status: "Scheduled",
          scheduleType: item.scheduleType === "Timed" ? "Timed" : "AllDay",
        };

        // Add time windows if Timed
        if (item.scheduleType === "Timed" && item.timeWindow) {
          taskDoc.startAt = combineDateAndTime(
            dueDate,
            item.timeWindow.startTime
          );
          taskDoc.endAt = combineDateAndTime(dueDate, item.timeWindow.endTime);
        }

        await CareTask.create(taskDoc);
        created++;
      }

      res.json({
        deleted: deleteResult.deletedCount,
        created,
        year: nextYear,
        itemName: item.name,
      });
    } catch (err) {
      console.error("Error generating next year tasks:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
