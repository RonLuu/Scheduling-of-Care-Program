// server/routes/users.me.js
import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import CareNeedItem from "../models/CareNeedItem.js";
import CareTask from "../models/CareTask.js";
import PersonUserLink from "../models/PersonUserLink.js";
import mongoose from "mongoose";
const router = Router();

// BFS over Family/PoA ↔ Person graph using active:true only
async function collectClosure(startUserId, session) {
  const visitedFamily = new Set([String(startUserId)]);
  const visitedPersons = new Set();
  let frontierFamily = [String(startUserId)];

  while (frontierFamily.length > 0) {
    // Family/PoA users → persons
    const linksUP = await PersonUserLink.find({
      userId: { $in: frontierFamily },
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
    })
      .select("personId")
      .lean()
      .session(session);

    const newPersonIds = [];
    for (const l of linksUP) {
      const pid = String(l.personId);
      if (!visitedPersons.has(pid)) {
        visitedPersons.add(pid);
        newPersonIds.push(pid);
      }
    }
    if (newPersonIds.length === 0) break;

    // persons → Family/PoA users
    const linksPU = await PersonUserLink.find({
      personId: { $in: newPersonIds },
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
    })
      .select("userId")
      .lean()
      .session(session);

    const nextFrontier = [];
    for (const l of linksPU) {
      const uid = String(l.userId);
      if (!visitedFamily.has(uid)) {
        visitedFamily.add(uid);
        nextFrontier.push(uid);
      }
    }
    frontierFamily = nextFrontier;
  }

  return {
    familyUserIds: Array.from(visitedFamily),
    personIds: Array.from(visitedPersons),
  };
}

/**
 * PATCH /api/users/me/organization
 * Body: { organizationId: string, migrateClients?: boolean }
 *
 * Only Family/PoA can cascade-migrate.
 * - Update requester's org to newOrg
 * - Find all active links where requester is Family/PoA -> personIds
 * - For those persons:
 *   * Update PersonWithNeeds.organizationId = newOrg
 *   * Update CareNeedItem.organizationId = newOrg
 *   * Update CareTask.organizationId = newOrg
 *   * Find all active links with relationshipType in ["Family","PoA"] -> move those users to newOrg
 *   * Revoke (active=false, endAt=now) all non-family/poa links (GeneralCareStaff, Admin)
 */
router.patch("/me/organization", requireAuth, async (req, res) => {
  const { organizationId, migrateClients } = req.body || {};
  if (!organizationId) return res.status(400).json({ error: "ORG_REQUIRED" });

  const me = await User.findById(req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const org = await Organization.findById(organizationId).lean();
  if (!org) return res.status(404).json({ error: "ORG_NOT_FOUND" });

  // Simple update if not cascading
  if (!migrateClients) {
    me.organizationId = organizationId;
    await me.save();
    return res.json({
      ok: true,
      user: { id: me._id, organizationId: me.organizationId },
    });
  }

  if (!["Family", "PoA"].includes(me.role)) {
    return res.status(403).json({ error: "ONLY_FAMILY_POA_CAN_CASCADE" });
  }

  const session = await mongoose.startSession();
  let result = {
    personsMoved: 0,
    itemsMoved: 0,
    tasksMoved: 0,
    familyMoved: 0,
    staffRevoked: 0,
  };

  try {
    await session.withTransaction(async () => {
      const { familyUserIds, personIds } = await collectClosure(
        me._id,
        session
      );

      const moveUsersRes = await User.updateMany(
        { _id: { $in: familyUserIds } },
        { $set: { organizationId } },
        { session }
      );

      const personsRes = personIds.length
        ? await PersonWithNeeds.updateMany(
            { _id: { $in: personIds } },
            { $set: { organizationId } },
            { session }
          )
        : { modifiedCount: 0 };

      const itemsRes = personIds.length
        ? await CareNeedItem.updateMany(
            { personId: { $in: personIds } },
            { $set: { organizationId } },
            { session }
          )
        : { modifiedCount: 0 };

      const tasksRes = personIds.length
        ? await CareTask.updateMany(
            { personId: { $in: personIds } },
            { $set: { organizationId } },
            { session }
          )
        : { modifiedCount: 0 };

      // Revoke Admin/Staff links to ALL discovered persons
      const revokeRes = personIds.length
        ? await PersonUserLink.updateMany(
            {
              personId: { $in: personIds },
              relationshipType: { $in: ["GeneralCareStaff", "Admin"] },
              active: true,
            },
            { $set: { active: false, endAt: new Date() } },
            { session }
          )
        : { modifiedCount: 0 };

      result = {
        personsMoved: personsRes.modifiedCount || 0,
        itemsMoved: itemsRes.modifiedCount || 0,
        tasksMoved: tasksRes.modifiedCount || 0,
        familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0), // exclude requester
        staffRevoked: revokeRes.modifiedCount || 0,
      };
    });

    res.json({
      ok: true,
      user: { id: me._id, organizationId: organizationId },
      cascade: result,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

/**
 * PATCH /api/users/me/leave-organization
 * Lets Admin or GeneralCareStaff leave org if no active clients.
 */
router.patch("/me/leave-organization", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

    // Check for active client links
    const activeLinks = await PersonUserLink.countDocuments({
      userId: me._id,
      active: true,
    });
    if (activeLinks > 0) {
      return res.status(400).json({ error: "HAS_ACTIVE_CLIENTS" });
    }

    // Clear their organisation
    me.organizationId = null;
    await me.save();

    res.json({
      ok: true,
      user: {
        id: me._id,
        name: me.name,
        email: me.email,
        role: me.role,
        organizationId: null,
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
