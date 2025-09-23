import React from "react";

function toYMD(d) {
  if (!d) return "";
  const dt = new Date(d);
  return new Date(
    dt.getFullYear(),
    dt.getMonth(),
    dt.getDate()
  ).toLocaleDateString("en-CA"); // yyyy-mm-dd
}

function toHHMM(d) {
  if (!d) return "";
  const dt = new Date(d);
  const h = String(dt.getHours()).padStart(2, "0");
  const m = String(dt.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function CareTaskRowEditor({ task, assignableUsers, onSaved, onCancel }) {
  const [title, setTitle] = React.useState(task.title || "");
  const [dueDate, setDueDate] = React.useState(toYMD(task.dueDate));
  const [scheduleType, setScheduleType] = React.useState(
    task.scheduleType || "AllDay"
  );
  const [startTime, setStartTime] = React.useState(
    toHHMM(task.startAt) || "09:00"
  );
  const [endTime, setEndTime] = React.useState(toHHMM(task.endAt) || "10:00");
  const [assignedTo, setAssignedTo] = React.useState(
    task.assignedToUserId || ""
  );

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const save = async () => {
    try {
      setBusy(true);
      setErr("");

      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");

      // Always keep original careNeedItemId relationship
      const patch = {
        title: title?.trim() || task.title,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : task.dueDate,
        scheduleType: scheduleType === "Timed" ? "Timed" : "AllDay",
        // keep the link to the original item
        careNeedItemId: task.careNeedItemId,
      };

      if (patch.scheduleType === "Timed") {
        if (!startTime || !endTime) {
          throw new Error(
            "Start and end time are required for Scheduled (Timed)."
          );
        }
        const base = new Date(`${dueDate || toYMD(task.dueDate)}T00:00:00`);
        const s = new Date(base);
        const [sh, sm] = startTime.split(":").map(Number);
        s.setHours(sh || 0, sm || 0, 0, 0);
        const e = new Date(base);
        const [eh, em] = endTime.split(":").map(Number);
        e.setHours(eh || 0, em || 0, 0, 0);
        if (e <= s) throw new Error("End time must be after start time.");
        patch.startAt = s;
        patch.endAt = e;
      } else {
        patch.startAt = null;
        patch.endAt = null;
      }

      patch.assignedToUserId = assignedTo || null;

      const r = await fetch(`/api/care-tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update task");
      onSaved?.();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "#fafafa", borderRadius: 8, padding: 12 }}>
      <h4 style={{ margin: "4px 0 8px" }}>Edit Task</h4>

      <div className="row">
        <div style={{ minWidth: 260 }}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label>Schedule</label>
          <select
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
          >
            <option value="AllDay">All-day</option>
            <option value="Timed">Scheduled (start/end)</option>
          </select>
        </div>

        {scheduleType === "Timed" && (
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
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
          </div>
        )}

        <div>
          <label>Assign to</label>
          <select
            value={assignedTo || ""}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {assignableUsers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <div style={{ color: "#b91c1c", marginTop: 8 }}>Error: {err}</div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button className="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export default CareTaskRowEditor;
