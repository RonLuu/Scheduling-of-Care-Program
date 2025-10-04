import React from "react";

function ShiftEditDrawer({
  jwt,
  isAdmin,
  assignables,
  shiftSettings,
  shift,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [staffUserId, setStaffUserId] = React.useState(shift.staffId || "");
  const [shiftSelection, setShiftSelection] = React.useState(
    shift.shiftType === "morning" ||
      shift.shiftType === "afternoon" ||
      shift.shiftType === "evening"
      ? shift.shiftType
      : "custom"
  );

  function toYMDLocal(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function toHM(d) {
    const x = new Date(d);
    const hh = String(x.getHours()).padStart(2, "0");
    const mm = String(x.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const [startDate, setStartDate] = React.useState(
    shift.start ? toYMDLocal(shift.start) : ""
  );
  const [endDate, setEndDate] = React.useState("");
  const [startTime, setStartTime] = React.useState(
    shift.start ? toHM(shift.start) : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    shift.end ? toHM(shift.end) : "17:00"
  );
  const [notes, setNotes] = React.useState(shift.notes || "");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Update times when shift selection changes
  React.useEffect(() => {
    if (
      shiftSelection !== "custom" &&
      shiftSettings &&
      shiftSettings[shiftSelection]
    ) {
      const shiftConfig = shiftSettings[shiftSelection];
      setStartTime(shiftConfig.startTime);
      setEndTime(shiftConfig.endTime);
    } else if (shiftSelection === "custom") {
      // Keep existing times or reset to defaults
      if (!shift.start) {
        setStartTime("09:00");
        setEndTime("17:00");
      }
    }
  }, [shiftSelection, shiftSettings]);

  const calculateShiftDates = () => {
    let start, end;

    if (shiftSelection !== "custom" && shiftSettings) {
      const shiftConfig = shiftSettings[shiftSelection];
      if (!shiftConfig) throw new Error("Invalid shift configuration.");

      start = new Date(`${startDate}T${shiftConfig.startTime}:00`);

      if (
        shiftConfig.isOvernight ||
        (shiftSelection === "evening" &&
          shiftConfig.endTime < shiftConfig.startTime)
      ) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        end = new Date(
          `${nextDay.toISOString().split("T")[0]}T${shiftConfig.endTime}:00`
        );
      } else {
        end = new Date(`${startDate}T${shiftConfig.endTime}:00`);
      }
    } else {
      // Custom shift
      if (!endDate || endDate === startDate) {
        // Same day custom shift
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

  const save = async () => {
    try {
      setErr("");
      setLoading(true);

      if (!isAdmin) throw new Error("Only Admin can edit shifts.");
      if (!staffUserId) throw new Error("Choose a staff member.");
      if (!startDate) throw new Error("Pick a date.");

      const { start, end } = calculateShiftDates();

      const payload = {
        staffUserId,
        notes,
        start,
        end,
        shiftType: shiftSelection === "custom" ? "custom" : shiftSelection,
      };

      const r = await fetch(`/api/shift-allocations/${shift.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update shift");
      onSaved?.();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const del = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this shift?")) return;
    try {
      setLoading(true);
      const r = await fetch(`/api/shift-allocations/${shift.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) {
        alert(d.error || "Delete failed");
        return;
      }
      onDeleted?.();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getShiftOptionLabel = (type) => {
    if (type === "custom") return "Custom Hours";

    if (!shiftSettings || !shiftSettings[type]) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }

    const shiftConfig = shiftSettings[type];
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${
      shiftConfig.startTime
    } - ${shiftConfig.endTime}${shiftConfig.isOvernight ? " next day" : ""})`;
  };

  const isCustomShift = shiftSelection === "custom";

  return (
    <div className="shift-drawer">
      <div className="drawer-header">
        <h4>{isAdmin ? "Edit Shift" : "Shift Details"}</h4>
        <button className="btn-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {err && <p className="error-message">Error: {err}</p>}

      <div className="drawer-content">
        <div className="form-group">
          <label>Staff</label>
          <select
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
            disabled={!isAdmin || loading}
          >
            <option value="">— Select staff —</option>
            {assignables.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Shift</label>
          <select
            value={shiftSelection}
            onChange={(e) => setShiftSelection(e.target.value)}
            disabled={!isAdmin || loading}
          >
            {shiftSettings?.morning?.enabled !== false && (
              <option value="morning">{getShiftOptionLabel("morning")}</option>
            )}
            {shiftSettings?.afternoon?.enabled !== false && (
              <option value="afternoon">
                {getShiftOptionLabel("afternoon")}
              </option>
            )}
            {shiftSettings?.evening?.enabled !== false && (
              <option value="evening">{getShiftOptionLabel("evening")}</option>
            )}
            <option value="custom">{getShiftOptionLabel("custom")}</option>
          </select>
        </div>

        {/* For predefined shifts - only show date */}
        {!isCustomShift && (
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!isAdmin || loading}
            />
          </div>
        )}

        {/* For custom shifts - show date/time controls */}
        {isCustomShift && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!isAdmin || loading}
                />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!isAdmin || loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  End Date <span className="optional-label"></span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  disabled={!isAdmin || loading}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!isAdmin || loading}
                />
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isAdmin || loading}
            rows="3"
            placeholder="Add any special instructions or notes"
          />
        </div>

        {isAdmin && (
          <div className="drawer-actions">
            <button className="btn-save" onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button className="btn-delete" onClick={del} disabled={loading}>
              Delete
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .shift-drawer {
          position: fixed;
          right: 16px;
          top: 90px;
          bottom: 16px;
          width: 420px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          z-index: 50;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .drawer-header h4 {
          margin: 0;
          color: #111827;
        }

        .btn-close {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
        }

        .btn-close:hover {
          background: #f3f4f6;
        }

        .drawer-content {
          flex: 1;
          padding: 1.25rem;
          overflow-y: auto;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin: 0 1.25rem 1rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .optional-label {
          font-weight: 400;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
        }

        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group select:disabled,
        .form-group input:disabled,
        .form-group textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        .form-group textarea {
          resize: vertical;
        }

        .drawer-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .btn-save,
        .btn-delete {
          flex: 1;
          padding: 0.625rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-save {
          background: #3b82f6;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-delete {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-delete:hover:not(:disabled) {
          background: #fecaca;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .shift-drawer {
            width: 100%;
            right: 0;
            left: 0;
            border-radius: 12px 12px 0 0;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftEditDrawer;
