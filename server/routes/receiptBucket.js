import { Router } from "express";
import ReceiptBucket from "../models/ReceiptBucket.js";
import Person from "../models/PersonWithNeeds.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

// Create or get bucket for a client/month
router.post("/", requireAuth, async (req, res) => {
  try {
    const { personId, year, month, title, notes } = req.body;
    if (!personId || !year || !month) {
      return res.status(400).json({ error: "MISSING_PARAMS" });
    }

    // Guard: user must have access to this person
    const person = await Person.findById(personId).select("_id organizationId");
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    // TODO: reuse your PersonUserLink logic if you want stricter access control

    const doc = await ReceiptBucket.findOneAndUpdate(
      { personId, year, month },
      { $setOnInsert: { personId, year, month, title, notes } },
      { new: true, upsert: true }
    );

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List all buckets for a client (optionally by year)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { personId, year } = req.query;
    if (!personId) return res.status(400).json({ error: "MISSING_PERSON_ID" });

    const filter = { personId };
    if (year) filter.year = Number(year);

    const buckets = await ReceiptBucket.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();
    res.json(buckets);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
