import { Router } from "express";
import CareNeedItem from "../models/CareNeedItem.js";
import CareTask from "../models/CareTask.js";
import Person from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import { expandOccurrences } from "../utils/schedule.js";
import { requireAuth, requireRole, ensureCanManagePerson } from "../middleware/authz.js";
import PersonUserLink from "../models/PersonUserLink.js";

const router = Router();

/**
 * POST /care-need-items/:itemId/generate-tasks?from=2025-01-01&to=2025-12-31
 * Body (optional): { assignToUserId? }
 * Creates (or upserts) CareTasks for the date window based on the item's frequency.
 */
router.post("/care-need-items/:itemId/generate-tasks",
  requireAuth, requireRole("Admin","Family","PoA"), generateTasksForItem);

async function generateTasksForItem(req, res) {
  const { itemId } = req.params;
  const { from, to } = req.query;

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

  // org boundary (optional but recommended)
  if (String(item.organizationId) !== String(req.user.organizationId)) {
    return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
  }

  const start = item.frequency?.startDate ? new Date(item.frequency.startDate) : null;
  if (!start) return res.status(400).json({ error: "ITEM_HAS_NO_START" });

  // If no query window given, derive full window:
  // - from = start
  // - to   = item.endDate OR start + 2 years (default)
  let windowStart = from ? new Date(from) : start;
  let windowEnd;
  if (to) {
    windowEnd = new Date(to);
  } else if (item.endDate) {
    windowEnd = new Date(item.endDate);
  } else {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + 2);       // default horizon when “no end”
    windowEnd = d;
  }

  const dates = expandOccurrences(
    {
      intervalType:  item.frequency.intervalType,
      intervalValue: item.frequency.intervalValue || 1,
      startDate:     start,
      endDate:       item.endDate || null,
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
        status: "Scheduled"
      },
      $set: {
        scheduleType: item.scheduleType === "Timed" ? "Timed" : "AllDay"
      }
    };

    if (item.scheduleType === "Timed" && item.timeWindow) {
      const startAt = combineDateAndTime(dueDate, item.timeWindow.startTime);
      const endAt   = combineDateAndTime(dueDate, item.timeWindow.endTime);
      // ensure these are present even for existing docs
      update.$set.startAt = startAt;
      update.$set.endAt   = endAt;
    } else {
      // normalize all-day rows (remove stale times if any)
      update.$set.startAt = null;
      update.$set.endAt   = null;
    }

    const resUp = await CareTask.updateOne(query, update, { upsert: true });
    if (resUp.upsertedCount === 1) upserts++;
  }

  res.json({ upserts, totalGenerated: dates.length, windowStart, windowEnd });
};


router.post("/care-need-items/:itemId/extend", requireAuth, 
    requireRole("Admin","Family","PoA"), extendTasksForItem);

async function extendTasksForItem(req, res)  {
  const { itemId } = req.params;
  const { horizonMonths } = req.query;
  const { newEndDate } = req.body || {};

  const item = await CareNeedItem.findById(itemId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });
  if (String(item.organizationId) !== String(req.user.organizationId)) {
    return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
  }

  const last = await CareTask.findOne({ careNeedItemId: item._id }).sort({ dueDate: -1 }).lean();
  const fromDate = last ? new Date(last.dueDate) : new Date(item.frequency.startDate);

  // Step forward one interval to avoid duplicating the last existing task
  const step = (d) => {
    const nd = new Date(d);
    const iv = item.frequency.intervalValue || 1;
    const t  = item.frequency.intervalType;
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
      intervalType:  item.frequency.intervalType,
      intervalValue: item.frequency.intervalValue || 1,
      startDate:     item.frequency.startDate,
      endDate:       item.endDate || null,
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
        dueDate,                       // anchor to the day
        scheduleType: item.scheduleType,
        status: "Scheduled"
      }
    };

    let query = { careNeedItemId: item._id, dueDate };

    if (item.scheduleType === "Timed" && item.timeWindow) {
      const startAt = combineDateAndTime(dueDate, item.timeWindow.startTime);
      const endAt   = combineDateAndTime(dueDate, item.timeWindow.endTime);
      doc.$setOnInsert.startAt = startAt;
      doc.$setOnInsert.endAt   = endAt;
      // include startAt in uniqueness
      query.startAt = startAt;
    }

    const resUp = await CareTask.updateOne(query, doc, { upsert: true });
    if (resUp.upsertedCount === 1) upserts++;
  }

  res.json({ upserts, totalGenerated: dates.length, windowStart, windowEnd });
};

function combineDateAndTime(dateOnly, hhmm) {
  // dateOnly is a JS Date (occurrence day)
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
}

router.post("/ensure-horizon", requireAuth, async (req, res) => {
  const horizonDays = Number(req.query.horizonDays || 730); // default ~2y
  const horizonEnd = addDays(new Date(), horizonDays);

  // 1) Find candidate CareNeedItems (Active, no end condition) in org / scope
  const itemFilter = {
    organizationId: req.user.organizationId,
    status: "Active",
    endDate: { $in: [null, undefined] },
    $or: [{ occurrenceCount: null }, { occurrenceCount: { $exists: false } }]
  };

  // Staff: restrict to persons they are linked to
  if (req.user.role === "GeneralCareStaff") {
    const links = await PersonUserLink
      .find({ userId: req.user.id, active: true })
      .select("personId").lean();
    const personIds = links.map(l => l.personId);
    if (personIds.length === 0) return res.json({ checked: 0, extended: 0 });
    itemFilter.personId = { $in: personIds };
  }

  const items = await CareNeedItem.find(itemFilter).lean();
  if (items.length === 0) return res.json({ checked: 0, extended: 0 });

  // 2) For each item, see how far its tasks already go; extend only missing range
  let extended = 0;

  for (const item of items) {
    const startDate = item?.frequency?.startDate ? new Date(item.frequency.startDate) : null;
    if (!startDate) continue;

    // Find the latest dueDate we already have for this item
    const last = await CareTask
      .findOne({ careNeedItemId: item._id })
      .sort({ dueDate: -1 })
      .select("dueDate")
      .lean();

    // If nothing yet, we start at the item start; else from the next occurrence after 'last.dueDate'
    const fromDate = last ? nextStepAfter(item.frequency, new Date(last.dueDate)) : startDate;

    // If we already cover the horizon, skip
    if (last && last.dueDate && new Date(last.dueDate) >= horizonEnd) continue;

    // Generate missing occurrences from 'fromDate' to 'horizonEnd'
    const dates = expandOccurrences(
      {
        intervalType:  item.frequency.intervalType,
        intervalValue: item.frequency.intervalValue || 1,
        startDate:     startDate,
        endDate:       null,          // no hard end
        occurrenceCount: null
      },
      fromDate,
      horizonEnd
    );

    // Upsert (idempotent), include Timed fields if applicable
    for (const dueDate of dates) {
      const query = { careNeedItemId: item._id, dueDate };
      const update = {
        $setOnInsert: {
          personId: item.personId,
          organizationId: item.organizationId,
          careNeedItemId: item._id,
          title: item.name,
          dueDate,
          status: "Scheduled"
        },
        $set: {
          scheduleType: item.scheduleType === "Timed" ? "Timed" : "AllDay",
          startAt: null,
          endAt: null
        }
      };

      if (item.scheduleType === "Timed" && item.timeWindow) {
        const startAt = combineDateAndTime(dueDate, item.timeWindow.startTime);
        const endAt   = combineDateAndTime(dueDate, item.timeWindow.endTime);
        update.$set.startAt = startAt;
        update.$set.endAt   = endAt;
      }

      await CareTask.updateOne(query, update, { upsert: true });
      extended++;
    }
  }

  res.json({ checked: items.length, extended });
});

// helpers
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function nextStepAfter(freq, fromDate) {
  // step once based on frequency so we don't duplicate the last existing dueDate
  const nd = new Date(fromDate);
  const iv = freq.intervalValue || 1;
  const t = freq.intervalType;
  if (t === "Daily")   nd.setDate(nd.getDate() + iv);
  if (t === "Weekly")  nd.setDate(nd.getDate() + 7 * iv);
  if (t === "Monthly") nd.setMonth(nd.getMonth() + iv);
  if (t === "Yearly")  nd.setFullYear(nd.getFullYear() + iv);
  return nd;
}

export default router;