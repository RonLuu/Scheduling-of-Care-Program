import React from "react";
import { BiX } from "react-icons/bi";

function OrganizationManagement({ me, jwt, refreshMe, showAdd, setShowAdd }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loadingOrgs, setLoadingOrgs] = React.useState(true);
  const [orgErr, setOrgErr] = React.useState("");

  const [pendingOrgId, setPendingOrgId] = React.useState(
    me?.organizationId || ""
  );
  const [orgSaveMsg, setOrgSaveMsg] = React.useState("");
  const [editing, setEditing] = React.useState(!me?.organizationId); // true if org not set

  // Keep pendingOrgId in sync when the panel opens
  React.useEffect(() => {
    if (!showAdd) return;
    setPendingOrgId(me?.organizationId ? String(me.organizationId) : "");
  }, [showAdd, me?.organizationId]);

  // Load orgs
  React.useEffect(() => {
    if (!showAdd) return;
    let active = true;
    (async () => {
      try {
        setLoadingOrgs(true);
        setOrgErr("");
        const r = await fetch("/api/organizations");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load organizations");
        if (!active) return;
        setOrgs(d);

        // If user has an org and it's in the list, keep it selected; otherwise keep ""
        if (
          me?.organizationId &&
          d.find((o) => o._id === String(me.organizationId))
        ) {
          setPendingOrgId(String(me.organizationId));
        }
      } catch (e) {
        if (active) setOrgErr(e.message || String(e));
      } finally {
        if (active) setLoadingOrgs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showAdd, me?.organizationId]);

  const currentOrgName = React.useMemo(() => {
    if (!me?.organizationId) return null;
    return (
      orgs.find((o) => o._id === me.organizationId)?.name ||
      "(Unknown organisation)"
    );
  }, [orgs, me?.organizationId]);

  const handleSaveOrganization = async () => {
    try {
      setOrgSaveMsg("");

      if (!pendingOrgId) {
        setOrgSaveMsg("Please select an organisation.");
        return;
      }

      // No-op if same org selected
      if (me?.organizationId && pendingOrgId === String(me.organizationId)) {
        setOrgSaveMsg("You're already in this organisation. No changes made.");
        setEditing(false);
        return;
      }

      let migrateClients = false;

      if (me.role === "Family" || me.role === "PoA") {
        const ok = window.confirm(

          "Also move ALL your clients to the new organisation, move other Family/PoA linked to those clients, update all items/tasks, and revoke all staff/admin access on those clients?\n\nClick OK to proceed."
        );
        if (!ok) {
          setOrgSaveMsg("Change cancelled. No updates made.");
          return; // 🔒 bail out completely
        }
        migrateClients = true; // proceed with cascade
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

      // success
      const chosenName =
        orgs.find((o) => o._id === pendingOrgId)?.name || "Organisation";
      setOrgSaveMsg(`Saved. You are now in "${chosenName}".`);

      if (d.cascade) {
        const c = d.cascade;
        setOrgSaveMsg(
          `Saved. You are now in "${chosenName}". ` +
            `Moved Persons: ${c.personsMoved}, Items: ${c.itemsMoved}, Tasks: ${c.tasksMoved}, ` +
            `Family/PoA moved: ${c.familyMoved}, Staff/Admin links revoked: ${c.staffRevoked}.`
        );
      }

      // refresh /me data
      const rr = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + jwt },
      });
      if (rr.ok) refreshMe();

      setEditing(false);
    } catch (e) {
      setOrgSaveMsg("Error: " + (e.message || e));
    }
  };

  return (
    <div
      className={`organizationmanagement-wrapper ${showAdd ? "on" : "off"}`}
      onClick={() => setShowAdd(false)}
    >
      <div
        className={`organizationmanagement ${showAdd ? "on" : "off"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="organizationmanagement-header">
          <h3>Your organisation</h3>
          <BiX
            style={{ fontSize: "250%" }}
            onClick={() => setShowAdd(!showAdd)}
          />
        </div>


        <div className="organizationmanagement-ID" style={{ height: "10%" }}>
          Org:&nbsp;
          {me?.organizationId ? (
            <code>{currentOrgName}</code>

          ) : (
            <em>none set</em>
          )}
        </div>

        {editing ? (

          <div
            className="organizationmanagement-edit"
            style={{ display: "grid", gap: 8 }}
          >
            <label
              className="organizationmanagement-edit-label"
              htmlFor="orgSelect"
            >
              Select organisation
            </label>

            {loadingOrgs ? (
              <div>Loading organisations…</div>
            ) : orgErr ? (
              <div style={{ color: "#b91c1c" }}>Error: {orgErr}</div>
            ) : (
              // Native select dropdown
              <select
                id="orgSelect"
                className="organizationmanagement-select"
                value={pendingOrgId} // always a string: "" or an _id
                onChange={(e) => setPendingOrgId(e.target.value)}
              >
                <option value="">— Select organisation —</option>
                {orgs.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            {/* Optional: wrapper to constrain height on some browsers if using a custom listbox.
                Native <select> is already scrollable, so this is purely for custom styling scenarios.
            */}
            <button
              className="organizationmanagement-edit-button"
              onClick={handleSaveOrganization}
              disabled={loadingOrgs || !pendingOrgId}

            >
              Save
            </button>
          </div>
        ) : (
          <div className="organizationmanagement-change">
            <button
              className="organizationmanagement-change-button"
              onClick={() => setEditing(true)}
            >
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
