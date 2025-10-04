import React from "react";
import "./ShiftAllocation.css"
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
    load().catch(() => { });
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
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${shift.startTime
      } - ${shift.endTime}${shift.isOvernight ? " next day" : ""})`;
  };

  const isCustomShift = shiftSelection === "custom";

  return (
    <div className="shift-allocation">
      <h4>Allocate a Shift</h4>
      {err && <p className="error-message">Error: {err}</p>}

      <div className="shift-allocation-section">
        <div className="shift-allocation-section-row">
          <div className="shift-allocation-section-selection">
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
          <div className="shift-allocation-section-selection">
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
          <div className="shift-allocation-section-row">
            <div className="shift-allocation-section-selection">
              <label>Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="shift-allocation-section-selection">
              {/* Empty space to maintain grid layout */}
            </div>
          </div>
        )}

        {/* For custom shifts - show full date/time controls */}
        {isCustomShift && (
          <>
            <div className="shift-allocation-section-row">
              <div className="shift-allocation-section-selection">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {setStartDate(e.target.value); setEndDate(e.target.value)}}
                  disabled={loading}
                />
              </div>
              <div className="shift-allocation-section-selection">
                <label>
                  End Date{" "}
                  <span className="optional-label">
                    {/* (leave blank for same day) */}
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

            </div>

            <div className="shift-allocation-section-row">
              <div className="shift-allocation-section-selection">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="shift-allocation-section-selection">
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

        <div className="shift-allocation-section-note">
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

        <div className="shift-allocation-section-button-wrapper">
          <button
            className="shift-allocation-section-button"
            onClick={submit}
            disabled={loading || !staffUserId || !startDate}
          >
            {loading ? "Creating..." : "Create Shift"}
          </button>
          {/* <button type="button" class="my-button">Click Me!</button> */}
        </div>
      </div>
    </div>
  );
}

export default ShiftAllocation;
