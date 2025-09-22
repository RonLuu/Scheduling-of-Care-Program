import React from "react";

function ShiftAllocation({ jwt, clients, onShiftCreated }) {
  const [personId, setPersonId] = React.useState("");
  const [staff, setStaff] = React.useState([]);
  const [staffUserId, setStaffUserId] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const loadStaff = async () => {
      if (!personId) return;
      const r = await fetch(
        `/api/person-user-links/assignable-users?personId=${personId}`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );
      const d = await r.json();
      setStaff(
        d.filter((u) => u.role === "GeneralCareStaff" || u.role === "Admin")
      );
    };
    loadStaff();
  }, [personId, jwt]);

  const submit = async () => {
    try {
      if (!staffUserId || !personId || !start || !end) {
        throw new Error("Fill all required fields");
      }
      const r = await fetch("/api/shift-allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ personId, staffUserId, start, end, notes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create shift");
      setNotes("");
      onShiftCreated?.(d);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="card">
      <h3>Allocate Staff Shift</h3>
      {err && <p style={{ color: "red" }}>{err}</p>}
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
      {personId && (
        <>
          <div className="row">
            <label>Staff</label>
            <select
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
            >
              <option value="">— Select staff —</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label>Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="row">
            <label>End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="row">
            <label>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button className="primary" onClick={submit}>
            Allocate
          </button>
        </>
      )}
    </div>
  );
}

export default ShiftAllocation;
