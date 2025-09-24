import React from "react";
import ShiftAllocation from "./ShiftAllocation.jsx";
import ShiftCalendar from "./ShiftCalendar.jsx";

function ShiftScheduler({ jwt, me, clients }) {
  const [personId, setPersonId] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // default to first client (if linked to multiple)
  React.useEffect(() => {
    if (!personId && clients?.length) setPersonId(clients[0]._id);
  }, [clients, personId]);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="card">
      <h3>Shift Scheduling</h3>

      <div className="row">
        <div>
          <label>Client</label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>&nbsp;</label>
          <button className="secondary" onClick={bump} disabled={!personId}>
            Refresh shifts
          </button>
        </div>
      </div>

      {/* Admin-only allocator */}
      {me?.role === "Admin" && personId && (
        <ShiftAllocation
          jwt={jwt}
          personId={personId}
          onCreated={bump} // auto-refresh calendar
        />
      )}

      {/* Everyone linked can view the calendar */}
      {personId && (
        <ShiftCalendar
          jwt={jwt}
          personId={personId}
          isAdmin={me?.role === "Admin"}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
}

export default ShiftScheduler;
