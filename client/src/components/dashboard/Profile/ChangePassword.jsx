// client/src/components/dashboard/profile/ChangePassword.jsx
// IMPROVED VERSION with better success message

import React, { useState } from "react";
import { BiX, BiLock, BiCheckCircle } from "react-icons/bi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function ChangePassword({ jwt, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match");
    }

    // Validate password length
    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters long");
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return setError("New password must be different from current password");
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/me/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return setError(data.error || "Failed to change password");
      }

      // Success!
      setSuccess(true);

      // Close after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 4000);
    } catch (err) {
      console.error("Change password error:", err);
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // IMPROVED: Success overlay that covers the entire screen
  if (success) {
    return (
      <>
        {/* Full screen backdrop */}
        <div className="success-backdrop" onClick={handleClose}>
          {/* Centered success card */}
          <div className="success-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-wrapper">
              <BiCheckCircle className="success-icon" />
            </div>
            <h2 className="success-title">Password Changed!</h2>
            <p className="success-message">
              Your password has been successfully updated.
            </p>
            <div className="success-timer">Closing automatically...</div>
          </div>
        </div>

        <style jsx>{`
          .success-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1003;
            animation: fadeIn 0.3s ease;
            cursor: pointer;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .success-card {
            background: white;
            border-radius: 24px;
            padding: 3rem 2.5rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: default;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          @keyframes slideUp {
            from {
              transform: translateY(50px) scale(0.9);
              opacity: 0;
            }
            to {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }

          .success-icon-wrapper {
            margin-bottom: 1.3rem;
            animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s
              backwards;
          }

          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          .success-icon {
            font-size: 5rem;
            color: #4caf50;
            filter: drop-shadow(0 4px 12px rgba(76, 175, 80, 0.3));
          }

          .success-title {
            font-size: 2rem;
            font-weight: 700;
            color: #1a202c;
            margin: 0 0 0.75rem 0;
            animation: fadeInUp 0.5s ease 0.3s backwards;
            margin-bottom: 1rem;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .success-message {
            font-size: 1rem;
            color: #6b7280;
            margin: 0 0 1.5rem 0;
            line-height: 1.6;
            animation: fadeInUp 0.5s ease 0.4s backwards;
          }

          .success-timer {
            font-size: 0.875rem;
            color: #9ca3af;
            font-style: italic;
            animation: fadeInUp 0.5s ease 0.5s backwards;
          }

          @media (max-width: 576px) {
            .success-card {
              padding: 2.5rem 2rem;
            }

            .success-icon {
              font-size: 4rem;
            }

            .success-title {
              font-size: 1.75rem;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="change-password-wrapper">
      <div className="change-password-panel">
        <div className="change-password-header">
          <div className="change-password-title-section">
            <BiLock className="change-password-header-icon" />
            <h2 className="change-password-title">Change Password</h2>
          </div>
          <button
            className="change-password-close-btn"
            onClick={handleClose}
            disabled={loading}
            type="button"
          >
            <BiX className="change-password-close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-content">
          {error && <div className="change-password-error">{error}</div>}

          {/* Current Password */}
          <div className="change-password-input-group">
            <label className="change-password-input-label">
              Current Password{" "}
              <span className="required-mark" title="This field is required">
                *
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="change-password-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: "45px" }}
              />
              <FontAwesomeIcon
                icon={showCurrentPassword ? faEyeSlash : faEye}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="password-toggle-icon"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="change-password-input-group">
            <label className="change-password-input-label">
              New Password{" "}
              <span className="required-mark" title="This field is required">
                *
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showNewPassword ? "text" : "password"}
                className="change-password-input"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
                disabled={loading}
                style={{ paddingRight: "45px" }}
              />
              <FontAwesomeIcon
                icon={showNewPassword ? faEyeSlash : faEye}
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="password-toggle-icon"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="change-password-input-group">
            <label className="change-password-input-label">
              Confirm New Password{" "}
              <span className="required-mark" title="This field is required">
                *
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="change-password-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
                disabled={loading}
                style={{ paddingRight: "45px" }}
              />
              <FontAwesomeIcon
                icon={showConfirmPassword ? faEyeSlash : faEye}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle-icon"
              />
            </div>
          </div>

          <button
            type="submit"
            className="change-password-save-button"
            disabled={loading}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>

        <style jsx>{`
          .change-password-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1002;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .change-password-panel {
            background-color: #fff;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
          }

          @keyframes slideUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .change-password-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2rem 2rem 1rem 2rem;
            border-bottom: 2px solid #e5e7eb;
          }

          .change-password-title-section {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .change-password-header-icon {
            font-size: 1.75rem;
            color: #8189d2;
          }

          .change-password-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1a202c;
            margin: 0;
          }

          .change-password-close-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s ease;
            margin: 0;
          }

          .change-password-close-btn:hover:not(:disabled) {
            background: #f3f4f6;
          }

          .change-password-close-btn:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .change-password-close-icon {
            font-size: 2rem;
            color: #6b7280;
          }

          .change-password-content {
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .change-password-input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            width: 100%;
            box-sizing: border-box;
          }

          .change-password-input-label {
            font-weight: 600;
            font-size: 0.875rem;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .required-mark {
            color: #dc2626;
            margin-left: 2px;
          }

          .change-password-input {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 1rem;
            color: #111827;
            background-color: #ffffff;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s ease;
          }

          .change-password-input:focus {
            border-color: #8189d2;
            box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
          }

          .change-password-input:disabled {
            background-color: #f3f4f6;
            cursor: not-allowed;
          }

          .password-toggle-icon {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6b7280;
            font-size: 16px;
            transition: color 0.2s ease;
          }

          .password-toggle-icon:hover {
            color: #374151;
          }

          .change-password-error {
            padding: 1rem;
            background: #fee2e2;
            color: #dc2626;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #fecaca;
          }

          .change-password-save-button {
            width: 100%;
            padding: 1rem;
            background: #8189d2;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
            margin: 0;
            margin-top: 0.8rem;
            box-sizing: border-box;
          }

          .change-password-save-button:hover:not(:disabled) {
            background: #6d76c4;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(129, 137, 210, 0.4);
          }

          .change-password-save-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 576px) {
            .change-password-panel {
              width: 95%;
              max-height: 95vh;
            }

            .change-password-header {
              padding: 1.5rem 1.5rem 1rem 1.5rem;
            }

            .change-password-title {
              font-size: 1.5rem;
            }

            .change-password-content {
              padding: 1.5rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default ChangePassword;
