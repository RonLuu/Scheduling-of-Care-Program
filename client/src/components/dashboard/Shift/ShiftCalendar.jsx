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
  const [err, setErr] = React.useState("");

  const loadShifts = React.useCallback(async () => {
    try {
      setErr("");
      // get visible range
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

      const evs = d.map((s) => ({
        id: s._id,
        title: s.staff?.name || "Unknown",
        start: s.start,
        end: s.end,
        allDay: !!s.allDay,
        extendedProps: {
          notes: s.notes || "",
          staffId: s.staff?.id || s.staffUserId,
        },
      }));

      // Replace events without re-initializing calendar
      if (fcRef.current) {
        fcRef.current.removeAllEvents();
        fcRef.current.addEventSource(evs);
      }
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [jwt, personId]);

  // load staff list for editor
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

  // INIT CALENDAR ONCE (don’t depend on events.length)
  React.useEffect(() => {
    if (!calRef.current) return;

    // destroy if somehow exists
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

      // visual polish
      themeSystem: "standard",
      dayMaxEvents: true,
      eventBackgroundColor: "#2563eb",
      eventBorderColor: "#1d4ed8",
      eventTextColor: "#fff",
      firstDay: 1, // Monday
      aspectRatio: 1.8,
      slotEventOverlap: true,

      // always reload when the visible range changes, but do NOT re-init
      datesSet: () => loadShifts(),
      eventClick: (info) => {
        const e = info.event;
        setDrawer({
          open: true,
          shift: {
            id: e.id,
            title: e.title,
            allDay: e.allDay,
            start: e.start,
            end: e.end,
            notes: e.extendedProps?.notes || "",
            staffId: e.extendedProps?.staffId || "",
          },
        });
      },
    });

    calendar.render();
    fcRef.current = calendar;
    // initial load
    loadShifts();

    return () => {
      calendar.destroy();
      fcRef.current = null;
    };
  }, [loadShifts]); // <-- no events or view here

  // external refresh (person change / created / edited / deleted)
  React.useEffect(() => {
    if (personId) loadShifts();
  }, [personId, refreshKey, loadShifts]);

  return (
    <div style={{ marginTop: 12 }}>
      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}
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
    </div>
  );
}

export default ShiftCalendar;

// ---------- Drawer component ----------
function ShiftEditDrawer({
  jwt,
  isAdmin,
  assignables,
  shift,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [staffUserId, setStaffUserId] = React.useState(shift.staffId || "");
  const [mode, setMode] = React.useState(shift.allDay ? "allDay" : "timed");

  // FIX: build local YYYY-MM-DD (no toISOString)
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

  const [date, setDate] = React.useState(
    shift.start ? toYMDLocal(shift.start) : ""
  );
  const [startTime, setStartTime] = React.useState(
    shift.start ? toHM(shift.start) : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    shift.end ? toHM(shift.end) : "17:00"
  );
  const [notes, setNotes] = React.useState(shift.notes || "");
  const [err, setErr] = React.useState("");

  const save = async () => {
    try {
      setErr("");
      if (!isAdmin) throw new Error("Only Admin can edit shifts.");
      if (!staffUserId) throw new Error("Choose a staff member.");
      if (!date) throw new Error("Pick a date.");

      let payload = { staffUserId, notes, allDay: mode === "allDay" };
      if (mode === "allDay") {
        // all-day: 00:00 local to next day 00:00 local
        const s = new Date(`${date}T00:00:00`);
        const e = new Date(`${date}T00:00:00`);
        e.setDate(e.getDate() + 1);
        payload.start = s.toISOString();
        payload.end = e.toISOString();
      } else {
        if (!startTime || !endTime || endTime <= startTime) {
          throw new Error("Invalid start/end time.");
        }
        payload.start = new Date(`${date}T${startTime}:00`).toISOString();
        payload.end = new Date(`${date}T${endTime}:00`).toISOString();
      }

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
    }
  };

  const del = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this shift?")) return;
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
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 90,
        bottom: 16,
        width: 360,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 14,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>Edit shift</h4>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}

      <div className="row" style={{ marginTop: 8 }}>
        <div>
          <label>Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={!isAdmin}
          >
            <option value="allDay">All-day</option>
            <option value="timed">Timed</option>
          </select>
        </div>
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!isAdmin}
          />
        </div>
      </div>

      {mode === "timed" && (
        <div className="row">
          <div>
            <label>Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label>End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>
      )}

      <div className="row">
        <div>
          <label>Staff</label>
          <select
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
            disabled={!isAdmin}
          >
            {assignables.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row">
        <div style={{ width: "100%" }}>
          <label>Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isAdmin}
          />
        </div>
      </div>

      {isAdmin && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={save}>
            Save
          </button>
          <button className="danger" onClick={del}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
