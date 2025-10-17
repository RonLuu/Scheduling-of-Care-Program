import React, { useState, useEffect } from "react";
import { BiCog, BiTime, BiSave, BiX } from "react-icons/bi";

function ShiftSettingsManager({ jwt, organizationId }) {
  const [showSettings, setShowSettings] = useState(false);
  const [shiftSettings, setShiftSettings] = useState(null);
  const [editedSettings, setEditedSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load current shift settings
  useEffect(() => {
    if (showSettings && organizationId) {
      loadShiftSettings();
    }
  }, [showSettings, organizationId]);

  const loadShiftSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `/api/organizations/${organizationId}/shift-settings`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load shift settings");
      }

      const data = await response.json();
      setShiftSettings(data.shiftSettings);
      setEditedSettings(JSON.parse(JSON.stringify(data.shiftSettings))); // Deep copy
    } catch (err) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (shiftType, field, value) => {
    setEditedSettings((prev) => ({
      ...prev,
      [shiftType]: {
        ...prev[shiftType],
        [field]: value,
      },
    }));
    setMessage(""); // Clear any previous messages
  };

  const handleToggleShift = (shiftType) => {
    setEditedSettings((prev) => ({
      ...prev,
      [shiftType]: {
        ...prev[shiftType],
        enabled: !prev[shiftType].enabled,
      },
    }));
  };

  const validateTimes = () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const shiftType of ["morning", "afternoon", "evening"]) {
      const shift = editedSettings[shiftType];
      if (!shift) continue;

      if (shift.enabled) {
        if (!timeRegex.test(shift.startTime)) {
          setError(
            `Invalid ${shiftType} start time. Use 24-hour format (HH:MM)`
          );
          return false;
        }
        if (!timeRegex.test(shift.endTime)) {
          setError(`Invalid ${shiftType} end time. Use 24-hour format (HH:MM)`);
          return false;
        }

        // For non-overnight shifts, check end > start
        if (shiftType !== "evening" && !shift.isOvernight) {
          const [startHour, startMin] = shift.startTime.split(":").map(Number);
          const [endHour, endMin] = shift.endTime.split(":").map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (endMinutes <= startMinutes) {
            setError(`${shiftType} shift: End time must be after start time`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const saveSettings = async () => {
    try {
      setError("");
      setMessage("");

      if (!validateTimes()) {
        return;
      }

      setSaving(true);

      const response = await fetch(
        `/api/organizations/${organizationId}/shift-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({ shiftSettings: editedSettings }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setShiftSettings(editedSettings);
      setMessage("Shift settings saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setEditedSettings(JSON.parse(JSON.stringify(shiftSettings)));
    setError("");
    setMessage("");
  };

  const hasChanges =
    JSON.stringify(shiftSettings) !== JSON.stringify(editedSettings);

  if (!showSettings) {
    return (
      <div className="shift-settings-toggle">
        <button className="btn-settings" onClick={() => setShowSettings(true)}>
          <BiCog /> Change Organization Shift Settings
        </button>

        <style jsx>{`
          .shift-settings-toggle {
            margin: 1rem 0;
          }

          .btn-settings {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1rem;
            background: #8189d2;
            color: #ffffff !important;
            border: none;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-settings:hover {
            background: #6b73c5;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(129, 137, 210, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="shift-settings-manager">
      <div className="settings-header">
        <h3>
          <BiTime /> Organization Shift Settings
        </h3>
      </div>

      {loading ? (
        <div className="loading">Loading shift settings...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : editedSettings ? (
        <>
          <div className="settings-content">
            <p className="settings-description">
              Set the start and end times for your organisation’s predefined 
              shifts. These times will fill in automatically when you choose 
              a shift type.
            </p>

            {/* Morning Shift */}
            <div
              className={`shift-config ${
                !editedSettings.morning?.enabled ? "disabled" : ""
              }`}
            >
              <div className="shift-header">
                <h4>Morning Shift</h4>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={editedSettings.morning?.enabled ?? true}
                    onChange={() => handleToggleShift("morning")}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {editedSettings.morning?.enabled && (
                <div className="time-inputs">
                  <div className="time-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={editedSettings.morning?.startTime || "07:00"}
                      onChange={(e) =>
                        handleTimeChange("morning", "startTime", e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="time-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={editedSettings.morning?.endTime || "16:00"}
                      onChange={(e) =>
                        handleTimeChange("morning", "endTime", e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Afternoon Shift */}
            <div
              className={`shift-config ${
                !editedSettings.afternoon?.enabled ? "disabled" : ""
              }`}
            >
              <div className="shift-header">
                <h4>Afternoon Shift</h4>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={editedSettings.afternoon?.enabled ?? true}
                    onChange={() => handleToggleShift("afternoon")}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {editedSettings.afternoon?.enabled && (
                <div className="time-inputs">
                  <div className="time-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={editedSettings.afternoon?.startTime || "15:30"}
                      onChange={(e) =>
                        handleTimeChange(
                          "afternoon",
                          "startTime",
                          e.target.value
                        )
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="time-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={editedSettings.afternoon?.endTime || "22:00"}
                      onChange={(e) =>
                        handleTimeChange("afternoon", "endTime", e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Evening Shift */}
            <div
              className={`shift-config ${
                !editedSettings.evening?.enabled ? "disabled" : ""
              }`}
            >
              <div className="shift-header">
                <h4>Evening Shift (Overnight)</h4>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={editedSettings.evening?.enabled ?? true}
                    onChange={() => handleToggleShift("evening")}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {editedSettings.evening?.enabled && (
                <>
                  <div className="time-inputs">
                    <div className="time-group">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={editedSettings.evening?.startTime || "21:30"}
                        onChange={(e) =>
                          handleTimeChange(
                            "evening",
                            "startTime",
                            e.target.value
                          )
                        }
                        disabled={saving}
                      />
                    </div>
                    <div className="time-group">
                      <label>End Time (Next Day)</label>
                      <input
                        type="time"
                        value={editedSettings.evening?.endTime || "07:30"}
                        onChange={(e) =>
                          handleTimeChange("evening", "endTime", e.target.value)
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <p className="overnight-note">
                    This shift spans overnight to the next day
                  </p>
                </>
              )}
            </div>
          </div>

          {message && <div className="success-message">{message}</div>}

          <div className="settings-actions">
            <button
              className="btn-save"
              onClick={saveSettings}
              disabled={!hasChanges || saving}
            >
              <BiSave /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .shift-settings-manager {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin: 1rem 0;
          overflow: hidden;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .settings-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #111827;
          font-size: 1.125rem;
        }

        .btn-close {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .settings-content {
          padding: 1.5rem;
        }

        .settings-description {
          color: #6b7280;
          margin: 0 0 1.5rem 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .shift-config {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: opacity 0.2s;
        }

        .shift-config.disabled {
          opacity: 0.6;
        }

        .shift-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .shift-header h4 {
          margin: 0;
          color: #374151;
          font-size: 1rem;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #3b82f6;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .time-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .time-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .time-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
        }

        .time-group input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
        }

        .time-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .overnight-note {
          margin: 0.5rem 0 0 0;
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }

        .loading {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .error-message {
          margin: 1rem 1.5rem;
          padding: 0.75rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 0.375rem;
        }

        .success-message {
          margin: 0 1.5rem 1rem;
          padding: 0.75rem;
          background: #d1fae5;
          color: #065f46;
          border-radius: 0.375rem;
        }

        .settings-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .btn-save {
          padding: 0.625rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-save {
          background: #3b82f6;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }


        @media (max-width: 640px) {
          .time-inputs {
            grid-template-columns: 1fr;
          }

          .settings-actions {
            flex-direction: column;
          }

          .btn-save {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftSettingsManager;
