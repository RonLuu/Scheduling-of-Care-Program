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

  const revokeAccess = async (linkId) => {
    try {
      const r = await fetch(`/api/person-user-links/${linkId}/revoke`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to revoke");
      if (accessClientId) await loadAccessLinks(accessClientId);
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value;
    setAccessClientId(value);
    if (value) loadAccessLinks(value);
  };

  const shouldShowUser = (userLink) => {
    const u = userLink.userId;

    if (me.role === "Family" || me.role === "PoA") {
      // Family/PoA can see everyone except themselves
      return me.id !== u._id;
    } else if (me.role === "Admin") {
      // Admin should only see staff
      return u.role === "GeneralCareStaff";
    }
    return false;
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
              <th>Action</th>
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
                  <td>
                    <button
                      className="secondary"
                      onClick={() => revokeAccess(l._id)}
                    >
                      Revoke
                    </button>
                  </td>
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
