import React from "react";
import { BiX, BiCalendar, BiTime, BiUser, BiNote } from "react-icons/bi";

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
      if (!endDate || endDate === startDate) {
        start = new Date(`${startDate}T${startTime}:00`);
        end = new Date(`${startDate}T${endTime}:00`);
        if (end <= start) {
          throw new Error(
            "End time must be after start time for single-day shifts."
          );
        }
      } else {
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

  // Format dates for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="shift-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {isAdmin ? "Edit Shift" : "Shift Details"}
          </h3>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <BiX />
          </button>
        </div>

        {err && <div className="error-banner">{err}</div>}

        <div className="modal-content">
          {/* View Mode - Show for non-admins */}
          {!isAdmin && (
            <div className="view-mode">
              <div className="info-card">
                <div className="info-item">
                  <BiUser className="info-icon" />
                  <div className="info-content">
                    <label>Staff Member</label>
                    <p>{shift.staffName || "Unknown"}</p>
                  </div>
                </div>

                <div className="info-item">
                  <BiCalendar className="info-icon" />
                  <div className="info-content">
                    <label>Date</label>
                    <p>{formatDate(shift.start)}</p>
                  </div>
                </div>

                <div className="info-item">
                  <BiTime className="info-icon" />
                  <div className="info-content">
                    <label>Time</label>
                    <p>
                      {formatTime(shift.start)} - {formatTime(shift.end)}
                    </p>
                  </div>
                </div>

                <div className="info-item">
                  <div className="shift-type-badge">{shift.shiftType}</div>
                </div>

                {shift.notes && (
                  <div className="info-item full-width">
                    <BiNote className="info-icon" />
                    <div className="info-content">
                      <label>Notes</label>
                      <p>{shift.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Mode - Show for admins */}
          {isAdmin && (
            <div className="edit-mode">
              <div className="form-group">
                <label>
                  <BiUser className="label-icon" /> Staff Member
                </label>
                <select
                  value={staffUserId}
                  onChange={(e) => setStaffUserId(e.target.value)}
                  disabled={loading}
                  className="form-control"
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
                <label>Shift Type</label>
                <select
                  value={shiftSelection}
                  onChange={(e) => setShiftSelection(e.target.value)}
                  disabled={loading}
                  className="form-control"
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
                  <option value="custom">
                    {getShiftOptionLabel("custom")}
                  </option>
                </select>
              </div>

              {!isCustomShift && (
                <div className="form-group">
                  <label>
                    <BiCalendar className="label-icon" /> Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                    className="form-control"
                  />
                </div>
              )}

              {isCustomShift && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <BiCalendar className="label-icon" /> Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={loading}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <BiTime className="label-icon" /> Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={loading}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>End Date (optional)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        disabled={loading}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <BiTime className="label-icon" /> End Time
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={loading}
                        className="form-control"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>
                  <BiNote className="label-icon" /> Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  rows="4"
                  placeholder="Add any special instructions or notes"
                  className="form-control"
                />
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button className="btn btn-danger" onClick={del} disabled={loading}>
              Delete Shift
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="modal-footer">
            <button className="btn btn-primary full-width" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .shift-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 600px;
          max-height: 85vh;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
          z-index: 101;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .btn-close {
          background: transparent;
          border: none;
          font-size: 1.75rem !important;
          cursor: pointer;
          color: #6b7280 !important;
          padding: 0.25rem !important;
          width: 40px !important;
          height: 40px;
          align-items: center;
          border-radius: 0.5rem;
          transition: all 0.2s;
          margin: 0 !important;
        }

        .btn-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .error-banner {
          background: #fee2e2;
          color: #991b1b;
          padding: 1rem 1.5rem;
          border-left: 4px solid #dc2626;
          margin: 0 1.5rem;
          margin-top: 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        /* View Mode Styles */
        .view-mode {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .info-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-icon {
          font-size: 1.5rem;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-content label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .info-content p {
          margin: 0;
          font-size: 1rem;
          color: #111827;
          font-weight: 500;
        }

        .shift-type-badge {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 0.5rem;
          font-weight: 600;
          text-transform: capitalize;
          font-size: 0.875rem;
          text-align: center;
        }

        /* Edit Mode Styles */
        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label-icon {
          font-size: 1.125rem;
          color: #6b7280;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          transition: all 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-control:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0 0 1rem 1rem;
        }

        /* Protected button styles with higher specificity */
        .shift-modal .modal-footer .btn {
          padding: 0.75rem 1.5rem !important;
          border-radius: 0.5rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: none !important;
          transition: all 0.2s !important;
          font-size: 0.875rem !important;
          text-decoration: none !important;
        }

        .shift-modal .modal-footer .btn.full-width {
          flex: 1 !important;
        }

        .shift-modal .modal-footer .btn-primary {
          background: #3b82f6 !important;
          background-color: #3b82f6 !important;
          color: white !important;
        }

        .shift-modal .modal-footer .btn-primary:hover:not(:disabled) {
          background: #2563eb !important;
          background-color: #2563eb !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3) !important;
        }

        .shift-modal .modal-footer .btn-secondary {
          background: white !important;
          background-color: white !important;
          color: #374151 !important;
          border: 1px solid #d1d5db !important;
        }

        .shift-modal .modal-footer .btn-secondary:hover:not(:disabled) {
          background: #f9fafb !important;
          background-color: #f9fafb !important;
        }

        .shift-modal .modal-footer .btn-danger {
          background: #fee2e2 !important;
          background-color: #fee2e2 !important;
          color: #991b1b !important;
        }

        .shift-modal .modal-footer .btn-danger:hover:not(:disabled) {
          background: #fecaca !important;
          background-color: #fecaca !important;
        }

        .shift-modal .modal-footer .btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        @media (max-width: 640px) {
          .shift-modal {
            width: 95%;
            max-height: 90vh;
          }

          .info-card {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .shift-modal .modal-footer .btn {
            width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}

export default ShiftEditDrawer;
