// server/routes/users.me.js
import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

const router = Router();

// PATCH /api/users/me/organization  { organizationId }
router.patch("/me/organization", requireAuth, async (req, res) => {
  try {
    const { organizationId } = req.body || {};
    if (!organizationId) return res.status(400).json({ error: "ORG_REQUIRED" });

    const org = await Organization.findById(organizationId).lean();
    if (!org) return res.status(404).json({ error: "ORG_NOT_FOUND" });

    // Simple policy: any role may set their org once; changing org later is allowed here,
    // but you might add guards (e.g., must have no links/tasks) per your project rules.
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { organizationId },
      { new: true }
    ).lean();

    res.json({
      ok: true,
      user: { id: updated._id, organizationId: updated.organizationId },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
