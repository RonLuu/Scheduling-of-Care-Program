import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ShiftEditDrawer from "./ShiftEditDrawer.jsx";
import CalendarMonth from "../Calendar/CalendarMonth.jsx"
import CalendarWeek from "../Calendar/CalendarWeek.jsx"
import "./ShiftCalendar.css"
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
          allDay: false, // Never all-day anymore
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
    <div className="shiftcalendar">
      {err && <p style={{ color: "#b91c1c", margin:"0" }}>Error: {err}</p>}

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

      <div className="shiftcalendar-view">
        <CalendarWeek/>
      </div>
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
    </div>
  );
}

export default ShiftCalendar;
