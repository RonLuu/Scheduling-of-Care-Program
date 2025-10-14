import { Router } from "express";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import PersonUserLink from "../models/PersonUserLink.js";
import { requireAuth } from "../middleware/authz.js";
import mongoose from "mongoose";

const router = Router();

router.route("/").get(getLinks).post(postLink);

async function getLinks(req, res) {
  const { personId, userId, active } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (userId) filter.userId = userId;
  if (active === "true") filter.active = true;
  else if (active === "false") filter.active = false;
  else filter.active = true;

  const links = await PersonUserLink.find(filter).lean();
  res.json(links);
}

async function postLink(req, res) {
  const { personId, userId, relationshipType, active = true } = req.body;

  // Fetch both and enforce org-invariant
  const [person, user] = await Promise.all([
    PersonWithNeeds.findById(personId),
    User.findById(userId),
  ]);
  if (!person || !user)
    return res.status(400).json({ error: "Person or User not found" });

  if (
    user.organizationId &&
    String(person.organizationId) !== String(user.organizationId)
  ) {
    return res.status(400).json({
      error: "ORG_MISMATCH: user and person must be in the same organization",
    });
  }

  const link = await PersonUserLink.create({
    personId,
    userId,
    relationshipType,
    active,
    startAt: new Date(),
  });
  res.status(201).json(link);
}

async function getLink(req, res) {
  const link = await PersonUserLink.findById(req.params.linkId).lean();
  if (!link) return res.status(404).json({ error: "Link not found" });
  res.json(link);
}

async function putLink(req, res) {
  const patch = { ...req.body };

  // If toggling to active=true or changing user/person, re-check org invariant
  const current = await PersonUserLink.findById(req.params.linkId);
  if (!current) return res.status(404).json({ error: "Link not found" });

  const personId = patch.personId || current.personId;
  const userId = patch.userId || current.userId;
  const makeActive = patch.active ?? current.active;

  if (makeActive) {
    const [person, user] = await Promise.all([
      PersonWithNeeds.findById(personId),
      User.findById(userId),
    ]);
    if (!person || !user)
      return res.status(400).json({ error: "Person or User not found" });
    if (String(person.organizationId) !== String(user.organizationId)) {
      return res.status(400).json({
        error: "ORG_MISMATCH: user and person must be in the same organization",
      });
    }
  }

  const link = await PersonUserLink.findByIdAndUpdate(
    req.params.linkId,
    patch,
    { new: true, runValidators: true }
  );
  res.json(link);
}

async function deleteLink(req, res) {
  await PersonUserLink.deleteOne({ _id: req.params.linkId });
  res.json({ message: "Link deleted" });
}

router.get("/by-person/:personId", requireAuth, async (req, res) => {
  try {
    const links = await PersonUserLink.find({
      personId: req.params.personId,
      active: true,
    })
      .populate("userId", "name email role organizationId")
      .lean();
    res.json(links);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/person-user-links/:id/revoke
router.patch("/:id/revoke", requireAuth, async (req, res) => {
  try {
    const link = await PersonUserLink.findById(req.params.id);
    if (!link) return res.status(404).json({ error: "LINK_NOT_FOUND" });
    if (!link.active) return res.status(400).json({ error: "ALREADY_REVOKED" });

    const requesterRole = req.user.role;
    const now = new Date();

    // Security: Admins can only revoke staff
    if (
      requesterRole === "Admin" &&
      link.relationshipType !== "GeneralCareStaff"
    ) {
      return res.status(403).json({ error: "ADMIN_CAN_ONLY_REVOKE_STAFF" });
    }

    // If Family/PoA revokes an Admin, also revoke ALL staff for this person (client).
    if (
      (requesterRole === "Family" || requesterRole === "PoA") &&
      link.relationshipType === "Admin"
    ) {
      // Check if we can use transactions
      const useTransactions = process.env.NODE_ENV === "production";
      let staffRes = { modifiedCount: 0 };

      if (useTransactions) {
        // Use transactions in production
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            staffRes = await performAdminRevocation(link, now, session);
          });
        } finally {
          session.endSession();
        }
      } else {
        // No transactions in development
        console.log("[DEV] Revoking admin and staff without transactions");
        staffRes = await performAdminRevocation(link, now, null);
      }

      return res.json({
        ok: true,
        revokedId: link._id,
        cascade: { staffRevoked: staffRes.modifiedCount || 0 },
      });
    }

    // Default: simple revoke of the one link
    link.active = false;
    link.endAt = now;
    await link.save();

    res.json({ ok: true, revokedId: link._id });
  } catch (e) {
    console.error("Revoke link error:", e);
    res.status(400).json({ error: e.message });
  }
});

// Helper function for revoking admin and cascading to staff
async function performAdminRevocation(link, now, session) {
  // Revoke targeted admin link
  await PersonUserLink.updateOne(
    { _id: link._id, active: true },
    { $set: { active: false, endAt: now } },
    { session }
  );

  // Revoke all GeneralCareStaff for this person (do NOT touch other admins)
  const staffRes = await PersonUserLink.updateMany(
    {
      personId: link.personId,
      relationshipType: "GeneralCareStaff",
      active: true,
    },
    { $set: { active: false, endAt: now } },
    { session }
  );

  return staffRes;
}

// GET /api/person-user-links/assignable-users?personId=...
// Returns [{ userId, name, email, role }]
router.get("/assignable-users", requireAuth, async (req, res) => {
  try {
    const { personId } = req.query;
    if (!personId) return res.status(400).json({ error: "MISSING_PERSON_ID" });

    // Pull active links for this person, then populate user
    const links = await PersonUserLink.find({
      personId,
      active: true,
      relationshipType: { $in: ["Admin", "GeneralCareStaff"] }, // Admin/Staff
    })
      .populate("userId", "name email role organizationId")
      .lean();

    // Optional org guard: user viewing must be in same org as the person
    const person = await PersonWithNeeds.findById(personId).select(
      "organizationId"
    );
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const out = links
      .map((l) => l.userId)
      .filter(Boolean)
      .filter((u) => u.role === "Admin" || u.role === "GeneralCareStaff")
      .map((u) => ({
        userId: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
      }));

    // de-dup by userId
    const byId = {};
    for (const u of out) byId[u.userId] = u;
    res.json(Object.values(byId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.route("/:linkId").get(getLink).put(putLink).delete(deleteLink);

export default router;
