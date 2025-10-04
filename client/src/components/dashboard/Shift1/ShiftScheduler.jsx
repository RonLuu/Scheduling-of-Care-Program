import React from "react";
import ShiftAllocation from "./ShiftAllocation.jsx";
import ShiftCalendar from "./ShiftCalendar.jsx";
import ShiftSettingsManager from "./ShiftSettingsManager.jsx";
import { BiRefresh } from "react-icons/bi";
import useAuth from "../hooks/useAuth";
import { useClients } from "../hooks/useClients";

import "./ShiftScheduler.css"
function ShiftScheduler() {
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGRhMmUwNzI2NTUzZjMyYTU2MDJiNzgiLCJyb2xlIjoiQWRtaW4iLCJvcmciOiI2OGM1NzZiYWMzY2RiOGMzNDhjYmFhM2QiLCJpYXQiOjE3NTkxMzE2MDUsImV4cCI6MTc1OTEzNTIwNX0.obEPteHBLKQrj014I8e6VDjpxNbva - RodLKjX0RzXR0"
  const me = {
    "id": "68da2e0726553f32a5602b78",
    "_id": "68da2e0726553f32a5602b78",
    "name": "admin",
    "email": "admin@test.com",
    "role": "Admin",
    "organizationId": "68c576bac3cdb8c348cbaa3d",
    "mobile": null,
    "address": null
  }
  const clients = [
    {
      "_id": "68d60838c48640c618d1fc41",
      "organizationId": "68c576bac3cdb8c348cbaa3d",
      "name": "client1",
      "dateOfBirth": "1111-11-11T00:00:00.000Z",
      "medicalInfo": "1",
      "status": "Active",
      "currentAnnualBudget": 1111,
      "customCategories": [],
      "createdAt": "2025-09-26T03:27:52.627Z",
      "updatedAt": "2025-09-26T03:27:52.627Z",
      "__v": 0,
      "relationshipType": "Admin"
    }
  ]
  const loading = false
  const error = ""
  // const { me } = useAuth();
  // const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  // // Load all clients linked to the current user (with relationshipType merged in)
  // const { clients, loading, error } = useClients(me, jwt);
  
  const [personId, setPersonId] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // default to first client (if linked to multiple)
  React.useEffect(() => {
    if (!personId && clients?.length){
      setPersonId(clients[0]._id);}
  }, [clients, personId]);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
      <div className="shift-scheduler">
        <div className="shift-scheduler-header">
          <h1>Shift Allocation</h1>
          {loading && <p>Loading clients…</p>}
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        </div>      
          {jwt && me && <div className="shift-scheduler-body">
            <div className="shift-scheduler-body-client">
              <h1 style={{marginBottom: "2%"}}>Shift Scheduling</h1>
              <div className="shift-scheduler-client-selector-wrapper">
                <select
                  className="client-selector"
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
                <div className="shift-scheduler-client-button-wrapper">
                  <button className="shift-scheduler-client-button" onClick={bump} disabled={!personId}>
                    <BiRefresh className="shift-scheduler-client-icon" />
                  </button>
                </div>
              </div>
              <div className="shift-scheduler-shift">
                {/* Admin-only shift allocator */}
                {me?.role === "Admin" && personId && (
                  <ShiftAllocation jwt={jwt} personId={personId} onCreated={bump} />
                )}

              </div>
              {/* Admin-only shift settings management */}
              {me?.role === "Admin" && me?.organizationId && (
                <ShiftSettingsManager jwt={jwt} organizationId={me.organizationId} />
              )}
            </div>
            <div className="shift-scheduler-body-calendar">
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
        </div>}
    </div>)
}

export default ShiftScheduler;
