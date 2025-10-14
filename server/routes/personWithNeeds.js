import { Router } from "express";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import Organization from "../models/Organization.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

router.route("/").get(getPeople).post(postPerson);
router.route("/:personId").get(getPerson).put(putPerson).delete(deletePerson);

// Additional routes for specific operations
router.patch("/:personId/medical", requireAuth, updateMedicalInfo);
router.patch(
  "/:personId/emergency-contact",
  requireAuth,
  updateEmergencyContact
);
router.post("/:personId/notes", requireAuth, addNote);
router.post("/:personId/custom-fields", requireAuth, addCustomField);
router.get("/:personId/documents", requireAuth, getDocuments);
router.post("/:personId/documents", requireAuth, addDocument);

async function getPeople(req, res) {
  try {
    const { organizationId, status, riskLevel, supportLevel } = req.query;
    const filter = {};

    if (organizationId) filter.organizationId = organizationId;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (supportLevel) filter.supportLevel = supportLevel;

    const people = await PersonWithNeeds.find(filter)
      .select("-documents -notes") // Exclude heavy fields for list view
      .lean();

    res.json(people);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function postPerson(req, res) {
  try {
    // Only validate organizationId if it's provided
    if (req.body.organizationId) {
      const org = await Organization.exists({ _id: req.body.organizationId });
      if (!org) {
        return res.status(400).json({ error: "Invalid organizationId" });
      }
    }

    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Structure the data properly
    const personData = {
      organizationId: req.body.organizationId || null, // Allow null
      name: req.body.name,
      dateOfBirth: req.body.dateOfBirth,
      sex: req.body.sex,
      mobilePhone: req.body.mobilePhone,
      address: req.body.address || {},
      emergencyContact: req.body.emergencyContact || {},
      medicalInfo: req.body.medicalInfo || {},
      customFields: req.body.customFields || [],
      status: req.body.status || "Active",
      riskLevel: req.body.riskLevel || "Low",
      supportLevel: req.body.supportLevel || "Moderate",
      customCategories: req.body.customCategories || [],
      currentAnnualBudget: req.body.currentAnnualBudget || 0,
    };

    // Add audit information if available
    if (req.user && req.user.id) {
      personData.createdBy = req.user.id;
    }

    const newPerson = await PersonWithNeeds.create(personData);
    res.status(201).json(newPerson);
  } catch (error) {
    console.error("Error creating person:", error);
    res.status(400).json({ error: error.message });
  }
}

async function getPerson(req, res) {
  try {
    const person = await PersonWithNeeds.findById(req.params.personId).lean();
    if (!person) return res.status(404).json({ error: "Person not found" });
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function putPerson(req, res) {
  try {
    if (req.body.organizationId) {
      const org = await Organization.exists({ _id: req.body.organizationId });
      if (!org)
        return res.status(400).json({ error: "Invalid organizationId" });
    }

    // Add audit information
    if (req.user && req.user.id) {
      req.body.lastModifiedBy = req.user.id;
    }

    const updatedPerson = await PersonWithNeeds.findByIdAndUpdate(
      req.params.personId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPerson) {
      return res.status(404).json({ error: "Person not found" });
    }

    res.json(updatedPerson);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deletePerson(req, res) {
  try {
    const result = await PersonWithNeeds.deleteOne({
      _id: req.params.personId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json({ message: "Person deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update medical information
async function updateMedicalInfo(req, res) {
  try {
    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    // Update medical info fields
    Object.assign(person.medicalInfo, req.body);
    person.lastModifiedBy = req.user.id;

    await person.save();
    res.json({
      ok: true,
      medicalInfo: person.medicalInfo,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update emergency contact
async function updateEmergencyContact(req, res) {
  try {
    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    Object.assign(person.emergencyContact, req.body);
    person.lastModifiedBy = req.user.id;

    await person.save();
    res.json({
      ok: true,
      emergencyContact: person.emergencyContact,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Add a note
async function addNote(req, res) {
  try {
    const { content, category } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    const author = req.user.name || req.user.email || req.user.id;
    await person.addNote(content, author, category);

    res.json({
      ok: true,
      note: person.notes[person.notes.length - 1],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Add custom field
async function addCustomField(req, res) {
  try {
    const { title, value, category } = req.body;
    if (!title || !value) {
      return res.status(400).json({ error: "Title and value are required" });
    }

    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    await person.addCustomField(title, value, category);

    res.json({
      ok: true,
      customField: person.customFields[person.customFields.length - 1],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get documents
async function getDocuments(req, res) {
  try {
    const person = await PersonWithNeeds.findById(req.params.personId)
      .select("documents")
      .lean();

    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    res.json({ documents: person.documents || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Add document reference
async function addDocument(req, res) {
  try {
    const { type, filename, url } = req.body;
    if (!type || !filename || !url) {
      return res.status(400).json({
        error: "Document type, filename, and URL are required",
      });
    }

    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "Person not found" });

    // Check organization boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Organization scope invalid" });
    }

    person.documents.push({ type, filename, url });
    person.lastModifiedBy = req.user.id;
    await person.save();

    res.json({
      ok: true,
      document: person.documents[person.documents.length - 1],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get categories (maintained from original)
router.get("/:id/categories", requireAuth, async (req, res) => {
  try {
    const p = await PersonWithNeeds.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: "PERSON_NOT_FOUND" });
    if (String(p.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    const predefined = [
      "HygieneProducts",
      "Clothing",
      "Health",
      "Entertainment",
      "Other",
    ];
    const set = new Set([...predefined, ...(p.customCategories || [])]);
    const list = [...set].sort((a, b) => a.localeCompare(b));
    res.json({ categories: list });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/person-with-needs/:personId/budget (maintained from original)
router.patch("/:personId/budget", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body || {};
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    const person = await PersonWithNeeds.findById(req.params.personId);
    if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });

    // org boundary
    if (String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
    }

    person.currentAnnualBudget = value;
    person.lastModifiedBy = req.user.id;
    await person.save();

    res.json({
      ok: true,
      personId: String(person._id),
      currentAnnualBudget: person.currentAnnualBudget,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Search functionality
router.get("/search", requireAuth, async (req, res) => {
  try {
    const { q, organizationId } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const filter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { "address.suburb": { $regex: q, $options: "i" } },
        { "emergencyContact.name": { $regex: q, $options: "i" } },
        { mobilePhone: { $regex: q, $options: "i" } },
      ],
    };

    if (organizationId) {
      filter.organizationId = organizationId;
    }

    const people = await PersonWithNeeds.find(filter)
      .select("name mobilePhone address emergencyContact status")
      .limit(20)
      .lean();

    res.json(people);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const stats = await PersonWithNeeds.aggregate([
      { $match: { organizationId: mongoose.Types.ObjectId(organizationId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStatus: {
            $push: "$status",
          },
          byRiskLevel: {
            $push: "$riskLevel",
          },
          bySupportLevel: {
            $push: "$supportLevel",
          },
        },
      },
      {
        $project: {
          total: 1,
          statusCounts: {
            active: {
              $size: {
                $filter: {
                  input: "$byStatus",
                  cond: { $eq: ["$this", "Active"] },
                },
              },
            },
            inactive: {
              $size: {
                $filter: {
                  input: "$byStatus",
                  cond: { $eq: ["$this", "Inactive"] },
                },
              },
            },
            transferred: {
              $size: {
                $filter: {
                  input: "$byStatus",
                  cond: { $eq: ["$this", "Transferred"] },
                },
              },
            },
          },
          riskLevelCounts: {
            low: {
              $size: {
                $filter: {
                  input: "$byRiskLevel",
                  cond: { $eq: ["$this", "Low"] },
                },
              },
            },
            medium: {
              $size: {
                $filter: {
                  input: "$byRiskLevel",
                  cond: { $eq: ["$this", "Medium"] },
                },
              },
            },
            high: {
              $size: {
                $filter: {
                  input: "$byRiskLevel",
                  cond: { $eq: ["$this", "High"] },
                },
              },
            },
            critical: {
              $size: {
                $filter: {
                  input: "$byRiskLevel",
                  cond: { $eq: ["$this", "Critical"] },
                },
              },
            },
          },
        },
      },
    ]);

    res.json(stats[0] || { total: 0, statusCounts: {}, riskLevelCounts: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
