import React from "react";

function ShiftAllocation({ jwt, personId, onCreated }) {
  const [assignables, setAssignables] = React.useState([]);
  const [staffUserId, setStaffUserId] = React.useState("");
  const [mode, setMode] = React.useState("allDay"); // "allDay" | "timed"
  const [date, setDate] = React.useState(""); // yyyy-mm-dd
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const load = async () => {
      if (!personId) return;
      const r = await fetch(
        `/api/person-user-links/assignable-users?personId=${personId}`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );
      const d = await r.json();
      // only Admin and GeneralCareStaff for shift assignment
      setAssignables(
        Array.isArray(d)
          ? d.filter((u) => u.role === "GeneralCareStaff" || u.role === "Admin")
          : []
      );
    };
    load().catch(() => {});
  }, [personId, jwt]);

  const submit = async () => {
    try {
      setErr("");
      if (!staffUserId) throw new Error("Choose a staff member.");
      if (!date) throw new Error("Pick a date.");
      let start, end, allDay;

      if (mode === "allDay") {
        allDay = true;
        const d = new Date(date + "T00:00:00");
        start = d.toISOString();
        const e = new Date(date + "T00:00:00");
        e.setDate(e.getDate() + 1);
        end = e.toISOString();
      } else {
        allDay = false;
        if (!startTime || !endTime) throw new Error("Provide start/end time.");
        if (endTime <= startTime)
          throw new Error("End time must be after start.");
        start = new Date(`${date}T${startTime}:00`).toISOString();
        end = new Date(`${date}T${endTime}:00`).toISOString();
      }

      const r = await fetch("/api/shift-allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          personId,
          staffUserId,
          allDay,
          start,
          end,
          notes: notes || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create shift");

      // clear form & refresh calendar
      setStaffUserId("");
      setMode("allDay");
      setDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      onCreated?.();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4>Allocate a Shift</h4>
      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}

      <div className="row">
        <div>
          <label>Staff</label>
          <select
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
          >
            <option value="">— Select staff —</option>
            {assignables.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
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
          />
        </div>

        {mode === "timed" && (
          <>
            <div>
              <label>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label>End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label>&nbsp;</label>
          <button className="primary" onClick={submit}>
            Create shift
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShiftAllocation;
