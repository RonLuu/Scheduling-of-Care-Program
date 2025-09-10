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
  try {
    const { organizationId, migrateClients } = req.body || {};
    if (!organizationId) return res.status(400).json({ error: "ORG_REQUIRED" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const org = await Organization.findById(organizationId).lean();
    if (!org) return res.status(404).json({ error: "ORG_NOT_FOUND" });

    // Just update user directly if not cascading
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

    // 1) Update requester
    await User.updateOne({ _id: me._id }, { $set: { organizationId } });

    // 2) Find their clients
    const myLinks = await PersonUserLink.find({
      userId: me._id,
      relationshipType: { $in: ["Family", "PoA"] },
      active: true,
    }).lean();
    const personIds = [...new Set(myLinks.map((l) => String(l.personId)))];

    let result = {
      personsMoved: 0,
      itemsMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
      staffRevoked: 0,
    };
    if (personIds.length > 0) {
      const personsRes = await PersonWithNeeds.updateMany(
        { _id: { $in: personIds } },
        { $set: { organizationId } }
      );
      const itemsRes = await CareNeedItem.updateMany(
        { personId: { $in: personIds } },
        { $set: { organizationId } }
      );
      const tasksRes = await CareTask.updateMany(
        { personId: { $in: personIds } },
        { $set: { organizationId } }
      );

      const famLinks = await PersonUserLink.find({
        personId: { $in: personIds },
        relationshipType: { $in: ["Family", "PoA"] },
        active: true,
      }).lean();
      const familyUserIds = [...new Set(famLinks.map((l) => String(l.userId)))];
      const otherFamilyUserIds = familyUserIds.filter(
        (id) => id !== String(me._id)
      );
      if (otherFamilyUserIds.length > 0) {
        const moveRes = await User.updateMany(
          { _id: { $in: otherFamilyUserIds } },
          { $set: { organizationId } }
        );
        result.familyMoved = moveRes.modifiedCount || 0;
      }

      const revokeRes = await PersonUserLink.updateMany(
        {
          personId: { $in: personIds },
          relationshipType: {
            $in: ["GeneralCareStaff", "Admin"],
          },
          active: true,
        },
        { $set: { active: false, endAt: new Date() } }
      );

      result = {
        personsMoved: personsRes.modifiedCount || 0,
        itemsMoved: itemsRes.modifiedCount || 0,
        tasksMoved: tasksRes.modifiedCount || 0,
        familyMoved: result.familyMoved,
        staffRevoked: revokeRes.modifiedCount || 0,
      };
    }

    const freshMe = await User.findById(me._id).lean();
    res.json({
      ok: true,
      user: { id: freshMe._id, organizationId: freshMe.organizationId },
      cascade: result,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
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

    if (!["Admin", "GeneralCareStaff"].includes(me.role)) {
      return res.status(403).json({ error: "ONLY_ADMIN_OR_STAFF" });
    }

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
