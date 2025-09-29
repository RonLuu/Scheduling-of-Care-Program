import React from "react";

function ShiftAllocation({ jwt, personId, onCreated }) {
  const [assignables, setAssignables] = React.useState([]);
  const [shiftSettings, setShiftSettings] = React.useState(null);
  const [staffUserId, setStaffUserId] = React.useState("");
  const [shiftSelection, setShiftSelection] = React.useState("morning"); // "morning" | "afternoon" | "evening" | "custom"
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Get organization ID from localStorage or context
  const getOrgId = React.useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      return d.user?.organizationId;
    } catch {
      return null;
    }
  }, [jwt]);

  // Load assignable users
  React.useEffect(() => {
    const load = async () => {
      if (!personId) return;
      const r = await fetch(
        `/api/person-user-links/assignable-users?personId=${personId}`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );
      const d = await r.json();
      setAssignables(
        Array.isArray(d)
          ? d.filter((u) => u.role === "GeneralCareStaff" || u.role === "Admin")
          : []
      );
    };
    load().catch(() => {});
  }, [personId, jwt]);

  // Load organization shift settings
  React.useEffect(() => {
    const loadShiftSettings = async () => {
      try {
        const orgId = await getOrgId();
        if (!orgId) return;

        const r = await fetch(`/api/organizations/${orgId}/shift-settings`, {
          headers: { Authorization: "Bearer " + jwt },
        });
        const d = await r.json();
        setShiftSettings(d.shiftSettings);

        // Update the time inputs for predefined shifts
        if (d.shiftSettings && shiftSelection !== "custom") {
          const shift = d.shiftSettings[shiftSelection];
          if (shift) {
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
          }
        }
      } catch (e) {
        console.error("Failed to load shift settings:", e);
      }
    };
    loadShiftSettings();
  }, [jwt, getOrgId, shiftSelection]);

  // Update times when shift selection changes
  React.useEffect(() => {
    if (
      shiftSelection !== "custom" &&
      shiftSettings &&
      shiftSettings[shiftSelection]
    ) {
      const shift = shiftSettings[shiftSelection];
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
    } else if (shiftSelection === "custom") {
      // Reset to default custom times
      setStartTime("09:00");
      setEndTime("17:00");
    }
  }, [shiftSelection, shiftSettings]);

  const calculateShiftDates = () => {
    if (!startDate) throw new Error("Please select a date.");

    let start, end;

    if (shiftSelection !== "custom" && shiftSettings) {
      // Predefined shift (morning, afternoon, or evening)
      const shift = shiftSettings[shiftSelection];
      if (!shift) throw new Error("Invalid shift configuration.");

      start = new Date(`${startDate}T${shift.startTime}:00`);

      // Handle overnight shifts
      if (
        shift.isOvernight ||
        (shiftSelection === "evening" && shift.endTime < shift.startTime)
      ) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        end = new Date(
          `${nextDay.toISOString().split("T")[0]}T${shift.endTime}:00`
        );
      } else {
        end = new Date(`${startDate}T${shift.endTime}:00`);
      }
    } else {
      // Custom shift - can span multiple days
      if (!endDate) {
        // Single day custom shift
        start = new Date(`${startDate}T${startTime}:00`);
        end = new Date(`${startDate}T${endTime}:00`);

        if (end <= start) {
          throw new Error(
            "End time must be after start time for single-day shifts."
          );
        }
      } else {
        // Multi-day custom shift
        start = new Date(`${startDate}T${startTime}:00`);
        end = new Date(`${endDate}T${endTime}:00`);

        if (end <= start) {
          throw new Error("End date/time must be after start date/time.");
        }
      }
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const submit = async () => {
    try {
      setErr("");
      setLoading(true);

      if (!staffUserId) throw new Error("Please select a staff member.");
      if (!startDate) throw new Error("Please select a date.");

      const { start, end } = calculateShiftDates();

      const r = await fetch("/api/shift-allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          personId,
          staffUserId,
          start,
          end,
          notes: notes || "",
          shiftType: shiftSelection === "custom" ? "custom" : shiftSelection,
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create shift");

      // Clear form & refresh calendar
      setStaffUserId("");
      setShiftSelection("morning");
      setStartDate("");
      setEndDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      onCreated?.();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const getShiftOptionLabel = (type) => {
    if (type === "custom") return "Custom Hours";

    if (!shiftSettings || !shiftSettings[type]) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }

    const shift = shiftSettings[type];
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${
      shift.startTime
    } - ${shift.endTime}${shift.isOvernight ? " next day" : ""})`;
  };

  const isCustomShift = shiftSelection === "custom";

  return (
    <div className="shift-allocation-card">
      <h4>Allocate a Shift</h4>
      {err && <p className="error-message">Error: {err}</p>}

      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label>Staff Member</label>
            <select
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              disabled={loading}
            >
              <option value="">— Select staff —</option>
              {assignables.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Shift</label>
            <select
              value={shiftSelection}
              onChange={(e) => setShiftSelection(e.target.value)}
              disabled={loading}
            >
              {shiftSettings?.morning?.enabled !== false && (
                <option value="morning">
                  {getShiftOptionLabel("morning")}
                </option>
              )}
              {shiftSettings?.afternoon?.enabled !== false && (
                <option value="afternoon">
                  {getShiftOptionLabel("afternoon")}
                </option>
              )}
              {shiftSettings?.evening?.enabled !== false && (
                <option value="evening">
                  {getShiftOptionLabel("evening")}
                </option>
              )}
              <option value="custom">{getShiftOptionLabel("custom")}</option>
            </select>
          </div>
        </div>

        {/* For predefined shifts - only show date */}
        {!isCustomShift && (
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              {/* Empty space to maintain grid layout */}
            </div>
          </div>
        )}

        {/* For custom shifts - show full date/time controls */}
        {isCustomShift && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  End Date{" "}
                  <span className="optional-label">
                    (leave blank for same day)
                  </span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </>
        )}

        <div className="form-row">
          <div className="form-group full-width">
            <label>
              Notes <span className="optional-label">(optional)</span>
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn-primary"
            onClick={submit}
            disabled={loading || !staffUserId || !startDate}
          >
            {loading ? "Creating..." : "Create Shift"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .shift-allocation-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .shift-allocation-card h4 {
          margin: 0 0 1rem 0;
          color: #111827;
          font-size: 1.125rem;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .optional-label {
          font-weight: 400;
          color: #6b7280;
          font-size: 0.813rem;
        }

        .form-group select,
        .form-group input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
        }

        .form-group select:focus,
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group select:disabled,
        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-actions {
          margin-top: 1rem;
          display: flex;
          justify-content: flex-end;
        }

        .btn-primary {
          padding: 0.625rem 1.25rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftAllocation;
