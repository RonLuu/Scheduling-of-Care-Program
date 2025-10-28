// server/routes/passwordReset.js
import { Router } from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = Router();

// Generate a 6-digit code
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request password reset - send code to email
router.post("/request", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Check if user exists
    // NOTE: This allows email enumeration but provides better UX
    if (!user) {
      return res.status(404).json({
        error:
          "This email is not found in our system. Please check your email or create an account.",
        emailNotFound: true,
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: "This account is inactive. Please contact support.",
      });
    }

    // Generate reset code (6 digits)
    const resetCode = generateResetCode();

    // Hash the code before storing
    const hashedCode = await bcrypt.hash(resetCode, 10);

    // Store hashed code and expiry (15 minutes)
    user.passwordResetToken = hashedCode;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send email with the plain code
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await sendPasswordResetEmail(user.email, {
      userName: user.name,
      resetCode: resetCode,
      expiryMinutes: 15,
      appUrl,
    });

    res.json({
      success: true,
      message: "A reset code has been sent to your email.",
    });
  } catch (error) {
    console.error("Error in password reset request:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

// Verify code and reset password
router.post("/verify", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validate input
    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email, code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetToken: { $ne: null },
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Verify the code
    const isValidCode = await bcrypt.compare(code, user.passwordResetToken);

    if (!isValidCode) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    user.passwordHash = newPasswordHash;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Error in password reset verification:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
