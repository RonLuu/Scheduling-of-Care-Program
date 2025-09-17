import React from "react";

function UserProfile({ me, onLogout, refreshMe, jwt }) {
  const handleLeaveOrganization = async () => {
    try {
      const r = await fetch("/api/users/me/leave-organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");

      alert("You left the organisation successfully.");

      const rr = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + jwt },
      });
      if (rr.ok) {
        refreshMe();
      }
    } catch (e) {
      alert("Error leaving organisation: " + (e.message || e));
    }
  };

  return (
    <div className="card">
      <h2>
        Welcome, {(me && me.name) || ""}{" "}
        <span className="badge">{(me && me.role) || ""}</span>
      </h2>
      <p>
        {me && me.organizationId && (
          <span>
            Org: <code>{me.organizationId}</code> ·{" "}
          </span>
        )}
        {(me && me.email) || ""}
      </p>

      {me && me.organizationId && (
        <button className="secondary" onClick={handleLeaveOrganization}>
          Leave organization
        </button>
      )}

      <button className="secondary" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}

export default UserProfile;
