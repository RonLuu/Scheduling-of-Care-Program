import React, { useEffect, useRef } from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

function ShiftCalendar({ jwt, clients }) {
  const calendarRef = useRef(null);
  const [personId, setPersonId] = React.useState("");
  const [events, setEvents] = React.useState([]);

  useEffect(() => {
    if (!personId) return;
    const load = async () => {
      const r = await fetch(`/api/shift-allocations?personId=${personId}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      setEvents(
        d.map((s) => ({
          id: s._id,
          title: `${s.staffUserId?.name || "Unknown"} (${s.notes || "Shift"})`,
          start: s.start,
          end: s.end,
          backgroundColor:
            s.staffUserId?.role === "Admin" ? "#2563eb" : "#10b981",
          borderColor: "#fff",
          textColor: "white",
        }))
      );
    };
    load();
  }, [personId, jwt]);

  useEffect(() => {
    if (!calendarRef.current) return;
    const calendar = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      height: "auto",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      },
      events,
      eventDidMount: (info) => {
        info.el.style.borderRadius = "6px";
        info.el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
      },
    });
    calendar.render();
    return () => calendar.destroy();
  }, [events]);

  return (
    <div className="card">
      <h3>Shift Calendar</h3>
      <div className="row">
        <label>Client</label>
        <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">— Select client —</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div ref={calendarRef} style={{ marginTop: 20 }} />
    </div>
  );
}

export default ShiftCalendar;
