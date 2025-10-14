import { Router } from "express";
import { requireJwt } from "../middleware/passport.js";
import Token from "../models/Token.js";
import Organization from "../models/Organization.js";
import Person from "../models/PersonWithNeeds.js";
import { randomCode, hashToken } from "../utils/token.js";

const router = Router();

// Create token
// POST /api/tokens  { type, organizationId?, personIds?:[], expiresInDays?:7, maxUses?:1, note? }
router.post("/", requireJwt, async (req, res) => {
  const {
    type,
    organizationId,
    personIds = [],
    expiresInDays = 7,
    maxUses = 1,
    note,
  } = req.body;

  const role = req.user.role;
  const allowedByRole = {
    Family: ["FAMILY_TOKEN", "MANAGER_TOKEN"],
    PoA: ["FAMILY_TOKEN", "MANAGER_TOKEN"],
    Admin: ["STAFF_TOKEN"],
    GeneralCareStaff: [],
  };

  if (!allowedByRole[role]?.includes(type))
    return res.status(403).json({ error: "FORBIDDEN_FOR_ROLE" });

  // Validate personIds
  if (!Array.isArray(personIds) || personIds.length !== 1) {
    return res.status(400).json({ error: "PERSON_ID_REQUIRED" });
  }

  // organizationId validation logic
  // FAMILY_TOKEN: No org required (can be null)
  // MANAGER_TOKEN: Requires org (Family/PoA sharing with Admin)
  // STAFF_TOKEN: Requires org (Admin sharing with staff)

  if (type === "MANAGER_TOKEN" || type === "STAFF_TOKEN") {
    // These token types require organization
    if (!organizationId) {
      return res.status(400).json({
        error:
          type === "MANAGER_TOKEN"
            ? "ORGANIZATION_REQUIRED_FOR_ADMIN_TOKEN"
            : "ORGANIZATION_REQUIRED_FOR_STAFF_TOKEN",
      });
    }

    // Verify user is in the specified organization
    if (String(req.user.organizationId) !== String(organizationId)) {
      return res.status(400).json({ error: "ORG_SCOPE_INVALID" });
    }

    // Verify organization exists
    const orgExists = await Organization.exists({ _id: organizationId });
    if (!orgExists)
      return res.status(400).json({ error: "INVALID_ORGANIZATION" });
  }

  // Validate person access based on token type
  if (personIds.length) {
    if (organizationId) {
      // If org is provided, verify persons belong to that org
      const count = await Person.countDocuments({
        _id: { $in: personIds },
        organizationId,
      });
      if (count !== personIds.length)
        return res.status(400).json({ error: "PERSONS_SCOPE_INVALID_FOR_ORG" });
    } else {
      // For FAMILY_TOKEN without org, just verify persons exist
      // and that the user has access to them (this should be validated by your person-user-link system)
      const count = await Person.countDocuments({
        _id: { $in: personIds },
      });
      if (count !== personIds.length)
        return res.status(400).json({ error: "PERSON_NOT_FOUND" });
    }
  }

  // Generate token
  const prefix =
    type === "FAMILY_TOKEN" ? "FAM" : type === "MANAGER_TOKEN" ? "MGR" : "STF";
  const plain = randomCode(prefix);
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + (expiresInDays || 7) * 86400000);

  // Create token document
  const tokenData = {
    type,
    tokenHash,
    personIds,
    issuerId: req.user.id,
    note,
    expiresAt,
    maxUses,
  };

  // Only include organizationId if provided
  if (organizationId) {
    tokenData.organizationId = organizationId;
  }

  await Token.create(tokenData);

  res.status(201).json({ token: plain, expiresAt });
});

// Verify token (public)
router.post("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(400).json({ valid: false, error: "TOKEN_REQUIRED" });

  const t = await Token.findOne({ tokenHash: hashToken(token) }).lean();
  if (!t) return res.json({ valid: false });

  const stillValid =
    !t.revoked && t.expiresAt > new Date() && t.uses < t.maxUses;
  const roleMap = {
    FAMILY_TOKEN: "Family",
    MANAGER_TOKEN: "Admin",
    STAFF_TOKEN: "GeneralCareStaff",
  };
  res.json({
    valid: stillValid,
    type: t.type,
    role: roleMap[t.type],
    organizationId: t.organizationId || null,
    personIds: t.personIds,
    expiresAt: t.expiresAt,
    usesRemaining: Math.max(0, t.maxUses - t.uses),
  });
});

// Revoke token
router.post("/revoke", requireJwt, async (req, res) => {
  const { token, reason } = req.body;
  if (!token) return res.status(400).json({ error: "TOKEN_REQUIRED" });

  const t = await Token.findOne({ tokenHash: hashToken(token) });
  if (!t) return res.status(404).json({ error: "TOKEN_NOT_FOUND" });

  // Allow revocation if:
  // 1. Token has an org and user is in that org
  // 2. Token has no org and user is the issuer
  if (t.organizationId) {
    if (String(t.organizationId) !== String(req.user.organizationId))
      return res.status(403).json({ error: "FORBIDDEN" });
  } else {
    if (String(t.issuerId) !== String(req.user.id))
      return res.status(403).json({ error: "FORBIDDEN" });
  }

  t.revoked = true;
  if (reason) t.note = `[REVOKED] ${reason}`;
  await t.save();

  res.json({ revoked: true });
});

// List tokens (org-scoped or user-scoped)
router.get("/", requireJwt, async (req, res) => {
  const { type, personId } = req.query;
  const filter = {};

  // Filter by organization if user has one, or by issuer if not
  if (req.user.organizationId) {
    filter.organizationId = req.user.organizationId;
  } else {
    filter.issuerId = req.user.id;
  }

  if (type) filter.type = type;
  if (personId) filter.personIds = personId;

  const tokens = await Token.find(filter)
    .select("-tokenHash")
    .sort({ createdAt: -1 })
    .lean();
  res.json(tokens);
});

export default router;
