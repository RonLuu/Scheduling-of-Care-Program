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
 * If migrateClients = true and the requester is Family/PoA:
 * 1) personIds = all persons directly linked to requester via Family/PoA (active only)
 * 2) familyUserIds = all users with Family/PoA links (active) to any of personIds (include requester)
 * 3) Move those persons, their items & tasks to new org
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

  // Simple self update if not cascading
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
      // 1) Persons directly linked to requester as Family/PoA
      const myLinks = await PersonUserLink.find({
        userId: me._id,
        relationshipType: { $in: ["Family", "PoA"] },
        active: true,
      })
        .select("personId")
        .lean()
        .session(session);

      const personIds = Array.from(
        new Set(myLinks.map((l) => String(l.personId)))
      );

      // Nothing to cascade? Just switch requester org and return.
      if (personIds.length === 0) {
        me.organizationId = organizationId;
        await me.save({ session });
        return;
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
      familyUserIdSet.add(String(me._id)); // ensure requester included
      const familyUserIds = Array.from(familyUserIdSet);

      // 3) Move users (Family/PoA) to new org
      const moveUsersRes = await User.updateMany(
        { _id: { $in: familyUserIds } },
        { $set: { organizationId } },
        { session }
      );

      // 4) Move persons, their items & tasks to new org
      const personsRes = await PersonWithNeeds.updateMany(
        { _id: { $in: personIds } },
        { $set: { organizationId } },
        { session }
      );

      const itemsRes = await CareNeedItem.updateMany(
        { personId: { $in: personIds } },
        { $set: { organizationId } },
        { session }
      );

      const tasksRes = await CareTask.updateMany(
        { personId: { $in: personIds } },
        { $set: { organizationId } },
        { session }
      );

      // 5) Revoke Admin/GeneralCareStaff links for those persons
      const revokeRes = await PersonUserLink.updateMany(
        {
          personId: { $in: personIds },
          relationshipType: { $in: ["GeneralCareStaff", "Admin"] },
          active: true,
        },
        { $set: { active: false, endAt: new Date() } },
        { session }
      );

      // 6) Ensure requester record reflects new org
      me.organizationId = organizationId;
      await me.save({ session });

      result = {
        personsMoved: personsRes.modifiedCount || 0,
        itemsMoved: itemsRes.modifiedCount || 0,
        tasksMoved: tasksRes.modifiedCount || 0,
        // exclude requester when reporting "other family moved"
        familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0),
        staffRevoked: revokeRes.modifiedCount || 0,
      };
    });

    return res.json({
      ok: true,
      user: { id: me._id, organizationId },
      cascade: result,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
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

router.patch("/me", requireAuth, async (req, res) => {
  // whitelist: only allow these fields to be updated by self
  const allowed = ["name", "mobile", "address"];
  const updates = {};
  for (const k of allowed) {
    if (k in req.body) updates[k] = req.body[k];
  }

  try {
    const updated = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to update profile" });
  }
});

export default router;
