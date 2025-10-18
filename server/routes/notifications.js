import { Router } from "express";
import { requireAuth } from "../middleware/authz.js";
import { sendBudgetWarningEmail, checkAndSendBudgetAlerts } from "../services/emailService.js";
import { checkBudgetAndNotify } from "../services/budgetMonitor.js";
import User from "../models/User.js";
import Person from "../models/PersonWithNeeds.js";

const router = Router();

// Test endpoint to send a sample budget warning email
router.post("/test-budget-email", requireAuth, async (req, res) => {
  try {
    const { email, clientId, year } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Use current user's email if not provided
    const recipientEmail = email || req.user.email;
    
    // Sample budget data for testing
    const sampleData = {
      userName: req.user.name,
      clientName: clientId ? 'Test Client' : 'Sample Client',
      categoryName: 'Healthcare',
      annualBudget: 10000,
      amountSpent: 8500,
      percentageUsed: 85,
      remainingAmount: 1500,
      year: year || new Date().getFullYear(),
      appUrl: process.env.APP_URL || 'http://localhost:3000'
    };

    const result = await sendBudgetWarningEmail(recipientEmail, sampleData);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      result,
      emailSentTo: recipientEmail
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manually trigger budget check for a specific client
router.post("/check-budget/:personId", requireAuth, async (req, res) => {
  try {
    const { personId } = req.params;
    const { year } = req.body;
    
    // Verify user has access to this person
    const person = await Person.findById(personId);
    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }
    
    // Check if user has permission (same organization or linked to person)
    if (person.organizationId && 
        String(person.organizationId) !== String(req.user.organizationId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const checkYear = year || new Date().getFullYear();
    await checkBudgetAndNotify(personId, checkYear);
    
    res.json({
      success: true,
      message: `Budget check completed for ${person.name} (${checkYear})`,
      personId,
      year: checkYear
    });
  } catch (error) {
    console.error('Error checking budget:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user's email preferences
router.get("/preferences", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      emailPreferences: user.emailPreferences || {
        budgetAlerts: true,
        budgetThreshold: 80,
        taskReminders: true,
        weeklyReports: false,
        lastBudgetAlertSent: {}
      }
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user's email preferences
router.patch("/preferences", requireAuth, async (req, res) => {
  try {
    const { budgetAlerts, budgetThreshold, taskReminders, weeklyReports } = req.body;
    
    const update = {};
    if (typeof budgetAlerts === 'boolean') {
      update['emailPreferences.budgetAlerts'] = budgetAlerts;
    }
    if (typeof budgetThreshold === 'number' && budgetThreshold >= 0 && budgetThreshold <= 100) {
      update['emailPreferences.budgetThreshold'] = budgetThreshold;
    }
    if (typeof taskReminders === 'boolean') {
      update['emailPreferences.taskReminders'] = taskReminders;
    }
    if (typeof weeklyReports === 'boolean') {
      update['emailPreferences.weeklyReports'] = weeklyReports;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      emailPreferences: user.emailPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;