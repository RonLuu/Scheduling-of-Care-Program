import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

function ShiftCalendar({ jwt, personId, isAdmin, refreshKey }) {
  const calRef = React.useRef(null);
  const fcRef = React.useRef(null);
  const [drawer, setDrawer] = React.useState({ open: false, shift: null });
  const [assignables, setAssignables] = React.useState([]);
  const [shiftSettings, setShiftSettings] = React.useState(null);
  const [err, setErr] = React.useState("");

  // Get organization ID
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
      } catch (e) {
        console.error("Failed to load shift settings:", e);
      }
    };
    loadShiftSettings();
  }, [jwt, getOrgId]);

  const loadShifts = React.useCallback(async () => {
    try {
      setErr("");
      let from, to;
      if (fcRef.current) {
        const v = fcRef.current.view;
        from = v.activeStart.toISOString().slice(0, 10);
        to = v.activeEnd.toISOString().slice(0, 10);
      }
      const url =
        `/api/shift-allocations?personId=${personId}` +
        (from && to ? `&from=${from}&to=${to}` : "");
      const r = await fetch(url, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load shifts");

      const evs = d.map((s) => {
        // Determine shift type for color coding
        let color = "#2563eb"; // Default blue for custom
        let shiftLabel = "";

        if (s.shiftType) {
          switch (s.shiftType) {
            case "morning":
              color = "#fbbf24"; // Amber for morning
              shiftLabel = " (Morning)";
              break;
            case "afternoon":
              color = "#f97316"; // Orange for afternoon
              shiftLabel = " (Afternoon)";
              break;
            case "evening":
              color = "#8b5cf6"; // Purple for evening
              shiftLabel = " (Evening)";
              break;
            default:
              shiftLabel = " (Custom)";
          }
        }

        return {
          id: s._id,
          title: (s.staff?.name || "Unknown") + shiftLabel,
          start: s.start,
          end: s.end,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            notes: s.notes || "",
            staffId: s.staff?.id || s.staffUserId,
            shiftType: s.shiftType || "custom",
          },
        };
      });

      if (fcRef.current) {
        fcRef.current.removeAllEvents();
        fcRef.current.addEventSource(evs);
      }
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [jwt, personId]);

  // Load staff list for editor
  React.useEffect(() => {
    const loadStaff = async () => {
      if (!personId) return;
      const r = await fetch(
        `/api/person-user-links/assignable-users?personId=${personId}`,
        { headers: { Authorization: "Bearer " + jwt } }
      );
      const d = await r.json();
      setAssignables(
        Array.isArray(d)
          ? d.filter((u) => u.role === "GeneralCareStaff" || u.role === "Admin")
          : []
      );
    };
    loadStaff().catch(() => {});
  }, [personId, jwt]);

  // Initialize calendar once
  React.useEffect(() => {
    if (!calRef.current) return;

    if (fcRef.current) {
      fcRef.current.destroy();
      fcRef.current = null;
    }

    const calendar = new Calendar(calRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      },
      height: "auto",
      expandRows: true,
      slotMinTime: "00:00:00",
      slotMaxTime: "24:00:00",
      nowIndicator: true,
      eventOverlap: true,
      selectable: false,
      displayEventTime: true,
      eventTimeFormat: { hour: "numeric", minute: "2-digit", hour12: true },
      themeSystem: "standard",
      dayMaxEvents: true,
      firstDay: 1, // Monday
      aspectRatio: 1.8,
      slotEventOverlap: true,
      datesSet: () => loadShifts(),
      eventClick: (info) => {
        const e = info.event;
        setDrawer({
          open: true,
          shift: {
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end,
            notes: e.extendedProps?.notes || "",
            staffId: e.extendedProps?.staffId || "",
            shiftType: e.extendedProps?.shiftType || "custom",
          },
        });
      },
    });

    calendar.render();
    fcRef.current = calendar;
    loadShifts();

    return () => {
      calendar.destroy();
      fcRef.current = null;
    };
  }, [loadShifts]);

  React.useEffect(() => {
    if (personId) loadShifts();
  }, [personId, refreshKey, loadShifts]);

  return (
    <div style={{ marginTop: 12 }}>
      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}

      {/* Legend for shift colors */}
      <div className="shift-legend">
        <span className="legend-item">
          <span className="legend-color morning"></span> Morning
        </span>
        <span className="legend-item">
          <span className="legend-color afternoon"></span> Afternoon
        </span>
        <span className="legend-item">
          <span className="legend-color evening"></span> Evening
        </span>
        <span className="legend-item">
          <span className="legend-color custom"></span> Custom
        </span>
      </div>

      <div
        ref={calRef}
        className="fc fc-media-screen"
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 6,
          background: "linear-gradient(180deg,#fff, #fafafa)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      />

      {drawer.open && (
        <ShiftEditDrawer
          jwt={jwt}
          isAdmin={isAdmin}
          assignables={assignables}
          shiftSettings={shiftSettings}
          shift={drawer.shift}
          onClose={() => setDrawer({ open: false, shift: null })}
          onSaved={async () => {
            setDrawer({ open: false, shift: null });
            await loadShifts();
          }}
          onDeleted={async () => {
            setDrawer({ open: false, shift: null });
            await loadShifts();
          }}
        />
      )}

      <style jsx>{`
        .shift-legend {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 0.25rem;
        }

        .legend-color.morning {
          background: #fbbf24;
        }

        .legend-color.afternoon {
          background: #f97316;
        }

        .legend-color.evening {
          background: #8b5cf6;
        }

        .legend-color.custom {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}

export default ShiftCalendar;

// ---------- Drawer component ----------
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
  const [shiftType, setShiftType] = React.useState(
    shift.shiftType === "morning" ||
      shift.shiftType === "afternoon" ||
      shift.shiftType === "evening"
      ? "predefined"
      : "custom"
  );
  const [predefinedShift, setPredefinedShift] = React.useState(
    shift.shiftType === "morning" ||
      shift.shiftType === "afternoon" ||
      shift.shiftType === "evening"
      ? shift.shiftType
      : "morning"
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

  // Update times when changing to predefined shift
  React.useEffect(() => {
    if (
      shiftType === "predefined" &&
      shiftSettings &&
      shiftSettings[predefinedShift]
    ) {
      const shiftConfig = shiftSettings[predefinedShift];
      setStartTime(shiftConfig.startTime);
      setEndTime(shiftConfig.endTime);
    }
  }, [predefinedShift, shiftSettings, shiftType]);

  const calculateShiftDates = () => {
    let start, end;

    if (shiftType === "predefined" && shiftSettings) {
      const shiftConfig = shiftSettings[predefinedShift];
      if (!shiftConfig) throw new Error("Invalid shift configuration.");

      start = new Date(`${startDate}T${shiftConfig.startTime}:00`);

      if (
        shiftConfig.isOvernight ||
        (predefinedShift === "evening" &&
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
        shiftType: shiftType === "predefined" ? predefinedShift : "custom",
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

  const getPredefinedShiftLabel = (type) => {
    if (!shiftSettings || !shiftSettings[type]) return type;
    const shiftConfig = shiftSettings[type];
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${
      shiftConfig.startTime
    } - ${shiftConfig.endTime}${shiftConfig.isOvernight ? " +1" : ""})`;
  };

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
          <label>Shift Type</label>
          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            disabled={!isAdmin || loading}
          >
            <option value="predefined">Predefined Shift</option>
            <option value="custom">Custom Hours</option>
          </select>
        </div>

        {shiftType === "predefined" && (
          <div className="form-group">
            <label>Select Shift</label>
            <select
              value={predefinedShift}
              onChange={(e) => setPredefinedShift(e.target.value)}
              disabled={!isAdmin || loading}
            >
              {shiftSettings?.morning?.enabled !== false && (
                <option value="morning">
                  {getPredefinedShiftLabel("morning")}
                </option>
              )}
              {shiftSettings?.afternoon?.enabled !== false && (
                <option value="afternoon">
                  {getPredefinedShiftLabel("afternoon")}
                </option>
              )}
              {shiftSettings?.evening?.enabled !== false && (
                <option value="evening">
                  {getPredefinedShiftLabel("evening")}
                </option>
              )}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>{shiftType === "custom" ? "Start Date" : "Date"}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!isAdmin || loading}
          />
        </div>

        {shiftType === "custom" && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
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
            <div className="form-group">
              <label>End Date (optional for multi-day)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={!isAdmin || loading}
              />
            </div>
          </>
        )}

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
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isAdmin || loading}
            rows="3"
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
          width: 400px;
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
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
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
        }
      `}</style>
    </div>
  );
}
