import React from "react";

function CreateToken({ me, jwt, clients, organizationId }) {
  const initialType =
    me && me.role === "Admin" ? "STAFF_INVITE" : "MANAGER_TOKEN";
  const [type, setType] = React.useState(initialType);
  const [expiresInDays, setExpiresInDays] = React.useState(7);
  const [maxUses, setMaxUses] = React.useState(1);
  const [selectedPersonId, setSelectedPersonId] = React.useState("");
  const [tokenResult, setTokenResult] = React.useState(null);

  const allowedTypesFor = (role) => {
    if (role === "Admin") return [["STAFF_INVITE", "Staff invite"]];
    if (role === "Family" || role === "PoA")
      return [
        ["FAMILY_TOKEN", "Family invite"],
        ["MANAGER_TOKEN", "Manager invite"],
      ];
    return [];
  };

  const createToken = async (e) => {
    e.preventDefault();
    if (!selectedPersonId) {
      setTokenResult({ error: "Please select a client." });
      return;
    }

    const r = await fetch("/api/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
      },
      body: JSON.stringify({
        type,
        organizationId,
        personIds: [selectedPersonId],
        expiresInDays: Number(expiresInDays),
        maxUses: Number(maxUses),
      }),
    });
    const d = await r.json();
    setTokenResult(r.ok ? d : { error: d.error || "Failed" });
  };

  return (
    <div className="card">
      <h3>Create invite token</h3>
      <label>Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {allowedTypesFor(me.role).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>

      <label>Organization ID</label>
      <input value={organizationId} disabled />

      <label>Client (required)</label>
      <select
        value={selectedPersonId}
        onChange={(e) => setSelectedPersonId(e.target.value)}
      >
        <option value="">— Select a client —</option>
        {clients.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="row">
        <div>
          <label>Expires in (days)</label>
          <input
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />
        </div>
        <div>
          <label>Max uses</label>
          <input
            type="number"
            min="1"
            max="15"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
      </div>

      <button onClick={createToken} disabled={!selectedPersonId}>
        Create token
      </button>
      {tokenResult &&
        (tokenResult.token ? (
          <p>
            Share code: <code>{tokenResult.token}</code> (expires{" "}
            {new Date(tokenResult.expiresAt).toLocaleString()})
          </p>
        ) : (
          <p style={{ color: "#b91c1c" }}>Error: {tokenResult.error}</p>
        ))}
    </div>
  );
}

export default CreateToken;
