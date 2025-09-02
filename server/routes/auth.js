import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireJwt, requireLocal } from "../middleware/passport.js";
import Token from "../models/Token.js";
import User from "../models/User.js";
import Person from "../models/PersonWithNeeds.js";
import PersonUserLink from "../models/PersonUserLink.js";
import { TYPE_TO_ROLE, hashToken } from "../utils/token.js";

const router = Router();

// POST /api/auth/register { token, email, password, name }
router.post("/register", async (req, res) => {
  const { token, email, password, name } = req.body;
  if (!token || !email || !password || !name) return res.status(400).json({ error: "MISSING_FIELDS" });

  const t = await Token.findOne({ tokenHash: hashToken(token) });
  if (!t || t.revoked || t.expiresAt <= new Date() || t.uses >= t.maxUses) {
    return res.status(400).json({ error: "TOKEN_INVALID" });
  }

  const role = TYPE_TO_ROLE[t.type];
  if (!role) return res.status(400).json({ error: "TOKEN_TYPE_UNSUPPORTED" });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ error: "EMAIL_TAKEN" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    organizationId: t.organizationId,
    role,
    isActive: true
  });

  if (t.personIds?.length) {
    const persons = await Person.find({ _id: { $in: t.personIds } }, "organizationId");
    if (persons.some(p => String(p.organizationId) !== String(t.organizationId))) {
      return res.status(400).json({ error: "PERSON_SCOPE_ORG_MISMATCH" });
    }
    const relationshipType =
      t.type === "FAMILY_TOKEN"  ? "Family" :
      t.type === "MANAGER_TOKEN" ? "PrimaryManager" :
                                    "AssignedStaff";
    await PersonUserLink.insertMany(persons.map(p => ({
      personId: p._id,
      userId: user._id,
      relationshipType,
      active: true,
      startAt: new Date()
    })));
  }
  else {
    return res.status(400).json({ error: "PERSON_IDS_REQUIRED" });
  }

  await Token.updateOne({ _id: t._id }, { $inc: { uses: 1 } });

  const jwtToken = jwt.sign({ sub: user._id, role: user.role, org: user.organizationId }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.status(201).json({
    session: { jwt: jwtToken, expiresIn: 3600 },
    user: { id: user._id, role: user.role, organizationId: user.organizationId, email: user.email, name: user.name }
  });
});

router.post("/register-family", async (req, res) => {
  const { name, email, password, organizationId } = req.body;
  if (!name || !email || !password || !organizationId) {
    return res.status(400).json({ error: "MISSING_FIELDS" });
  }

  const orgId = String(organizationId);
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ error: "EMAIL_TAKEN" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    organizationId: orgId,
    role: "Family",
    isActive: true
  });

  const jwtToken = jwt.sign({ sub: user._id, role: user.role, org: user.organizationId }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.status(201).json({
    session: { jwt: jwtToken, expiresIn: 3600 },
    user: { id: user._id, role: user.role, organizationId: user.organizationId, email: user.email, name: user.name }
  });
});

// POST /api/auth/login { email, password }
router.post("/login", requireLocal, (req, res) => {
  const u = req.user;
  const jwtToken = jwt.sign({ sub: u._id, role: u.role, org: u.organizationId }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({
    session: { jwt: jwtToken, expiresIn: 3600 },
    user: { id: u._id, role: u.role, organizationId: u.organizationId, email: u.email, name: u.name }
  });
});

// GET /api/auth/me
router.get("/me", requireJwt, (req, res) => res.json({ user: req.user }));

export default router;