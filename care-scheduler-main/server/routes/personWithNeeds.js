import { Router } from "express";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import Organization from "../models/Organization.js";

const router = Router();

router.route("/")
  .get(getPeople)
  .post(postPerson);

router.route("/:personId")
  .get(getPerson)
  .put(putPerson)
  .delete(deletePerson);

async function getPeople(req, res) {
  const { organizationId } = req.query;
  const filter = {};
  if (organizationId) filter.organizationId = organizationId;

  const people = await PersonWithNeeds.find(filter).lean();
  res.json(people);
}

async function postPerson(req, res) {
  // Guard: organization must exist
  const org = await Organization.exists({ _id: req.body.organizationId });
  if (!org) return res.status(400).json({ error: "Invalid organizationId" });

  const newPerson = await PersonWithNeeds.create(req.body);
  res.status(201).json(newPerson);
}

async function getPerson(req, res) {
  const person = await PersonWithNeeds.findById(req.params.personId).lean();
  if (!person) return res.status(404).json({ error: "Person not found" });
  res.json(person);
}

async function putPerson(req, res) {
  if (req.body.organizationId) {
    const org = await Organization.exists({ _id: req.body.organizationId });
    if (!org) return res.status(400).json({ error: "Invalid organizationId" });
  }
  const updatedPerson = await PersonWithNeeds.findByIdAndUpdate(
    req.params.personId,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updatedPerson) return res.status(404).json({ error: "Person not found" });
  res.json(updatedPerson);
}

async function deletePerson(req, res) {
  await PersonWithNeeds.deleteOne({ _id: req.params.personId });
  res.json({ message: "Person deleted" });
}

export default router;