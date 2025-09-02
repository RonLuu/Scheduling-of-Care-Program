import { Router } from "express";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import User from "../models/User.js";
import PersonUserLink from "../models/PersonUserLink.js";

const router = Router();

router.route("/")
  .get(getLinks)
  .post(postLink);

router.route("/:linkId")
  .get(getLink)
  .put(putLink)
  .delete(deleteLink);

async function getLinks(req, res) {
  const { personId, userId, active } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (userId) filter.userId = userId;
  if (active !== undefined) filter.active = active === "true";

  const links = await PersonUserLink.find(filter).lean();
  res.json(links);
}

async function postLink(req, res) {
  const { personId, userId, relationshipType, active = true } = req.body;

  // Fetch both and enforce org-invariant
  const [person, user] = await Promise.all([
    PersonWithNeeds.findById(personId),
    User.findById(userId)
  ]);
  if (!person || !user) return res.status(400).json({ error: "Person or User not found" });
  if (String(person.organizationId) !== String(user.organizationId)) {
    return res.status(400).json({ error: "ORG_MISMATCH: user and person must be in the same organization" });
  }

  const link = await PersonUserLink.create({
    personId, userId, relationshipType, active, startAt: new Date()
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
      User.findById(userId)
    ]);
    if (!person || !user) return res.status(400).json({ error: "Person or User not found" });
    if (String(person.organizationId) !== String(user.organizationId)) {
      return res.status(400).json({ error: "ORG_MISMATCH: user and person must be in the same organization" });
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

export default router;