import { Router } from "express";
import { requireJwt } from "../middleware/passport.js";
import Token from "../models/Token.js";
import Organization from "../models/Organization.js";
import Person from "../models/PersonWithNeeds.js";
import { randomCode, hashToken } from "../utils/token.js";

const router = Router();

// Create token
// POST /api/tokens  { type, organizationId, personIds?:[], expiresInDays?:7, maxUses?:1, note? }
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

  if (!Array.isArray(personIds) || personIds.length !== 1) {
    return res.status(400).json({ error: "PERSON_ID_REQUIRED" });
  }

  if (String(req.user.organizationId) !== String(organizationId)) {
    return res.status(400).json({ error: "ORG_SCOPE_INVALID" });
  }

  const orgExists = await Organization.exists({ _id: organizationId });
  if (!orgExists)
    return res.status(400).json({ error: "INVALID_ORGANIZATION" });

  if (personIds.length) {
    const count = await Person.countDocuments({
      _id: { $in: personIds },
      organizationId,
    });
    if (count !== personIds.length)
      return res.status(400).json({ error: "PERSONS_SCOPE_INVALID_FOR_ORG" });
  }

  const prefix =
    type === "FAMILY_TOKEN" ? "FAM" : type === "MANAGER_TOKEN" ? "MGR" : "STF";
  const plain = randomCode(prefix);
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + (expiresInDays || 7) * 86400000);

  await Token.create({
    type,
    tokenHash,
    organizationId,
    personIds,
    issuerId: req.user.id,
    note,
    expiresAt,
    maxUses,
  });

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
    organizationId: t.organizationId,
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
  if (String(t.organizationId) !== String(req.user.organizationId))
    return res.status(403).json({ error: "FORBIDDEN" });

  t.revoked = true;
  if (reason) t.note = `[REVOKED] ${reason}`;
  await t.save();

  res.json({ revoked: true });
});

// List tokens (org-scoped)
router.get("/", requireJwt, async (req, res) => {
  const { type, personId } = req.query;
  const filter = { organizationId: req.user.organizationId };
  if (type) filter.type = type;
  if (personId) filter.personIds = personId;
  const tokens = await Token.find(filter)
    .select("-tokenHash")
    .sort({ createdAt: -1 })
    .lean();
  res.json(tokens);
});

export default router;
