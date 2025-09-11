// Minimal helpers — plug into your real auth later.
import Person from "../models/PersonWithNeeds.js";
import PersonUserLink from "../models/PersonUserLink.js";
import passport from "passport";
import "../middleware/passport.js"; // to init the passport strategies
import CareTask from "../models/CareTask.js";
import User from "../models/User.js";

// Require a valid JWT and attach req.user
export const requireAuth = (req, res, next) =>
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    console.log("[AUTH DEBUG]", {
      auth: req.headers.authorization || null,
      info
    });
    if (err) return next(err);
    if (!user) {
      // optional: you can inspect `info` for why, but don't leak too much
      return res.status(401).json({ error: "UNAUTHENTICATED" });
    }
    req.user = user; // { id, role, organizationId, email, name } from passport.js
    next();
  })(req, res, next);

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}

/**
 * Family/PoA: must have an active link to the person.
 * Admin: same org is enough (or also check link if you want stricter).
 */
export async function ensureCanManagePerson(user, personId) {
  const person = await Person.findById(personId);
  if (!person) return { ok: false, code: "INVALID_PERSON" };

  if (user.role === "Admin") {
    if (String(user.organizationId) !== String(person.organizationId)) return { ok: false, code: "ORG_MISMATCH" };
    return { ok: true, person };
  }

  if (user.role === "Family" || user.role === "PoA") {
    const link = await PersonUserLink.exists({ personId, userId: user.id || user._id, active: true });
    if (!link) return { ok: false, code: "NO_ACTIVE_LINK" };
    return { ok: true, person };
  }

  return { ok: false, code: "INSUFFICIENT_ROLE" };
}

/**
 * Staff can work on a task if:
 * - same org AND
 * - (assigned to them) OR (have an active link to the person) OR (they are Admin/Family/PoA who manage the person)
 */
// export async function ensureCanWorkOnTask(user, task) {
//   if (String(user.organizationId) !== String(task.organizationId)) return { ok: false, code: "ORG_MISMATCH" };
//   if (user.role === "Admin") return { ok: true };

//   if (task.assignedToUserId && String(task.assignedToUserId) === String(user.id || user._id)) {
//     return { ok: true };
//   }

//   const link = await PersonUserLink.exists({ personId: task.personId, userId: user.id || user._id, active: true });
//   if (link) return { ok: true };

//   return { ok: false, code: "NO_ACCESS" };
// }

export async function ensureCanWorkOnTask(user, taskOrId) {
  const task = typeof taskOrId === "object" ? taskOrId : await CareTask.findById(taskOrId);
  if (!task) return { ok: false, code: "TASK_NOT_FOUND" };
  if (String(task.organizationId) !== String(user.organizationId)) {
    return { ok: false, code: "ORG_SCOPE_INVALID" };
  }
  if (user.role === "Admin") return { ok: true };
  const link = await PersonUserLink.findOne({ userId: user.id, personId: task.personId, active: true }).lean();
  if (!link) return { ok: false, code: "NOT_LINKED" };
  return { ok: true };
}