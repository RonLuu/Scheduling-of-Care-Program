import React from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";

function CareTaskCalendar({ tasks }) {
  const elRef = React.useRef(null);
  const calendarRef = React.useRef(null);

  const mapTasksToEvents = (tasks) => {
    return (tasks || [])
      .map((t) => {
        // Timed event
        if (t.scheduleType === "Timed" && t.startAt && t.endAt) {
          return {
            id: t._id,
            title: `${t.title} · ${t.status}`,
            start: t.startAt,
            end: t.endAt,
            allDay: false,
            backgroundColor:
              t.status === "Completed"
                ? "#059669"
                : t.status === "Missed"
                ? "#b91c1c"
                : undefined,
            borderColor: "transparent",
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
          title: `${t.title} · ${t.status}`,
          start: d.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
          allDay: true,
          backgroundColor:
            t.status === "Completed"
              ? "#059669"
              : t.status === "Missed"
              ? "#b91c1c"
              : undefined,
          borderColor: "transparent",
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
      eventClick: (info) => {
        const e = info.event;
        alert(
          `${e.title}\nStart: ${e.start?.toLocaleString()}\nEnd: ${
            e.end?.toLocaleString() || "—"
          }`
        );
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
    if (!calendarRef.current) return;
    const calendar = calendarRef.current;
    calendar.removeAllEvents();
    calendar.addEventSource(mapTasksToEvents(tasks));
    calendar.updateSize();
  }, [tasks]);

  return <div ref={elRef} />;
}

export default CareTaskCalendar;
