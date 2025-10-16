// server/routes/users.me.js
import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import BudgetPlan from "../models/BudgetPlan.js";
import CareTask from "../models/CareTask.js";
import PersonUserLink from "../models/PersonUserLink.js";
import mongoose from "mongoose";
const router = Router();

/**
 * PATCH /api/users/me/organization
 * Body: { organizationId: string, migrateClients?: boolean }
 *
 * If migrateClients = true and the requester is Family/PoA:
 * 1) personIds = all persons directly linked to requester via Family/PoA (active only)
 * 2) familyUserIds = all users with Family/PoA links (active) to any of personIds (include requester)
 * 3) Move those persons, their budget plan, & tasks to new org
 * 4) Move those Family/PoA users to new org
 * 5) Revoke Admin/GeneralCareStaff links for those persons (active=false, endAt=now)
 */
router.patch("/me/organization", requireAuth, async (req, res) => {
  const { organizationId, migrateClients } = req.body || {};
  if (!organizationId) return res.status(400).json({ error: "ORG_REQUIRED" });

  const me = await User.findById(req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const org = await Organization.findById(organizationId).lean();
  if (!org) return res.status(404).json({ error: "ORG_NOT_FOUND" });

  const isFirstTimeJoining = !me.organizationId;
  const isSwitchingOrgs =
    me.organizationId && String(me.organizationId) !== String(organizationId);

  // Simple self update if not cascading
  if (!migrateClients) {
    if (
      isSwitchingOrgs &&
      (me.role === "Admin" || me.role === "GeneralCareStaff")
    ) {
      await PersonUserLink.updateMany(
        { userId: me._id, active: true },
        { $set: { active: false, endAt: new Date() } }
      );
    }

    me.organizationId = organizationId;
    await me.save();
    return res.json({
      ok: true,
      user: { id: me._id, organizationId: me.organizationId },
      isFirstTimeJoining,
      isSwitchingOrgs,
    });
  }

  if (!["Family", "PoA"].includes(me.role)) {
    return res.status(403).json({ error: "ONLY_FAMILY_POA_CAN_CASCADE" });
  }

  let result = {
    personsMoved: 0,
    budgetPlansMoved: 0,
    tasksMoved: 0,
    familyMoved: 0,
    staffRevoked: 0,
  };

  // ✅ Check if we can use transactions (replica set available)
  const useTransactions = process.env.NODE_ENV === "production";

  try {
    if (useTransactions) {
      // Use transactions in production
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await performMigration(
            me,
            organizationId,
            isFirstTimeJoining,
            isSwitchingOrgs,
            session
          );
        });
      } finally {
        session.endSession();
      }
    } else {
      // No transactions in development
      console.log("[DEV] Running migration without transactions");
      result = await performMigration(
        me,
        organizationId,
        isFirstTimeJoining,
        isSwitchingOrgs,
        null
      );
    }

    return res.json({
      ok: true,
      user: { id: me._id, organizationId },
      cascade: result,
      isFirstTimeJoining,
      isSwitchingOrgs,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// ✅ Extract migration logic into a helper function
async function performMigration(
  me,
  organizationId,
  isFirstTimeJoining,
  isSwitchingOrgs,
  session
) {
  // 1) Persons directly linked to requester as Family/PoA
  const myLinks = await PersonUserLink.find({
    userId: me._id,
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("personId")
    .lean()
    .session(session);

  const personIds = Array.from(new Set(myLinks.map((l) => String(l.personId))));

  // Nothing to cascade? Just switch requester org and return.
  if (personIds.length === 0) {
    me.organizationId = organizationId;
    await me.save({ session });
    return {
      personsMoved: 0,
      budgetPlansMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
      staffRevoked: 0,
    };
  }

  // VALIDATION: Check if any persons have conflicting Family/PoA in different orgs
  if (isSwitchingOrgs) {
    const conflictingLinks = await PersonUserLink.find({
      personId: { $in: personIds },
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
      userId: { $ne: me._id },
    })
      .populate("userId", "organizationId")
      .lean()
      .session(session);

    const hasConflicts = conflictingLinks.some(
      (link) =>
        link.userId?.organizationId &&
        String(link.userId.organizationId) !== String(organizationId) &&
        String(link.userId.organizationId) !== String(me.organizationId)
    );

    if (hasConflicts) {
      throw new Error(
        "Cannot switch: Some clients have family members in other organisations. " +
          "Please resolve these conflicts first."
      );
    }
  }

  // 2) Family/PoA users directly linked to those persons (include requester)
  const famLinks = await PersonUserLink.find({
    personId: { $in: personIds },
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("userId")
    .lean()
    .session(session);

  const familyUserIdSet = new Set(famLinks.map((l) => String(l.userId)));
  familyUserIdSet.add(String(me._id));
  const familyUserIds = Array.from(familyUserIdSet);

  // 3) Move users (Family/PoA) to new org
  const moveUsersRes = await User.updateMany(
    { _id: { $in: familyUserIds } },
    { $set: { organizationId } },
    { session }
  );

  // 4) Move persons to new org
  const personsRes = await PersonWithNeeds.updateMany(
    { _id: { $in: personIds } },
    { $set: { organizationId } },
    { session }
  );

  // 5) Move budget plans to new org
  const budgetPlansRes = await BudgetPlan.updateMany(
    { personId: { $in: personIds } },
    { $set: { organizationId } },
    { session }
  );

  // 6) Move tasks to new org
  const tasksRes = await CareTask.updateMany(
    { personId: { $in: personIds } },
    { $set: { organizationId } },
    { session }
  );

  // 7) Revoke Admin/GeneralCareStaff links
  const revokeRes = await PersonUserLink.updateMany(
    {
      personId: { $in: personIds },
      relationshipType: { $in: ["GeneralCareStaff", "Admin"] },
      active: true,
    },
    { $set: { active: false, endAt: new Date() } },
    { session }
  );

  // 8) Ensure requester record reflects new org
  me.organizationId = organizationId;
  await me.save({ session });

  return {
    personsMoved: personsRes.modifiedCount || 0,
    budgetPlansMoved: budgetPlansRes.modifiedCount || 0,
    tasksMoved: tasksRes.modifiedCount || 0,
    familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0),
    staffRevoked: revokeRes.modifiedCount || 0,
  };
}

/**
 * PATCH /api/users/me/leave-organization
 * Allows users to leave their organization.
 * - Family/PoA: Takes their clients with them (sets org to null for clients, budget plans, tasks)
 * - Admin/Staff: Just revokes their access to clients and leaves
 */
router.patch("/me/leave-organization", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

    if (!me.organizationId) {
      return res.status(400).json({ error: "NOT_IN_ORGANIZATION" });
    }

    let result = {
      personsMoved: 0,
      budgetPlansMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
      staffRevoked: 0,
      linksRevoked: 0,
    };

    // Check if we can use transactions
    const useTransactions = process.env.NODE_ENV === "production";

    if (me.role === "Family" || me.role === "PoA") {
      // Family/PoA: Take clients with them (migrate to null org)
      if (useTransactions) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            result = await performLeaveWithClients(me, session);
          });
        } finally {
          session.endSession();
        }
      } else {
        console.log("[DEV] Running leave organization without transactions");
        result = await performLeaveWithClients(me, null);
      }

      return res.json({
        ok: true,
        user: {
          id: me._id,
          name: me.name,
          email: me.email,
          role: me.role,
          organizationId: null,
        },
        cascade: result,
        userType: "family_poa",
      });
    } else {
      // Admin/Staff: Just revoke their links and leave
      const revokeRes = await PersonUserLink.updateMany(
        { userId: me._id, active: true },
        { $set: { active: false, endAt: new Date() } }
      );

      me.organizationId = null;
      await me.save();

      return res.json({
        ok: true,
        user: {
          id: me._id,
          name: me.name,
          email: me.email,
          role: me.role,
          organizationId: null,
        },
        cascade: {
          linksRevoked: revokeRes.modifiedCount || 0,
        },
        userType: "admin_staff",
      });
    }
  } catch (e) {
    console.error("Leave organization error:", e);
    res.status(400).json({ error: e.message });
  }
});

// Helper function for Family/PoA leaving with clients
async function performLeaveWithClients(me, session) {
  // 1) Find all persons linked to this user as Family/PoA
  const myLinks = await PersonUserLink.find({
    userId: me._id,
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("personId")
    .lean()
    .session(session);

  const personIds = Array.from(new Set(myLinks.map((l) => String(l.personId))));

  // If no clients, just leave
  if (personIds.length === 0) {
    me.organizationId = null;
    await me.save({ session });
    return {
      personsMoved: 0,
      budgetPlansMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
      staffRevoked: 0,
      linksRevoked: 0,
    };
  }

  // 2) Find all Family/PoA users for these persons
  const famLinks = await PersonUserLink.find({
    personId: { $in: personIds },
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("userId")
    .lean()
    .session(session);

  const familyUserIdSet = new Set(famLinks.map((l) => String(l.userId)));
  familyUserIdSet.add(String(me._id)); // ensure requester included
  const familyUserIds = Array.from(familyUserIdSet);

  // 3) Set organizationId to null for all Family/PoA users
  const moveUsersRes = await User.updateMany(
    { _id: { $in: familyUserIds } },
    { $set: { organizationId: null } },
    { session }
  );

  // 4) Set organizationId to null for persons
  const personsRes = await PersonWithNeeds.updateMany(
    { _id: { $in: personIds } },
    { $set: { organizationId: null } },
    { session }
  );

  // 5) Set organizationId to null for budget plans
  const budgetPlansRes = await BudgetPlan.updateMany(
    { personId: { $in: personIds } },
    { $set: { organizationId: null } },
    { session }
  );

  // 6) Set organizationId to null for tasks
  const tasksRes = await CareTask.updateMany(
    { personId: { $in: personIds } },
    { $set: { organizationId: null } },
    { session }
  );

  // 7) Revoke Admin/Staff access to these persons
  const revokeRes = await PersonUserLink.updateMany(
    {
      personId: { $in: personIds },
      relationshipType: { $in: ["GeneralCareStaff", "Admin"] },
      active: true,
    },
    { $set: { active: false, endAt: new Date() } },
    { session }
  );

  // 8) Ensure requester has no org
  me.organizationId = null;
  await me.save({ session });

  return {
    personsMoved: personsRes.modifiedCount || 0,
    budgetPlansMoved: budgetPlansRes.modifiedCount || 0,
    tasksMoved: tasksRes.modifiedCount || 0,
    familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0),
    staffRevoked: revokeRes.modifiedCount || 0,
    linksRevoked: 0,
  };
}

// PATCH /api/users/me - update profile
router.patch("/me", requireAuth, async (req, res) => {
  // whitelist: only allow these fields to be updated by self
  const allowed = ["name", "mobile", "address", "title"];
  const updates = {};
  for (const k of allowed) {
    if (k in req.body) updates[k] = req.body[k];
  }

  try {
    const updated = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("avatarFileId")
      .lean();

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to update profile" });
  }
});

// GET /api/users/me - should populate avatar
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("avatarFileId")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
