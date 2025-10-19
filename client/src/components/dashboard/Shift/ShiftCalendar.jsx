import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ShiftEditDrawer from "./ShiftEditDrawer.jsx";

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

  // Helper function to detect overlapping events
  const detectOverlaps = React.useCallback(() => {
    if (!fcRef.current) return;

    // Get all time grid columns
    const columns = document.querySelectorAll(".fc-timegrid-col");

    columns.forEach((column) => {
      // Get all event harnesses in this column
      const harnesses = Array.from(
        column.querySelectorAll(".fc-timegrid-event-harness")
      );

      if (harnesses.length === 0) return;

      // Get events with their time ranges
      const events = harnesses
        .map((harness) => {
          const event = harness.querySelector(".fc-timegrid-event");
          if (!event) return null;

          const style = window.getComputedStyle(harness);
          const top = parseFloat(style.top);
          const height = parseFloat(style.height);

          return {
            harness,
            top,
            bottom: top + height,
            element: event,
          };
        })
        .filter((e) => e !== null);

      // For each event, find overlapping events
      events.forEach((event, index) => {
        const overlapping = events.filter((other, otherIndex) => {
          if (index === otherIndex) return false;
          // Check if they overlap
          return !(event.bottom <= other.top || event.top >= other.bottom);
        });

        const totalOverlapping = overlapping.length + 1; // Including self
        const maxOverlap = Math.min(totalOverlapping, 6); // Cap at 6

        // Calculate which position this event should be in
        let position = 0;
        overlapping.forEach((other) => {
          const otherIndex = events.indexOf(other);
          if (otherIndex < index) {
            position++;
          }
        });

        // Apply dynamic width and position
        const width = 100 / maxOverlap;
        const left = (100 / maxOverlap) * position;

        event.harness.style.setProperty("width", `${width}%`, "important");
        event.harness.style.setProperty("left", `${left}%`, "important");
        event.harness.style.setProperty("right", "auto", "important");
      });
    });
  }, []);

  const loadShifts = React.useCallback(async () => {
    try {
      setErr("");
      let from, to;
      if (fcRef.current) {
        const v = fcRef.current.view;

        if (v.type === "timeGridDay") {
          const startDate = new Date(v.activeStart);
          startDate.setDate(startDate.getDate() - 1);
          const endDate = new Date(v.activeEnd);
          endDate.setDate(endDate.getDate() + 1);

          from = startDate.toISOString().slice(0, 10);
          to = endDate.toISOString().slice(0, 10);
        } else {
          from = v.activeStart.toISOString().slice(0, 10);
          to = v.activeEnd.toISOString().slice(0, 10);
        }
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
        let color = "#3b82f6";
        let shiftLabel = "";

        if (s.shiftType) {
          switch (s.shiftType) {
            case "morning":
              color = "#fbbf24";
              shiftLabel = " (Morning)";
              break;
            case "afternoon":
              color = "#fb923c";
              shiftLabel = " (Afternoon)";
              break;
            case "evening":
              color = "#9333ea";
              shiftLabel = " (Evening)";
              break;
            default:
              shiftLabel = " (Custom)";
          }
        }

        let startDate, endDate;

        if (typeof s.start === "string") {
          startDate = new Date(s.start);
        } else {
          startDate = s.start;
        }

        if (typeof s.end === "string") {
          endDate = new Date(s.end);
        } else {
          endDate = s.end;
        }

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error("Invalid dates for shift:", s);
          return null;
        }

        const durationMs = endDate.getTime() - startDate.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        return {
          id: s._id,
          title: (s.staff?.name || "Unknown") + shiftLabel,
          start: startDate,
          end: endDate,
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
          allDay: false,
          display: "block",
          overlap: true,
          editable: false,
          extendedProps: {
            notes: s.notes || "",
            staffId: s.staff?.id || s.staffUserId,
            staffName: s.staff?.name || "Unknown",
            shiftType: s.shiftType || "custom",
            duration: durationHours,
          },
        };
      });

      if (fcRef.current) {
        fcRef.current.removeAllEvents();
        const validEvents = evs.filter((event) => event !== null);
        validEvents.forEach((event) => {
          fcRef.current.addEvent(event);
        });

        // Apply overlap detection after events are rendered
        setTimeout(() => {
          detectOverlaps();
        }, 100);
      }
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [jwt, personId, detectOverlaps]);

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
        left: "prev,next",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      },
      height: 750,
      slotMinTime: "00:00:00",
      slotMaxTime: "24:00:00",
      slotDuration: "01:00:00",
      slotLabelInterval: "02:00:00",
      nowIndicator: true,
      eventOverlap: true,
      selectable: true,
      editable: false,
      displayEventTime: true,
      displayEventEnd: true,
      eventTimeFormat: {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      },
      slotLabelFormat: {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      },
      firstDay: 1,
      weekends: true,
      timeZone: "local",
      eventDisplay: "block",
      dayMaxEvents: false,
      eventMinHeight: 20,
      expandRows: true,
      slotEventOverlap: true,
      nextDayThreshold: "00:00:00",
      eventDidMount: (info) => {
        if (info.view.type.includes("timeGrid")) {
          const event = info.event;
          const el = info.el;

          const start = event.start;
          const end = event.end;
          if (start && end) {
            const durationMs = end.getTime() - start.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);

            const harness = el.closest(".fc-timegrid-event-harness-inset");
            const outerHarness = el.closest(".fc-timegrid-event-harness");
            const timeGrid = el.closest(".fc-timegrid-body");
            const slotElements =
              timeGrid?.querySelectorAll(".fc-timegrid-slot");

            let hourHeight = 60;
            if (slotElements && slotElements.length > 0) {
              hourHeight = slotElements[0].offsetHeight;
            }

            const expectedHeight = Math.max(20, durationHours * hourHeight);
            const expectedTop =
              start.getHours() * hourHeight +
              (start.getMinutes() / 60) * hourHeight;

            const applyPositioning = () => {
              if (outerHarness) {
                outerHarness.style.setProperty(
                  "top",
                  expectedTop + "px",
                  "important"
                );
                outerHarness.style.setProperty(
                  "height",
                  expectedHeight + "px",
                  "important"
                );
                outerHarness.style.setProperty(
                  "pointer-events",
                  "auto",
                  "important"
                );
                outerHarness.style.setProperty(
                  "cursor",
                  "pointer",
                  "important"
                );
              }

              if (harness) {
                harness.style.setProperty(
                  "height",
                  expectedHeight + "px",
                  "important"
                );
                harness.style.setProperty(
                  "pointer-events",
                  "auto",
                  "important"
                );
                harness.style.setProperty("cursor", "pointer", "important");
              }

              el.style.setProperty("pointer-events", "auto", "important");
              el.style.setProperty("cursor", "pointer", "important");
            };

            applyPositioning();
            setTimeout(applyPositioning, 10);
            setTimeout(applyPositioning, 50);

            if (outerHarness && !outerHarness.dataset.observerAttached) {
              outerHarness.dataset.observerAttached = "true";
              const observer = new MutationObserver(() => {
                if (outerHarness.style.top !== expectedTop + "px") {
                  applyPositioning();
                }
              });
              observer.observe(outerHarness, {
                attributes: true,
                attributeFilter: ["style"],
              });
            }
          }
        }

        // Trigger overlap detection after mount
        setTimeout(() => detectOverlaps(), 50);
      },
      datesSet: () => {
        loadShifts();
      },
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
            staffName: e.extendedProps?.staffName || "",
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
  }, [loadShifts, detectOverlaps]);

  React.useEffect(() => {
    if (personId) loadShifts();
  }, [personId, refreshKey, loadShifts]);

  return (
    <div className="shift-calendar-wrapper">
      {err && <p className="error-message">Error: {err}</p>}

      {/* Legend */}
      <div className="shift-legend">
        <span className="legend-title">Shift Types:</span>
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

      <div ref={calRef} className="calendar-container" />

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
        .shift-calendar-wrapper {
          margin-top: 1.5rem;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
          border-left: 4px solid #dc2626;
        }

        .shift-legend {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
        }

        .legend-title {
          font-weight: 600;
          color: #374151;
          margin-right: 0.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #6b7280;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 0.375rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .legend-color.morning {
          background: #fbbf24;
        }

        .legend-color.afternoon {
          background: #fb923c;
        }

        .legend-color.evening {
          background: #9333ea;
        }

        .legend-color.custom {
          background: #3b82f6;
        }

        .calendar-container {
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          padding: 1.5rem;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
      `}</style>

      <style jsx global>{`
        /* Enhanced Calendar Styling */
        .fc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .fc .fc-toolbar-title {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .fc .fc-button {
          padding: 0.625rem 1.125rem !important;
          font-weight: 500 !important;
          border-radius: 0.5rem !important;
          transition: all 0.2s !important;
          font-size: 0.875rem !important;
        }

        .fc .fc-button-primary {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }

        .fc .fc-button-primary:hover {
          background: #2563eb !important;
          border-color: #2563eb !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        }

        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #e5e7eb !important;
        }

        .fc-col-header-cell {
          padding: 1rem 0.5rem !important;
          font-weight: 600 !important;
          font-size: 0.875rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #6b7280 !important;
          background: #f9fafb !important;
        }

        .fc-timegrid-slot {
          height: 4rem !important;
        }

        .fc-timegrid-slot-label {
          font-size: 0.875rem !important;
          color: #6b7280 !important;
          padding: 0.5rem !important;
          font-weight: 500 !important;
        }

        .fc-event {
          border: none !important;
          padding: 0.375rem 0.5rem !important;
          font-size: 0.813rem !important;
          font-weight: 500 !important;
          border-radius: 0.5rem !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          overflow: hidden !important;
        }

        .fc-event:hover {
          opacity: 0.9 !important;
          transform: translateX(2px);
        }

        .fc-timegrid-event {
          border-radius: 0.5rem !important;
          overflow: hidden !important;
          min-height: 20px !important;
          display: block !important;
          height: 100% !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }

        .fc-timegrid-event:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
        }

        .fc-timegrid-event .fc-event-main {
          padding: 0.5rem !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
        }

        /* Dynamic overlap positioning - will be overridden by JavaScript */
        .fc-timegrid-event-harness {
          margin-right: 3px !important;
          height: 100% !important;
          position: absolute !important;
          width: 100% !important;
        }

        .fc-timegrid-event-harness-inset .fc-timegrid-event {
          cursor: pointer !important;
          pointer-events: auto !important;
        }

        .fc-timegrid-event-harness,
        .fc-timegrid-event-harness-inset,
        .fc-timegrid-event {
          cursor: pointer !important;
          pointer-events: auto !important;
        }

        .fc-timegrid-col-events {
          pointer-events: auto !important;
          position: relative !important;
        }

        .fc-daygrid-event {
          border-radius: 0.5rem !important;
          padding: 0.25rem 0.5rem !important;
          margin: 0.125rem 0.25rem !important;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 0.25rem 0.5rem !important;
        }

        .fc-event-title {
          font-weight: 600 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          font-size: 0.813rem !important;
          line-height: 1.3 !important;
        }

        .fc-event-time {
          font-weight: 600 !important;
          color: white !important;
          opacity: 0.95 !important;
          font-size: 0.75rem !important;
          line-height: 1.3 !important;
          margin-bottom: 0.125rem !important;
        }

        .fc-list-event-dot {
          border-width: 6px !important;
        }

        .fc-list-event-title,
        .fc-list-event-time {
          color: #000000 !important;
        }

        .fc-popover .fc-event {
          margin: 0.25rem 0 !important;
        }

        .fc-timegrid-event {
          color: white !important;
        }

        .fc-daygrid-event {
          color: white !important;
        }

        .fc-timegrid-event-harness-inset .fc-timegrid-event,
        .fc-daygrid-event-harness .fc-daygrid-event {
          border: none !important;
        }

        .fc-timegrid-event-harness {
          z-index: 3 !important;
        }

        .fc-timegrid-event-harness:hover {
          z-index: 4 !important;
        }

        /* Fix z-index issue with now-indicator */
        .fc-timegrid-now-indicator-container {
          z-index: 2 !important;
          pointer-events: none !important;
        }

        .fc-timegrid-now-indicator-arrow,
        .fc-timegrid-now-indicator-line {
          pointer-events: none !important;
        }

        .fc-timegrid-slot-lane {
          position: relative !important;
        }

        .fc-timegrid-col .fc-timegrid-event-harness {
          left: 0 !important;
          right: 0 !important;
        }

        .fc-timegrid-event .fc-event-main-frame {
          height: 100% !important;
        }

        .fc-timegrid-event-harness-inset {
          inset: 0 !important;
        }

        .fc-event-main {
          height: 100% !important;
          box-sizing: border-box !important;
        }

        .fc-daygrid-day-number {
          padding: 0.5rem !important;
          font-weight: 600 !important;
          color: #374151 !important;
        }

        .fc-day-today {
          background: #eff6ff !important;
        }

        .fc-day-today .fc-daygrid-day-number {
          background: #3b82f6 !important;
          color: white !important;
          border-radius: 50% !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .fc-list-event:hover td {
          background: #f3f4f6 !important;
        }
      `}</style>
    </div>
  );
}

export default ShiftCalendar;
