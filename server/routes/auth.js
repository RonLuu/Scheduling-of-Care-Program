import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireJwt, requireLocal } from "../middleware/passport.js";
import User from "../models/User.js";

const router = Router();

// POST /api/auth/register { name, email, password, role }
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "MISSING_FIELDS" });
    if (!["GeneralCareStaff", "Family", "PoA", "Admin"].includes(role))
      return res.status(400).json({ error: "INVALID_ROLE" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "EMAIL_EXISTS" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });

    // const jwt = signSession(user);
    const jwtToken = jwt.sign(
      { sub: user._id, role: user.role, org: user.organizationId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId || null,
      },
      session: { jwt: jwtToken, expiresIn: 3600 },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/auth/login { email, password }
router.post("/login", requireLocal, (req, res) => {
  const u = req.user;
  const jwtToken = jwt.sign(
    { sub: u._id, role: u.role, org: u.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({
    session: { jwt: jwtToken, expiresIn: 3600 },
    user: {
      id: u._id,
      role: u.role,
      organizationId: u.organizationId,
      email: u.email,
      name: u.name,
    },
  });
});

// GET /api/auth/me
router.get("/me", requireJwt, async (req, res) => {
  const userId = req.user.id || req.user._id || req.user.sub;
  const user = await User.findById(userId)
    .select("name email role organizationId mobile address")
    .lean();
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  res.json({ user }); // <-- wrapped
});

export default router;
