import React from "react";

function AccessControl({ me, jwt, clients }) {
  const [accessClientId, setAccessClientId] = React.useState("");
  const [accessLinks, setAccessLinks] = React.useState([]);
  const [accessErr, setAccessErr] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const loadAccessLinks = async (pid) => {
    setIsLoading(true);
    try {
      setAccessErr("");
      const r = await fetch(`/api/person-user-links/by-person/${pid}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load access list");
      setAccessLinks(d);
    } catch (e) {
      setAccessErr(e.message || String(e));
      setAccessLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value;
    setAccessClientId(value);
    if (value) loadAccessLinks(value);
  };

  // Show all associated users for Admin / Family / PoA
  const shouldShowUser = () => {
    if (!me) return false;
    return me.role === "Admin" || me.role === "Family" || me.role === "PoA";
  };

  // Permission: who can be revoked by current user?
  const canRevoke = (userLink) => {
    const u = userLink.userId;
    if (!u) return false;

    // Never allow revoking yourself
    if (String(u._id) === String(me.id)) return false;

    if (me.role === "Family" || me.role === "PoA") {
      // Family/PoA can revoke anyone except themselves (including Admin)
      return true;
    }

    if (me.role === "Admin") {
      // Admin can only revoke staff
      return u.role === "GeneralCareStaff";
    }

    return false;
  };

  const confirmText = (link) => {
    const target = link?.userId || {};
    const targetLabel = [target.role, target.name || target.email]
      .filter(Boolean)
      .join(" ");
    const isFamily = me.role === "Family" || me.role === "PoA";

    if (isFamily && target.role === "Admin") {
      return `You're about to revoke ${targetLabel}'s access to this client.\n\nThis will ALSO revoke ALL GeneralCareStaff for this client.\n\nContinue?`;
    }
    return `Revoke access for ${targetLabel}?`;
  };

  // NOTE: pass the whole link so we can decide prompts and show cascade results
  const revokeAccess = async (link) => {
    // Confirm for ALL revoke actions
    const ok = window.confirm(confirmText(link));
    if (!ok) return;

    try {
      const r = await fetch(`/api/person-user-links/${link._id}/revoke`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to revoke");

      let msg = "Access revoked.";
      if (d.cascade && typeof d.cascade.staffRevoked === "number") {
        msg += ` Also revoked ${d.cascade.staffRevoked} staff access.`;
      }
      alert(msg);

      if (accessClientId) await loadAccessLinks(accessClientId);
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  const actionCell = (link) => {
    const u = link.userId;
    const isSelf = String(u._id) === String(me.id);
    const allowed = canRevoke(link);

    if (isSelf) {
      return (
        <button className="secondary" style={{ border: "none" }} disabled>
          You
        </button>
      );
    }

    if (allowed) {
      return (
        <button className="secondary" onClick={() => revokeAccess(link)}>
          Revoke
        </button>
      );
    }

    return (
      <button className="secondary" style={{ border: "none" }} disabled>
        Cannot revoke
      </button>
    );
  };

  return (
    <div className="card">
      <h3>Client Access Management</h3>
      <label>Select client</label>
      <select value={accessClientId} onChange={handleClientChange}>
        <option value="">— Choose client —</option>
        {clients.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      {accessErr && <p style={{ color: "#b91c1c" }}>Error: {accessErr}</p>}
      {isLoading && <p>Loading...</p>}

      {!accessClientId && !isLoading && (
        <p>Select a client to see associated users.</p>
      )}

      {accessClientId && !isLoading && accessLinks.length > 0 && (
        <table
          style={{
            width: "100%",
            marginTop: 12,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Email</th>
              <th align="left">Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accessLinks.filter(shouldShowUser).map((l) => {
              const u = l.userId;
              return (
                <tr key={l._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{actionCell(l)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {accessClientId && !isLoading && accessLinks.length === 0 && (
        <p>No associated users yet.</p>
      )}
    </div>
  );
}

export default AccessControl;
