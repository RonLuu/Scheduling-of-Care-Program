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

  // Function to get the display role for staff members
  const getDisplayRole = (user) => {
    if (user.role === "Admin") {
      // Use self-defined role title if available, otherwise default to "organization representative"
      return user.roleTitle || "Organization Representative";
    } else if (user.role === "GeneralCareStaff") {
      return "Carer";
    } else {
      // For any other roles, show the role as-is
      return user.role;
    }
  };

  return (
    <div className="shift-allocation-card">
      <div className="shift-allocation-header">
        <h2>Allocate a Shift</h2>
        <p>Schedule a new shift for the selected staff member</p>
      </div>
      
      {err && <div className="shift-error-message">{err}</div>}

      <form className="shift-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="shift-form-group">
          <label>Staff Member <span className="required-mark">*</span></label>
          <select
            className="shift-form-control"
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select staff member</option>
            {assignables.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} ({getDisplayRole(u)})
              </option>
            ))}
          </select>
        </div>

        <div className="shift-form-group">
          <label>Shift Type <span className="required-mark">*</span></label>
          <select
            className="shift-form-control"
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

        {/* For predefined shifts - only show date */}
        {!isCustomShift && (
          <div className="shift-form-group">
            <label>Date <span className="required-mark">*</span></label>
            <input
              className="shift-form-control"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* For custom shifts - show full date/time controls */}
        {isCustomShift && (
          <>
            <div className="shift-form-row">
              <div className="shift-form-group">
                <label>Start Date <span className="required-mark">*</span></label>
                <input
                  className="shift-form-control"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="shift-form-group">
                <label>Start Time <span className="required-mark">*</span></label>
                <input
                  className="shift-form-control"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="shift-form-row">
              <div className="shift-form-group">
                <label>
                  End Date{" "}
                  <span className="shift-optional-label">
                    (optional - leave blank for same day)
                  </span>
                </label>
                <input
                  className="shift-form-control"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  disabled={loading}
                />
              </div>

              <div className="shift-form-group">
                <label>End Time <span className="required-mark">*</span></label>
                <input
                  className="shift-form-control"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </>
        )}

        <div className="shift-form-group shift-full-width">
          <label>
            Notes{" "}
            <span className="shift-optional-label">(optional)</span>
          </label>
          <textarea
            className="shift-form-control shift-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special instructions or notes"
            disabled={loading}
            rows="3"
          />
        </div>

        <div className="shift-form-actions">
          <button
            type="submit"
            className="shift-submit-btn"
            disabled={loading || !staffUserId || !startDate}
          >
            {loading ? "Creating Shift..." : "Create Shift"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .shift-allocation-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 24px;
          margin: 0;
          max-width: 100%;
          font-family: "Inter", sans-serif;
          border: 1px solid #e5e7eb;
        }

        .shift-allocation-header {
          text-align: left;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .shift-allocation-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 6px 0;
        }

        .shift-allocation-header p {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .shift-error-message {
          padding: 12px 16px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          margin-bottom: 20px;
          text-align: center;
        }

        .shift-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .shift-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .shift-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shift-form-group.shift-full-width,
        .shift-full-width {
          grid-column: 1 / -1;
        }

        .shift-form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .required-mark {
          color: #dc2626;
          margin-left: 2px;
        }

        .shift-optional-label {
          font-weight: 400;
          color: #9ca3af;
          font-size: 12px;
        }

        .shift-form-control {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          font-family: "Inter", sans-serif;
          transition: all 0.2s ease;
          background: #ffffff;
        }

        .shift-form-control:focus {
          outline: none;
          border-color: #8189d2;
          box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
        }

        .shift-form-control:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        .shift-form-control::placeholder {
          color: #9ca3af;
        }

        select.shift-form-control {
          cursor: pointer;
        }

        .shift-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .shift-form-actions {
          margin-top: 12px;
          display: flex;
          justify-content: center;
        }

        .shift-submit-btn {
          padding: 12px 24px;
          background: #2C3F70;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: "Inter", sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .shift-submit-btn:hover:not(:disabled) {
          background: #252E47;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44, 63, 112, 0.4);
        }

        .shift-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .shift-allocation-card {
            padding: 20px 16px;
          }

          .shift-allocation-header h2 {
            font-size: 18px;
          }

          .shift-form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftAllocation;
