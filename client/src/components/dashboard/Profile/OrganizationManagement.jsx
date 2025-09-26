// dashboard/OrganizationManagement.jsx
import React from "react";
import { BiX } from "react-icons/bi"

function OrganizationManagement({ me, jwt, refreshMe, showAdd, setShowAdd }) {
  const [pendingOrgId, setPendingOrgId] = React.useState(
    me?.organizationId || ""
  );
  const [orgSaveMsg, setOrgSaveMsg] = React.useState("");
  const [editing, setEditing] = React.useState(!me?.organizationId);
  // editing is true if org not set, false otherwise

  const handleSaveOrganization = async () => {
    try {
      setOrgSaveMsg("");
      if (!pendingOrgId) {
        setOrgSaveMsg("Please enter an organisation ID.");
        return;
      }

      let migrateClients = false;
      if (me.role === "Family" || me.role === "PoA") {
        migrateClients = window.confirm(
          "Also move ALL your clients to the new organisation, move other Family/PoA linked to those clients, update all items/tasks, and revoke all staff/admin access on those clients?\n\nClick OK to proceed."
        );
      }

      const r = await fetch("/api/users/me/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          organizationId: pendingOrgId,
          migrateClients,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to save organisation");

      setOrgSaveMsg("Saved.");

      if (d.cascade) {
        const c = d.cascade;
        setOrgSaveMsg(
          `Saved. Moved Persons: ${c.personsMoved}, Items: ${c.itemsMoved}, Tasks: ${c.tasksMoved}, Family/PoA moved: ${c.familyMoved}, Staff/Admin links revoked: ${c.staffRevoked}.`
        );
      }

      const rr = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + jwt },
      });
      if (rr.ok) {
        refreshMe();
      }
    } catch (e) {
      setOrgSaveMsg("Error: " + (e.message || e));
    }
  };

  return (
    <div className={`organizationmanagement-wrapper ${showAdd ? "on" : "off"}`} onClick={()=>setShowAdd(false)}>
      <div className={`organizationmanagement ${showAdd ? "on" : "off"}`} onClick={(e) => e.stopPropagation()}>
        <div className="organizationmanagement-header">
          <h3>Your organisation</h3>
          <BiX style={{ fontSize: "250%" }}onClick={()=>setShowAdd(!showAdd)}/>
        </div>
        <div className="organizationmanagement-ID" style={{height:"10%"}}>
          Org:{" "}
          {
            me?.organizationId ?
              <code>{me?.organizationId}</code>
              :
              <em>none set</em>
          }
        </div>
        {editing ? (
            <div className="organizationmanagement-edit">
              <input className="organizationmanagement-edit-input"
                placeholder="Organisation ID"
                value={pendingOrgId}
                onChange={(e) => setPendingOrgId(e.target.value)}
              />
              <button className="organizationmanagement-edit-button" onClick={handleSaveOrganization}>
                Save
              </button>
            </div>
        ) : (
          <div className="organizationmanagement-change">
            <button className="organizationmanagement-change-button" onClick={() => setEditing(true)}>
              Change organization
            </button>
          </div>
        )}

        {orgSaveMsg && <p>{orgSaveMsg}</p>}

        {!me?.organizationId && (
          <p style={{ color: "#92400e", fontSize: "15px" }}>
            You must set your organisation before adding a client.
          </p>
        )}
      </div>
    </div>
    
  );
}

export default OrganizationManagement;
