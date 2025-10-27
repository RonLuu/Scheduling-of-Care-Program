import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";

function CareTaskCalendar({ tasks, onTaskClick }) {
  const elRef = React.useRef(null);
  const calendarRef = React.useRef(null);

  const mapTasksToEvents = (tasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    return (tasks || [])
      .map((t) => {
        // Determine if task is overdue (before today, not today itself)
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0); // Start of due date
        const isOverdue = t.status === "Scheduled" && dueDate < today;

        // Determine color based on status and overdue state
        const getColor = () => {
          if (t.status === "Completed") return "#10b981"; // Green
          if (t.status === "Missed" || isOverdue) return "#ef4444"; // Red
          if (t.status === "Scheduled") return "#3b82f6"; // Blue
          if (t.status === "Returned") return "#d97706"; // Orange
          return "#6b7280"; // Gray fallback
        };

        const color = getColor();

        // All tasks are treated as all-day events
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
      plugins: [dayGridPlugin, listPlugin],
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next",
        center: "title",
        right: "dayGridMonth,listMonth",
      },
      fixedWeekCount: false, // Only show weeks that belong to current month
      showNonCurrentDates: false, // Hide dates from other months
      aspectRatio: 1.8, // Better width-to-height ratio
      eventMaxStack: 5, // Limit number of events shown per day
      dayMaxEvents: true, // Show "+more" link when there are too many events
      eventTimeFormat: {
        // Better time format if you use timed events later
        hour: "2-digit",
        minute: "2-digit",
        meridiem: false,
      },
      height: "auto",
      nowIndicator: true,
      timeZone: "local",
      eventDisplay: "block",
      displayEventTime: false,
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
          gap: 1.5rem;
        }

        .calendar-legend {
          display: flex;
          gap: 1.5rem;
          padding: 1rem 1.5rem;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          flex-wrap: wrap;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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

        /* Global Calendar Styling */
        :global(.fc) {
          font-family: inherit;
        }

        /* Calendar Header */
        :global(.fc .fc-toolbar-title) {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        :global(.fc .fc-button) {
          background-color: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 0.5rem 1rem;
          font-weight: 500;
          text-transform: capitalize;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
        }

        :global(.fc .fc-button:hover) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .fc .fc-button {
          padding: 0.625rem 1.125rem !important;
          font-weight: 500 !important;
          border-radius: 0.5rem !important;
          transition: all 0.2s !important;
          font-size: 0.875rem !important;
        }

        .fc .fc-button-primary {
          background: #8189d2 !important;
          border-color: #8189d2 !important;
        }

        .fc .fc-button-primary:hover {
          background: #515788ff !important;
          border-color: #515788ff !important;
          transform: translateY(-1px);
        }

        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background: #515788ff !important;
          border-color: #515788ff !important;
        }

        /* Day Headers */
        :global(.fc .fc-col-header-cell) {
          padding: 0.75rem 0.5rem;
          background-color: #f9fafb;
          border-color: #e5e7eb;
          font-weight: 600;
          font-size: 0.875rem;
          color: #6b7280;
          text-transform: uppercase;
        }

        /* Day Cells */
        :global(.fc .fc-daygrid-day) {
          background-color: #ffffff;
          border-color: #e5e7eb;
        }

        :global(.fc .fc-daygrid-day:hover) {
          background-color: #f9fafb;
        }

        :global(.fc .fc-daygrid-day.fc-day-today) {
          background-color: #fef3c7 !important;
        }

        :global(.fc .fc-daygrid-day-number) {
          padding: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        :global(.fc .fc-day-today .fc-daygrid-day-number) {
          background-color: #f59e0b;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Events */
        :global(.fc-event) {
          border-radius: 0.5rem;
          padding: 0.375rem 0.625rem;
          margin: 0.25rem 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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

        :global(.fc-event:hover) {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        .fc-event:hover {
          opacity: 0.9 !important;
          transform: translateX(2px);
        }

        :global(.fc-event-title) {
          font-weight: 600;
          line-height: 1.4;
        }

        /* Day Grid Event Specific Styling */
        :global(.fc-daygrid-event) {
          border-radius: 0.5rem;
          padding: 0.375rem 0.625rem;
          margin: 0.25rem 0.375rem;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        :global(.fc-daygrid-block-event .fc-event-main) {
          padding: 0.375rem 0.625rem;
        }

        :global(.fc-daygrid-event .fc-event-title) {
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        /* More Link */
        :global(.fc-daygrid-more-link) {
          color: #667eea;
          font-weight: 500;
          font-size: 0.75rem;
          padding: 2px 4px;
        }

        :global(.fc-daygrid-more-link:hover) {
          color: #5a67d8;
          text-decoration: underline;
        }

        /* List View Styling */
        :global(.fc-list) {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        :global(.fc-list-day-cushion) {
          background-color: #f9fafb;
          padding: 0.75rem 1rem;
        }

        :global(.fc-list-day-text) {
          font-weight: 600;
          color: #1f2937;
        }

        :global(.fc-list-day-side-text) {
          color: #6b7280;
          font-weight: 500;
        }

        :global(.fc-list-event:hover) {
          background-color: #f9fafb;
        }

        :global(.fc-list-event-dot) {
          border-width: 5px;
        }

        :global(.fc-list-event-title) {
          font-weight: 500;
          color: #374151;
        }

        /* Remove border from last row */
        :global(.fc-scrollgrid-section-body > tr:last-child td) {
          border-bottom: none;
        }

        @media (max-width: 640px) {
          .calendar-legend {
            gap: 1rem;
            padding: 0.75rem 1rem;
          }

          .legend-label {
            font-size: 0.8125rem;
          }

          :global(.fc .fc-toolbar-title) {
            font-size: 1.25rem;
          }

          :global(.fc .fc-button) {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }

          :global(.fc .fc-daygrid-day-number) {
            font-size: 0.8125rem;
            padding: 0.375rem;
          }

          :global(.fc-event) {
            font-size: 0.8125rem;
            padding: 0.25rem 0.5rem;
            margin: 0.125rem 0.25rem;
            border-radius: 0.375rem;
          }

          :global(.fc .fc-col-header-cell) {
            padding: 0.5rem 0.25rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CareTaskCalendar;
