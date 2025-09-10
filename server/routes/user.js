import { Router } from "express";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

const router = Router();

router.route("/").get(getUsers).post(postUser);

router.route("/:userId").get(getUser).put(putUser).delete(deleteUser);

async function getUsers(req, res) {
  const { organizationId } = req.query;
  const filter = {};
  if (organizationId) filter.organizationId = organizationId;
  const users = await User.find(filter).lean();
  res.json(users);
}

async function postUser(req, res) {
  // (Optional) check org exists
  if (req.body.organizationId) {
    const org = await Organization.exists({ _id: req.body.organizationId });
    if (!org) return res.status(400).json({ error: "Invalid organizationId" });
  }
  const user = await User.create(req.body);
  res.status(201).json(user);
}

async function getUser(req, res) {
  const user = await User.findById(req.params.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}

async function putUser(req, res) {
  // If organizationId changes, ensure it’s valid (you may also want to block org changes here)
  if (req.body.organizationId) {
    const org = await Organization.exists({ _id: req.body.organizationId });
    if (!org) return res.status(400).json({ error: "Invalid organizationId" });
  }
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}

async function deleteUser(req, res) {
  await User.deleteOne({ _id: req.params.userId });
  res.json({ message: "User deleted" });
}

export default router;
