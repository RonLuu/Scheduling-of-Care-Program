import { Router } from "express";
import Organization from "../models/Organization.js";
import { requireAuth, requireRole } from "../middleware/authz.js";

const router = Router();

router.route("/").get(getOrganizations).post(postOrganization);

router
  .route("/:organizationId")
  .get(getOrganization)
  .put(putOrganization)
  .delete(deleteOrganization);

// New routes for shift settings
router
  .route("/:organizationId/shift-settings")
  .get(requireAuth, getShiftSettings)
  .put(requireAuth, requireRole("Admin"), updateShiftSettings);

async function getOrganizations(req, res) {
  const orgs = await Organization.find().lean();
  res.json(orgs);
}

async function postOrganization(req, res) {
  const { name, address, shiftSettings } = req.body;
  if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

  const orgData = { name, address };

  // Include shift settings if provided, otherwise use defaults
  if (shiftSettings) {
    orgData.shiftSettings = shiftSettings;
  }

  const org = await Organization.create(orgData);
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

// Get shift settings for an organization
async function getShiftSettings(req, res) {
  try {
    const { organizationId } = req.params;

    // Verify user belongs to this organization
    if (String(req.user.organizationId) !== String(organizationId)) {
      return res.status(403).json({ error: "ORGANIZATION_ACCESS_DENIED" });
    }

    const org = await Organization.findById(organizationId).lean();
    if (!org) return res.status(404).json({ error: "ORGANIZATION_NOT_FOUND" });

    // Return shift settings with defaults if not set
    const defaultSettings = {
      morning: { startTime: "07:00", endTime: "16:00", enabled: true },
      afternoon: { startTime: "15:30", endTime: "22:00", enabled: true },
      evening: {
        startTime: "21:30",
        endTime: "07:30",
        isOvernight: true,
        enabled: true,
      },
    };

    res.json({
      shiftSettings: org.shiftSettings || defaultSettings,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update shift settings for an organization
async function updateShiftSettings(req, res) {
  try {
    const { organizationId } = req.params;
    const { shiftSettings } = req.body;

    // Verify admin belongs to this organization
    if (String(req.user.organizationId) !== String(organizationId)) {
      return res.status(403).json({ error: "ORGANIZATION_ACCESS_DENIED" });
    }

    if (!shiftSettings) {
      return res.status(400).json({ error: "SHIFT_SETTINGS_REQUIRED" });
    }

    // Validate shift times format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const shiftType of ["morning", "afternoon", "evening"]) {
      if (shiftSettings[shiftType]) {
        const shift = shiftSettings[shiftType];
        if (shift.startTime && !timeRegex.test(shift.startTime)) {
          return res.status(400).json({
            error: `Invalid ${shiftType} start time format. Use HH:MM`,
          });
        }
        if (shift.endTime && !timeRegex.test(shift.endTime)) {
          return res.status(400).json({
            error: `Invalid ${shiftType} end time format. Use HH:MM`,
          });
        }
      }
    }

    const org = await Organization.findByIdAndUpdate(
      organizationId,
      { shiftSettings },
      { new: true, runValidators: true }
    );

    if (!org) return res.status(404).json({ error: "ORGANIZATION_NOT_FOUND" });

    res.json({
      message: "Shift settings updated successfully",
      shiftSettings: org.shiftSettings,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export default router;
