import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";

function CareTaskCalendar({ tasks, onTaskClick }) {
  const elRef = React.useRef(null);
  const calendarRef = React.useRef(null);

  const mapTasksToEvents = (tasks) => {
    const now = new Date();

    return (tasks || [])
      .map((t) => {
        // Determine if task is overdue (past due date and not completed)
        const dueDate = new Date(t.dueDate);
        const isOverdue = t.status === "Scheduled" && dueDate < now;

        // Determine color based on status and overdue state
        const getColor = () => {
          if (t.status === "Completed") return "#10b981"; // Green
          if (t.status === "Missed" || isOverdue) return "#ef4444"; // Red
          if (t.status === "Scheduled") return "#3b82f6"; // Blue
          if (t.status === "Returned") return "#d97706"; // Orange
          return "#6b7280"; // Gray fallback
        };

        // Determine color based on status
        const color = getColor();

        // Timed event
        if (t.scheduleType === "Timed" && t.startAt && t.endAt) {
          return {
            id: t._id,
            title: t.title,
            start: t.startAt,
            end: t.endAt,
            allDay: false,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff",
            display: "block", // Force block display instead of dot
          };
        }

        // All-day event
        const d = new Date(t.dueDate);
        if (Number.isNaN(d.getTime())) {
          return null;
        }
        const end = new Date(d);
        end.setDate(end.getDate() + 1);

        return {
          id: t._id,
          title: t.title,
          start: d.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
        };
      })
      .filter(Boolean);
  };

  // Initialize calendar once
  React.useEffect(() => {
    if (!elRef.current) return;

    const calendar = new Calendar(elRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      },
      height: "auto",
      nowIndicator: true,
      timeZone: "local",
      eventDisplay: "block", // Display all events as blocks instead of dots
      displayEventTime: false, // Don't display event time in month view
      eventClick: (info) => {
        const taskId = info.event.id;
        const task = tasks.find((t) => t._id === taskId);
        if (task && onTaskClick) {
          onTaskClick(task);
        }
      },
      events: [],
    });

    calendar.render();
    calendarRef.current = calendar;

    return () => {
      calendar.destroy();
      calendarRef.current = null;
    };
  }, []);

  // Update events whenever tasks change
  React.useEffect(() => {
    if (!calendarRef.current || !tasks) return;
    const calendar = calendarRef.current;
    const events = mapTasksToEvents(tasks);

    // Remove all existing events
    calendar.removeAllEvents();

    // Add new events
    calendar.addEventSource(events);

    // Force refresh to ensure list view updates
    calendar.refetchEvents();
    calendar.updateSize();
  }, [tasks]);

  return (
    <div className="calendar-container">
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot scheduled"></span>
          <span className="legend-label">Scheduled</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot completed"></span>
          <span className="legend-label">Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot overdue"></span>
          <span className="legend-label">Overdue</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot returned"></span>
          <span className="legend-label">Returned</span>
        </div>
      </div>
      <div ref={elRef} />

      <style jsx>{`
        .calendar-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .calendar-legend {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }

        .legend-dot.scheduled {
          background: #3b82f6;
        }

        .legend-dot.completed {
          background: #10b981;
        }

        .legend-dot.overdue {
          background: #ef4444;
        }

        .legend-dot.returned {
          background: #d97706;
        }

        .legend-label {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .calendar-legend {
            gap: 1rem;
          }

          .legend-label {
            font-size: 0.8125rem;
          }
        }

        /* Hide time prefix in month view for timed events */
        :global(.fc-daygrid-event .fc-event-time),
        :global(.fc-event-time) {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default CareTaskCalendar;
