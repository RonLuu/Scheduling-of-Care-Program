import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import Token from "../models/Token.js";
import AccessRequest from "../models/AccessRequest.js";
import PersonUserLink from "../models/PersonUserLink.js";
import User from "../models/User.js";
import { verifyTokenString } from "../utils/token.js"; // your existing verify helper (returns token doc)

const router = Router();

// POST /api/access-requests  { token, message? }
router.post("/", requireAuth, async (req, res) => {
  try {
    const { token, message } = req.body || {};
    if (!token) return res.status(400).json({ error: "TOKEN_REQUIRED" });

    // 1) Resolve token string -> token doc (do your hash verify/expiry/revoked/maxUses checks in this helper)
    const t = await verifyTokenString(token);
    if (!t) return res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });

    // 2) Role compatibility
    // FAMILY_TOKEN → requester must be Family or PoA
    // MANAGER_TOKEN → requester must be Admin
    // STAFF_INVITE → requester must be GeneralCareStaff
    const role = req.user.role;
    const type = t.type;
    const allowed =
      (type === "FAMILY_TOKEN" && (role === "Family" || role === "PoA")) ||
      (type === "MANAGER_TOKEN" && role === "Admin") ||
      (type === "STAFF_INVITE" && role === "GeneralCareStaff");
    if (!allowed)
      return res.status(400).json({ error: "ROLE_MISMATCH_FOR_TOKEN" });

    // 3) Organisation compatibility
    if (
      req.user.organizationId &&
      String(req.user.organizationId) !== String(t.organizationId)
    ) {
      return res.status(400).json({ error: "ORG_MISMATCH" });
    }

    if (!t.personIds || t.personIds.length === 0)
      return res.status(400).json({ error: "TOKEN_HAS_NO_PERSON_SCOPE" });

    // 4) Create Pending request (no PersonUserLink yet)
    const ar = await AccessRequest.create({
      requesterId: req.user.id,
      requesterEmail: req.user.email,
      requesterRole: req.user.role,
      tokenId: t._id,
      tokenType: t.type,
      organizationId: t.organizationId,
      personIds: t.personIds,
      issuerId: t.issuerId,
      message,
      status: "Pending",
    });

    res.status(201).json(ar);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/access-requests/incoming  (issuer views requests for their tokens)
router.get("/incoming", requireAuth, async (req, res) => {
  // Issuer is either Family/PoA (for FAMILY_TOKEN/MANAGER_TOKEN) or Admin (for STAFF_INVITE)
  const list = await AccessRequest.find({
    issuerId: req.user.id,
    status: "Pending",
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json(list);
});

// PATCH /api/access-requests/:id/decision  { approve: true|false }
router.patch("/:id/decision", requireAuth, async (req, res) => {
  try {
    const { approve } = req.body || {};
    const ar = await AccessRequest.findById(req.params.id);
    if (!ar) return res.status(404).json({ error: "NOT_FOUND" });
    if (String(ar.issuerId) !== String(req.user.id))
      return res.status(403).json({ error: "NOT_ISSUER" });
    if (ar.status !== "Pending")
      return res.status(400).json({ error: "ALREADY_DECIDED" });

    if (!approve) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.json(ar);
    }

    // Re-check token still valid and not overused
    const t = await Token.findById(ar.tokenId);
    if (!t || t.revoked || t.expiresAt < new Date()) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.status(400).json({ error: "TOKEN_INVALID_NOW", request: ar });
    }
    if (t.uses >= t.maxUses) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.status(400).json({ error: "TOKEN_MAX_USES", request: ar });
    }

    // Approve → create PersonUserLink(s)
    const requester = await User.findById(ar.requesterId);
    if (!requester) return res.status(400).json({ error: "REQUESTER_MISSING" });

    // If requester has no org yet, set it to token org
    if (!requester.organizationId) {
      requester.organizationId = ar.organizationId;
      await requester.save();
    } else if (String(requester.organizationId) !== String(ar.organizationId)) {
      return res.status(400).json({ error: "REQUESTER_ORG_CHANGED" });
    }

    // Relationship type is their role (simple mapping)
    const rel =
      requester.role === "Admin"
        ? "Admin"
        : requester.role === "GeneralCareStaff"
        ? "GeneralCareStaff"
        : requester.role === "PoA"
        ? "PoA"
        : "Family";

    for (const pid of ar.personIds) {
      await PersonUserLink.updateOne(
        { personId: pid, userId: requester._id },
        {
          $setOnInsert: {
            relationshipType: rel,
            active: true,
            startAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // increment token uses
    t.uses += 1;
    await t.save();

    ar.status = "Approved";
    ar.decidedAt = new Date();
    ar.decidedBy = req.user.id;
    await ar.save();

    res.json(ar);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
