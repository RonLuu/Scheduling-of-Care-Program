// routes/accessRequest.js
import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/authz.js";
import Token from "../models/Token.js";
import AccessRequest from "../models/AccessRequest.js";
import PersonUserLink from "../models/PersonUserLink.js";
import User from "../models/User.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import BudgetPlan from "../models/BudgetPlan.js";
import CareTask from "../models/CareTask.js";
import { verifyTokenString } from "../utils/token.js";

const router = Router();

// POST /api/access-requests  { token, message? }
router.post("/", requireAuth, async (req, res) => {
  try {
    const { token, message } = req.body || {};
    if (!token) return res.status(400).json({ error: "TOKEN_REQUIRED" });

    // 1) Resolve token string -> token doc
    const t = await verifyTokenString(token);
    if (!t) return res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });

    // 2) Role compatibility
    const role = req.user.role;
    const type = t.type;
    const allowed =
      (type === "FAMILY_TOKEN" && (role === "Family" || role === "PoA")) ||
      (type === "MANAGER_TOKEN" && role === "Admin") ||
      (type === "STAFF_TOKEN" && role === "GeneralCareStaff");
    if (!allowed)
      return res.status(400).json({ error: "ROLE_MISMATCH_FOR_TOKEN" });

    // 3) Organisation compatibility
    if (
      req.user.organizationId &&
      t.organizationId &&
      String(req.user.organizationId) !== String(t.organizationId)
    ) {
      return res
        .status(400)
        .json({ error: "ORG_MISMATCH (USERS MUST BE IN THE SAME ORG)" });
    }

    if (!t.personIds || t.personIds.length === 0)
      return res.status(400).json({ error: "TOKEN_HAS_NO_PERSON_SCOPE" });

    if (String(t.issuerId) === String(req.user.id)) {
      return res.status(400).json({ error: "CANNOT_REQUEST_WITH_OWN_TOKEN" });
    }

    // Prevent duplicate request for same token
    const existingReq = await AccessRequest.findOne({
      requesterId: req.user.id,
      tokenId: t._id,
      status: { $in: ["Pending", "Approved"] },
    });

    if (existingReq) {
      return res.status(400).json({ error: "ALREADY_REQUESTED_THIS_TOKEN" });
    }

    // Prevent if user already has active link with any client in token scope
    const hasActiveLink = await PersonUserLink.exists({
      userId: req.user.id,
      personId: { $in: t.personIds },
      active: true,
    });
    if (hasActiveLink) {
      return res
        .status(400)
        .json({ error: "ALREADY_HAS_ACTIVE_ACCESS_FOR_CLIENT" });
    }

    if (t.uses >= t.maxUses) {
      return res.status(400).json({ error: "TOKEN_MAX_USES" });
    }

    t.uses += 1;
    await t.save();

    // 4) Create Pending request
    const ar = await AccessRequest.create({
      requesterId: req.user.id,
      requesterEmail: req.user.email,
      requesterRole: req.user.role,
      tokenId: t._id,
      tokenType: t.type,
      organizationId: t.organizationId,
      personIds: t.personIds,
      issuerId: t.issuerId,
      message,
      status: "Pending",
    });

    res.status(201).json(ar);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/access-requests/incoming
router.get("/incoming", requireAuth, async (req, res) => {
  const list = await AccessRequest.find({
    issuerId: req.user.id,
    status: "Pending",
  })
    .populate("requesterId", "name email")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const transformedList = list.map((request) => ({
    ...request,
    requesterName: request.requesterId?.name,
    organizationName: request.organizationId?.name,
  }));

  res.json(transformedList);
});

// PATCH /api/access-requests/:id/decision  { approve: true|false }
router.patch("/:id/decision", requireAuth, async (req, res) => {
  try {
    const { approve } = req.body || {};
    const ar = await AccessRequest.findById(req.params.id);
    if (!ar) return res.status(404).json({ error: "NOT_FOUND" });
    if (String(ar.issuerId) !== String(req.user.id))
      return res.status(403).json({ error: "NOT_ISSUER" });
    if (ar.status !== "Pending")
      return res.status(400).json({ error: "ALREADY_DECIDED" });

    const t = await Token.findById(ar.tokenId);

    if (!approve) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.json(ar);
    }

    // Re-check token validity
    if (!t || t.revoked || t.expiresAt < new Date()) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.status(400).json({ error: "TOKEN_INVALID_NOW", request: ar });
    }
    if (t.uses > t.maxUses) {
      ar.status = "Rejected";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();
      return res.status(400).json({ error: "TOKEN_MAX_USES", request: ar });
    }

    // Approve → create PersonUserLink(s) and handle organization cascade
    const requester = await User.findById(ar.requesterId);
    if (!requester) return res.status(400).json({ error: "REQUESTER_MISSING" });

    const useTransactions = process.env.NODE_ENV === "production";
    let result = {
      personsMoved: 0,
      budgetPlansMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
    };

    try {
      if (useTransactions) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            result = await approveAccessRequest(requester, ar, t, session);
          });
        } finally {
          session.endSession();
        }
      } else {
        console.log("[DEV] Running approval without transactions");
        result = await approveAccessRequest(requester, ar, t, null);
      }

      ar.status = "Approved";
      ar.decidedAt = new Date();
      ar.decidedBy = req.user.id;
      await ar.save();

      res.json({ ...ar.toObject(), cascade: result });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Helper function to approve access request and handle organization cascade
async function approveAccessRequest(requester, ar, token, session) {
  const isFirstTimeJoining = !requester.organizationId;
  const isFamilyOrPoA = ["Family", "PoA"].includes(requester.role);
  const tokenHasOrg = !!ar.organizationId;

  // Relationship type mapping
  const rel =
    requester.role === "Admin"
      ? "Admin"
      : requester.role === "GeneralCareStaff"
      ? "GeneralCareStaff"
      : requester.role === "PoA"
      ? "PoA"
      : "Family";

  // Create PersonUserLinks for the token's persons
  for (const pid of ar.personIds) {
    const existing = await PersonUserLink.findOne({
      personId: pid,
      userId: requester._id,
    }).session(session);

    if (!existing) {
      await PersonUserLink.create(
        [
          {
            personId: pid,
            userId: requester._id,
            relationshipType: rel,
            active: true,
            startAt: new Date(),
          },
        ],
        { session }
      );
    } else if (!existing.active) {
      existing.active = true;
      existing.endAt = undefined;
      existing.relationshipType = rel;
      if (!existing.startAt) existing.startAt = new Date();
      await existing.save({ session });
    } else {
      if (existing.relationshipType !== rel) {
        existing.relationshipType = rel;
        await existing.save({ session });
      }
    }
  }

  // If requester is Family/PoA joining for the first time and token has org
  // Cascade organization assignment to all their clients and related family
  if (isFirstTimeJoining && isFamilyOrPoA && tokenHasOrg) {
    return await cascadeOrganizationAssignment(
      requester,
      ar.organizationId,
      session
    );
  }

  // Simple case: just update requester's organization
  if (isFirstTimeJoining && tokenHasOrg) {
    requester.organizationId = ar.organizationId;
    await requester.save({ session });
  } else if (
    requester.organizationId &&
    String(requester.organizationId) !== String(ar.organizationId)
  ) {
    return { error: "REQUESTER_ORG_CHANGED" };
  }

  return {
    personsMoved: 0,
    budgetPlansMoved: 0,
    tasksMoved: 0,
    familyMoved: 0,
  };
}

// Cascade organization assignment for Family/PoA first-time joiners
async function cascadeOrganizationAssignment(
  requester,
  organizationId,
  session
) {
  // 1) Find all persons linked to requester as Family/PoA
  const myLinks = await PersonUserLink.find({
    userId: requester._id,
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("personId")
    .lean()
    .session(session);

  const personIds = Array.from(new Set(myLinks.map((l) => String(l.personId))));

  // If no persons linked, just update requester
  if (personIds.length === 0) {
    requester.organizationId = organizationId;
    await requester.save({ session });
    return {
      personsMoved: 0,
      budgetPlansMoved: 0,
      tasksMoved: 0,
      familyMoved: 0,
    };
  }

  // 2) Find all Family/PoA users linked to those persons
  const famLinks = await PersonUserLink.find({
    personId: { $in: personIds },
    relationshipType: { $in: ["Family", "PoA"] },
    active: true,
  })
    .select("userId")
    .lean()
    .session(session);

  const familyUserIdSet = new Set(famLinks.map((l) => String(l.userId)));
  familyUserIdSet.add(String(requester._id));
  const familyUserIds = Array.from(familyUserIdSet);

  // 3) Move all Family/PoA users to new org
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

  // 7) Update requester record
  requester.organizationId = organizationId;
  await requester.save({ session });

  return {
    personsMoved: personsRes.modifiedCount || 0,
    budgetPlansMoved: budgetPlansRes.modifiedCount || 0,
    tasksMoved: tasksRes.modifiedCount || 0,
    familyMoved: Math.max((moveUsersRes.modifiedCount || 0) - 1, 0),
  };
}

export default router;
