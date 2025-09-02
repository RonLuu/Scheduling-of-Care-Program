import { Router } from "express";
import Organization from "../models/Organization.js";

const router = Router();

router.route("/")
  .get(getOrganizations)
  .post(postOrganization);

router.route("/:organizationId")
  .get(getOrganization)
  .put(putOrganization)
  .delete(deleteOrganization);

async function getOrganizations(req, res) {
  const orgs = await Organization.find().lean();
  res.json(orgs);
}

async function postOrganization(req, res) {
  const org = await Organization.create(req.body);
  res.status(201).json(org);
}

async function getOrganization(req, res) {
  const org = await Organization.findById(req.params.organizationId).lean();
  if (!org) return res.status(404).json({ error: "Organization not found" });
  res.json(org);
}

async function putOrganization(req, res) {
  const org = await Organization.findByIdAndUpdate(
    req.params.organizationId,
    req.body,
    { new: true, runValidators: true }
  );
  if (!org) return res.status(404).json({ error: "Organization not found" });
  res.json(org);
}

async function deleteOrganization(req, res) {
  await Organization.deleteOne({ _id: req.params.organizationId });
  res.json({ message: "Organization deleted" });
}

export default router;