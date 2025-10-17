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

  const loadShifts = React.useCallback(async () => {
    try {
      setErr("");
      let from, to;
      if (fcRef.current) {
        const v = fcRef.current.view;
        
        // For day view, expand the range to catch overnight shifts
        if (v.type === 'timeGridDay') {
          // Start one day earlier and end one day later to catch overnight shifts
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
        
        // Debug logging for development
        // console.log('Loading shifts for view:', v.type, 'from:', from, 'to:', to);
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
        let color = "#3b82f6"; // Default blue for custom
        let shiftLabel = "";

        if (s.shiftType) {
          switch (s.shiftType) {
            case "morning":
              color = "#fbbf24"; // Amber for morning
              shiftLabel = " (Morning)";
              break;
            case "afternoon":
              color = "#fb923c"; // Orange for afternoon
              shiftLabel = " (Afternoon)";
              break;
            case "evening":
              color = "#9333ea"; // Purple for evening
              shiftLabel = " (Evening)";
              break;
            default:
              shiftLabel = " (Custom)";
          }
        }
        
        // Create the event object - ensure proper date formatting for FullCalendar
        // Parse dates carefully
        let startDate, endDate;
        
        if (typeof s.start === 'string') {
          startDate = new Date(s.start);
        } else {
          startDate = s.start;
        }
        
        if (typeof s.end === 'string') {
          endDate = new Date(s.end);
        } else {
          endDate = s.end;
        }
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('Invalid dates for shift:', s);
          return null;
        }
        
        // Calculate duration
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        
        // Pass the properly parsed Date objects to FullCalendar
        return {
          id: s._id,
          title: (s.staff?.name || "Unknown") + shiftLabel,
          start: startDate, // Use parsed Date object with correct local timezone
          end: endDate, // Use parsed Date object with correct local timezone
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          allDay: false, // Explicitly set to false to ensure time-based events
          display: 'block', // Force block display for this specific event
          overlap: true,
          editable: false,
          extendedProps: {
            notes: s.notes || "",
            staffId: s.staff?.id || s.staffUserId,
            shiftType: s.shiftType || "custom",
            duration: durationHours,
          },
        };
      });

      if (fcRef.current) {
        // Clear all events
        fcRef.current.removeAllEvents();
        
        // Filter out null events and add each event individually to ensure proper rendering
        const validEvents = evs.filter(event => event !== null);
        validEvents.forEach(event => {
          fcRef.current.addEvent(event);
        });
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
      height: 650,
      slotMinTime: "00:00:00",
      slotMaxTime: "24:00:00",
      slotDuration: "01:00:00", // 1 hour slots
      slotLabelInterval: "01:00:00", // Show label every hour
      nowIndicator: true,
      eventOverlap: true,
      selectable: false,
      editable: false,
      displayEventTime: true,
      displayEventEnd: true, // Show end time
      eventTimeFormat: { 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true
      },
      slotLabelFormat: {
        hour: "numeric",
        hour12: true
      },
      firstDay: 1, // Monday
      weekends: true,
      timeZone: "local", // Use local timezone
      eventDisplay: 'block', // Force block display for events
      dayMaxEvents: false, // Don't limit events per day
      eventMinHeight: 15, // Minimum height for events
      expandRows: true, // Allow rows to expand for overlapping events
      slotEventOverlap: false, // Don't overlap events in time slots
      eventOrderStrict: true, // Maintain strict event ordering
      nextDayThreshold: '00:00:00', // Events ending at midnight belong to that day
      eventDidMount: (info) => {
        // Only apply fixes to time grid views (week/day), not day grid (month)
        if (info.view.type.includes('timeGrid')) {
          const event = info.event;
          const el = info.el;
          
          // Debug what's happening with positioning
          const start = event.start;
          const end = event.end;
          if (start && end) {
            const durationMs = end.getTime() - start.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            
            // Get all the parent elements
            const harness = el.closest('.fc-timegrid-event-harness-inset');
            const outerHarness = el.closest('.fc-timegrid-event-harness');
            const timeGrid = el.closest('.fc-timegrid-body');
            const slotElements = timeGrid?.querySelectorAll('.fc-timegrid-slot');
            
            console.log('Detailed positioning debug:', {
              eventTitle: event.title,
              startHour: start.getHours(),
              viewType: info.view.type,
              
              // Element positions
              elementTop: el.style.top,
              elementComputedTop: window.getComputedStyle(el).top,
              elementVisible: el.offsetHeight > 0,
              
              // Harness positions  
              harnessTop: harness?.style.top,
              harnessComputedTop: harness ? window.getComputedStyle(harness).top : 'none',
              harnessVisible: harness ? harness.offsetHeight > 0 : false,
              
              // Outer harness positions
              outerHarnessTop: outerHarness?.style.top,
              outerHarnessComputedTop: outerHarness ? window.getComputedStyle(outerHarness).top : 'none',
              outerHarnessVisible: outerHarness ? outerHarness.offsetHeight > 0 : false,
              
              // Parent container info
              timeGridBody: timeGrid,
              parentColumn: el.closest('.fc-timegrid-col'),
              
              // Elements
              element: el,
              harness: harness,
              outerHarness: outerHarness
            });
            
            // Calculate expected position based on start hour
            let hourHeight = 60;
            if (slotElements && slotElements.length > 0) {
              hourHeight = slotElements[0].offsetHeight;
            }
            
            const expectedHeight = Math.max(20, durationHours * hourHeight);
            const expectedTop = start.getHours() * hourHeight + (start.getMinutes() / 60) * hourHeight;
            
            console.log('Expected positioning:', {
              expectedTop: expectedTop + 'px',
              expectedHeight: expectedHeight + 'px',
              hourHeight: hourHeight
            });
            
            // Different approach for day view vs week view
            const applyPositioning = () => {
              if (info.view.type === 'timeGridDay') {
                // Day view specific approach
                if (outerHarness) {
                  outerHarness.style.setProperty('top', expectedTop + 'px', 'important');
                  outerHarness.style.setProperty('height', expectedHeight + 'px', 'important');
                  outerHarness.style.setProperty('position', 'absolute', 'important');
                  outerHarness.style.setProperty('left', '0', 'important');
                  outerHarness.style.setProperty('right', '0', 'important');
                  outerHarness.style.setProperty('z-index', '1', 'important');
                  outerHarness.style.setProperty('display', 'block', 'important');
                  outerHarness.style.setProperty('visibility', 'visible', 'important');
                }
                
                if (harness) {
                  harness.style.setProperty('height', expectedHeight + 'px', 'important');
                  harness.style.setProperty('position', 'relative', 'important');
                  harness.style.setProperty('display', 'block', 'important');
                  harness.style.setProperty('visibility', 'visible', 'important');
                }
                
                el.style.setProperty('height', '100%', 'important');
                el.style.setProperty('position', 'absolute', 'important');
                el.style.setProperty('top', '0', 'important');
                el.style.setProperty('left', '0', 'important');
                el.style.setProperty('right', '2px', 'important');
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
                el.style.setProperty('z-index', '1', 'important');
              } else {
                // Week view approach (working)
                if (outerHarness) {
                  outerHarness.style.setProperty('top', expectedTop + 'px', 'important');
                  outerHarness.style.setProperty('height', expectedHeight + 'px', 'important');
                  outerHarness.style.setProperty('position', 'absolute', 'important');
                }
                
                if (harness) {
                  harness.style.setProperty('height', expectedHeight + 'px', 'important');
                  harness.style.setProperty('position', 'relative', 'important');
                }
                
                el.style.setProperty('height', '100%', 'important');
                el.style.setProperty('position', 'absolute', 'important');
                el.style.setProperty('top', '0', 'important');
                el.style.setProperty('left', '0', 'important');
                el.style.setProperty('right', '2px', 'important');
              }
            };
            
            // Apply immediately
            applyPositioning();
            
            // Also apply after a small delay to handle any FullCalendar re-rendering
            setTimeout(applyPositioning, 10);
            setTimeout(applyPositioning, 50);
            
            // Use MutationObserver to reapply if FullCalendar changes the positioning
            if (outerHarness && !outerHarness.dataset.observerAttached) {
              outerHarness.dataset.observerAttached = 'true';
              const observer = new MutationObserver(() => {
                if (outerHarness.style.top !== expectedTop + 'px') {
                  console.log('FullCalendar changed positioning, reapplying...');
                  applyPositioning();
                }
              });
              observer.observe(outerHarness, { 
                attributes: true, 
                attributeFilter: ['style'] 
              });
            }
            
            console.log('Applied positioning for:', event.title, expectedTop + 'px');
          }
        }
      },
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
          background: #fb923c;
        }

        .legend-color.evening {
          background: #9333ea;
        }

        .legend-color.custom {
          background: #3b82f6;
        }
      `}</style>
      
      <style jsx global>{`
        /* FullCalendar Event Styling for Block Display */
        .fc-event {
          border: none !important;
          padding: 2px 4px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          transition: opacity 0.2s !important;
          overflow: hidden !important;
        }

        .fc-event:hover {
          opacity: 0.85 !important;
        }

        /* Time Grid Event Styling - Force Block Display */
        .fc-timegrid-event {
          border-radius: 4px !important;
          overflow: hidden !important;
          min-height: 20px !important;
          display: block !important;
          height: 100% !important;
        }

        .fc-timegrid-event .fc-event-main {
          padding: 4px 6px !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }

        .fc-timegrid-event-harness {
          margin-right: 2px !important;
          /* Force the harness to respect the calculated height */
          height: 100% !important;
        }

        /* Let FullCalendar handle positioning, only enhance styling */
        .fc-timegrid-event-harness-inset .fc-timegrid-event {
          box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.2) !important;
          /* Don't override any positioning - let our JavaScript handle height only */
        }

        /* Force FullCalendar to calculate correct heights */
        .fc-timegrid-col-events {
          position: relative !important;
        }
        
        /* Let our JavaScript eventDidMount handle height calculations */
        .fc-timegrid-event-harness {
          /* Don't override height - let our JS handle it */
        }

        /* Day Grid Event Styling */
        .fc-daygrid-event {
          border-radius: 4px !important;
          padding: 2px 4px !important;
          margin: 1px 2px !important;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 2px 4px !important;
        }

        /* Event Title Text */
        .fc-event-title {
          font-weight: 500 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          font-size: 11px !important;
          line-height: 1.2 !important;
        }

        .fc-event-time {
          font-weight: 600 !important;
          color: white !important;
          opacity: 0.95 !important;
          font-size: 10px !important;
          line-height: 1.2 !important;
        }

        /* List View Styling */
        .fc-list-event-dot {
          border-width: 6px !important;
        }

        /* List view specific text color fix */
        .fc-list-event-title, 
        .fc-list-event-time {
          color: #000000 !important;
        }

        /* More Events Popover */
        .fc-popover .fc-event {
          margin: 2px 0 !important;
        }

        /* Ensure proper contrast for time grid views */
        .fc-timegrid-event {
          color: white !important;
        }

        /* Ensure proper contrast for day grid views */
        .fc-daygrid-event {
          color: white !important;
        }

        /* Remove default borders */
        .fc-timegrid-event-harness-inset .fc-timegrid-event,
        .fc-daygrid-event-harness .fc-daygrid-event {
          border: none !important;
        }

        /* Improve visibility of overlapping events */
        .fc-timegrid-event-harness {
          z-index: 1 !important;
        }

        .fc-timegrid-event-harness:hover {
          z-index: 2 !important;
        }

        /* Force time-based events to span their full duration */
        .fc-timegrid-slot-lane {
          position: relative !important;
        }

        /* Ensure events don't collapse to single line height */
        .fc-timegrid-col .fc-timegrid-event-harness {
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
        }

        /* Override any min-height restrictions */
        .fc-timegrid-event .fc-event-main-frame {
          height: 100% !important;
        }

        /* Additional fixes for event duration display */
        .fc-timegrid-event-harness-inset {
          inset: 0 !important;
        }

        /* Ensure event content spans full height */
        .fc-event-main {
          height: 100% !important;
          box-sizing: border-box !important;
        }

        /* Fix for events that might not be displaying correct duration */
        .fc-timegrid-col-events {
          position: relative !important;
        }

        .fc-timegrid-event-harness[style*="top"][style*="height"] {
          /* Preserve inline styles for positioning and height */
        }
      `}</style>
    </div>
  );
}

export default ShiftCalendar;
