// client/src/components/login/ForgotPassword.jsx
import React from "react";
import "../../styles/AuthPages.css";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1); // 1: email, 2: code & password, 3: success
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Step 1: Request reset code
  async function handleRequestCode(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return setErr(data.error || "Failed to send reset code");
      }

      // Move to step 2
      setStep(2);
    } catch (error) {
      setErr("Failed to send reset code. Please try again. ", error);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify code and reset password
  async function handleResetPassword(e) {
    e.preventDefault();
    setErr("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return setErr("Passwords do not match");
    }

    // Validate password length
    if (newPassword.length < 6) {
      return setErr("Password must be at least 6 characters long");
    }

    setLoading(true);

    try {
      const response = await fetch("/api/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return setErr(data.error || "Failed to reset password");
      }

      // Success - move to step 3
      setStep(3);
    } catch (error) {
      setErr("Failed to reset password. Please try again.", error);
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Email input
  if (step === 1) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Reset Your Password</h2>
            <p>Enter your email to receive a reset code</p>
          </div>

          <form onSubmit={handleRequestCode} className="auth-form">
            {err && <div className="auth-error">{err}</div>}

            <div className="auth-form-group">
              <label>
                Email{" "}
                <span className="required-mark" title="This field is required">
                  *
                </span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Sending Code..." : "Send Reset Code"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-footer">
            <p>Remember your password?</p>
            <Link to="/login" className="auth-footer-link">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Code and new password
  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Enter Reset Code</h2>
            <p>Check your email for the 6-digit code</p>
          </div>

          <form onSubmit={handleResetPassword} className="auth-form">
            {err && <div className="auth-error">{err}</div>}

            <div className="auth-form-group">
              <label>
                Email{" "}
                <span className="required-mark" title="This field is required">
                  *
                </span>
              </label>
              <input
                type="email"
                value={email}
                disabled
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>

            <div className="auth-form-group">
              <label>
                Reset Code{" "}
                <span className="required-mark" title="This field is required">
                  *
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                maxLength={6}
                style={{
                  letterSpacing: "4px",
                  fontSize: "18px",
                  textAlign: "center",
                }}
              />
              <small style={{ color: "#6b7280", fontSize: "12px" }}>
                Code expires in 15 minutes
              </small>
            </div>

            <div className="auth-form-group">
              <label>
                New Password{" "}
                <span className="required-mark" title="This field is required">
                  *
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: "40px" }}
                />
                <FontAwesomeIcon
                  icon={showNewPassword ? faEyeSlash : faEye}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "16px",
                  }}
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label>
                Confirm New Password{" "}
                <span className="required-mark" title="This field is required">
                  *
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: "40px" }}
                />
                <FontAwesomeIcon
                  icon={showConfirmPassword ? faEyeSlash : faEye}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "16px",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-footer">
            <p>Didn't receive the code?</p>
            <button
              onClick={() => {
                setStep(1);
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
                setErr("");
              }}
              className="auth-footer-link"
              style={{
                background: "none",
                border: "2px solid #2C3F70",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header" style={{ backgroundColor: "#4caf50" }}>
          <FontAwesomeIcon
            icon={faCheckCircle}
            style={{ fontSize: "48px", marginBottom: "10px" }}
          />
          <h2>Password Reset Successful!</h2>
          <p>Your password has been changed</p>
        </div>

        <div
          className="auth-form"
          style={{ textAlign: "center", padding: "20px 0" }}
        >
          <p
            style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}
          >
            You can now log in with your new password.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="auth-submit-btn"
            style={{ backgroundColor: "#4caf50" }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
