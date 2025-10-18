// personUserLink.js
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

// POST /api/person-user-links/invite
// Body: { personId, inviteeEmail }
router.post("/invite", requireAuth, async (req, res) => {
  const { personId, inviteeEmail } = req.body;

  if (!personId || !inviteeEmail) {
    return res
      .status(400)
      .json({ error: "Person ID and invitee email are required" });
  }

  const inviterRole = req.user.role;
  const inviterId = req.user.id;
  const inviterOrgId = req.user.organizationId;

  try {
    // 1. Check if inviter is trying to invite themselves
    const normalizedEmail = inviteeEmail.toLowerCase().trim();
    if (normalizedEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    // 2. Fetch the person (client) being shared
    const person = await PersonWithNeeds.findById(personId);
    if (!person) {
      return res.status(404).json({ error: "Client not found" });
    }

    // 3. Check if invitee exists
    const invitee = await User.findOne({ email: normalizedEmail });
    if (!invitee) {
      return res.status(404).json({
        error:
          "User not found. The email address must belong to a registered user in the system.",
      });
    }

    // 4. Check if there's already an active link
    const existingLink = await PersonUserLink.findOne({
      personId: personId,
      userId: invitee._id,
      active: true,
    });

    if (existingLink) {
      return res.status(400).json({
        error: "This user already has access to this client",
      });
    }

    // 5. Validate role-based permissions
    if (inviterRole === "GeneralCareStaff") {
      return res.status(403).json({
        error: "General care staff cannot invite other users",
      });
    }

    // Admin can only invite GeneralCareStaff
    if (inviterRole === "Admin") {
      if (invitee.role !== "GeneralCareStaff") {
        return res.status(403).json({
          error: "Administrators can only invite general care staff members",
        });
      }
    }

    // Family/PoA can invite other Family/PoA or Admin
    if (inviterRole === "Family" || inviterRole === "PoA") {
      if (invitee.role === "GeneralCareStaff") {
        return res.status(403).json({
          error:
            "You cannot directly invite care staff. They must be assigned by an administrator.",
        });
      }
    }

    // 6. Handle organization cascade logic
    let cascadeResult = null;
    const useTransactions = process.env.NODE_ENV === "production";

    // Check for organization mismatches and handle cascades
    if (inviterRole === "Family" || inviterRole === "PoA") {
      // Case 1: Inviter has no org but invitee does
      if (!inviterOrgId && invitee.organizationId) {
        // Move inviter and their clients to invitee's org
        cascadeResult = await handleOrgCascade(
          inviterId,
          invitee.organizationId,
          useTransactions
        );
      }
      // Case 2: Inviter has org but invitee doesn't
      else if (inviterOrgId && !invitee.organizationId) {
        // Move invitee to inviter's org
        invitee.organizationId = inviterOrgId;
        await invitee.save();

        // Also move the person if needed
        if (
          !person.organizationId ||
          String(person.organizationId) !== String(inviterOrgId)
        ) {
          person.organizationId = inviterOrgId;
          await person.save();
        }
      }
      // Case 3: Both have orgs - must match
      else if (inviterOrgId && invitee.organizationId) {
        if (String(inviterOrgId) !== String(invitee.organizationId)) {
          return res.status(400).json({
            error:
              "Organization mismatch. The user you're inviting belongs to a different organization. Please ensure they're in the same organization or contact support.",
          });
        }
      }
    }

    // For Admin inviting staff
    if (inviterRole === "Admin") {
      if (!inviterOrgId) {
        return res.status(400).json({
          error: "You must be part of an organization to invite staff members",
        });
      }

      if (!invitee.organizationId) {
        // Automatically add staff to admin's org
        invitee.organizationId = inviterOrgId;
        await invitee.save();
      } else if (String(invitee.organizationId) !== String(inviterOrgId)) {
        return res.status(400).json({
          error: "This staff member belongs to a different organization",
        });
      }
    }

    // 7. Create or reactivate the link
    let link = await PersonUserLink.findOne({
      personId: personId,
      userId: invitee._id,
    });

    if (link) {
      // Reactivate existing inactive link
      link.active = true;
      link.startAt = new Date();
      link.endAt = null;
      link.relationshipType = invitee.role;
      await link.save();
    } else {
      // Create new link
      link = await PersonUserLink.create({
        personId: personId,
        userId: invitee._id,
        relationshipType: invitee.role,
        active: true,
        startAt: new Date(),
      });
    }

    // 8. Prepare success message
    let message = `Successfully granted ${
      invitee.name || invitee.email
    } access to ${person.name}`;

    if (cascadeResult) {
      message += `. Organization update: ${cascadeResult.personsMoved} clients and ${cascadeResult.familyMoved} family members moved to the organization.`;
    }

    return res.json({
      ok: true,
      message: message,
      link: {
        id: link._id,
        personId: link.personId,
        userId: link.userId,
        active: link.active,
      },
      cascade: cascadeResult,
    });
  } catch (error) {
    console.error("Invite error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the invite. Please try again.",
    });
  }
});

// Helper function for organization cascade (reuse from users.me.js)
async function handleOrgCascade(userId, targetOrgId, useTransactions) {
  const User = (await import("../models/User.js")).default;
  const PersonWithNeeds = (await import("../models/PersonWithNeeds.js"))
    .default;
  const PersonUserLink = (await import("../models/PersonUserLink.js")).default;
  const BudgetPlan = (await import("../models/BudgetPlan.js")).default;
  const CareTask = (await import("../models/CareTask.js")).default;

  let result = {
    personsMoved: 0,
    budgetPlansMoved: 0,
    tasksMoved: 0,
    familyMoved: 0,
    staffRevoked: 0,
  };

  const performCascade = async (session) => {
    const me = await User.findById(userId).session(session);

    // Find persons linked to the user
    const myLinks = await PersonUserLink.find({
      userId: userId,
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
    })
      .select("personId")
      .lean()
      .session(session);

    const personIds = Array.from(
      new Set(myLinks.map((l) => String(l.personId)))
    );

    if (personIds.length === 0) {
      me.organizationId = targetOrgId;
      await me.save({ session });
      return result;
    }

    // Find all family/PoA users for these persons
    const famLinks = await PersonUserLink.find({
      personId: { $in: personIds },
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
    })
      .select("userId")
      .lean()
      .session(session);

    const familyUserIdSet = new Set(famLinks.map((l) => String(l.userId)));
    familyUserIdSet.add(String(userId));
    const familyUserIds = Array.from(familyUserIdSet);

    // Move users to new org
    const moveUsersRes = await User.updateMany(
      { _id: { $in: familyUserIds } },
      { $set: { organizationId: targetOrgId } },
      { session }
    );

    // Move persons to new org
    const personsRes = await PersonWithNeeds.updateMany(
      { _id: { $in: personIds } },
      { $set: { organizationId: targetOrgId } },
      { session }
    );

    // Move budget plans
    const budgetPlansRes = await BudgetPlan.updateMany(
      { personId: { $in: personIds } },
      { $set: { organizationId: targetOrgId } },
      { session }
    );

    // Move tasks
    const tasksRes = await CareTask.updateMany(
      { personId: { $in: personIds } },
      { $set: { organizationId: targetOrgId } },
      { session }
    );

    // Revoke Admin/Staff links if moving to a new org
    const revokeRes = await PersonUserLink.updateMany(
      {
        personId: { $in: personIds },
        relationshipType: { $in: ["GeneralCareStaff", "Admin"] },
        active: true,
      },
      { $set: { active: false, endAt: new Date() } },
      { session }
    );

    return {
      personsMoved: personsRes.modifiedCount || 0,
      budgetPlansMoved: budgetPlansRes.modifiedCount || 0,
      tasksMoved: tasksRes.modifiedCount || 0,
      familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0),
      staffRevoked: revokeRes.modifiedCount || 0,
    };
  };

  if (useTransactions) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        result = await performCascade(session);
      });
    } finally {
      session.endSession();
    }
  } else {
    result = await performCascade(null);
  }

  return result;
}

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
