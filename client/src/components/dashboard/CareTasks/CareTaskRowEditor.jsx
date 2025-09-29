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

function CareTaskRowEditor({ task, onSaved, onCancel }) {
  const [title, setTitle] = React.useState(task.title || "");
  const [dueDate, setDueDate] = React.useState(toYMD(task.dueDate));
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const save = async () => {
    try {
      setBusy(true);
      setErr("");

      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");

      const patch = {
        title: title?.trim() || task.title,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : task.dueDate,
        // removed: scheduleType, startAt, endAt, assignedToUserId
        careNeedItemId: task.careNeedItemId,
      };

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
