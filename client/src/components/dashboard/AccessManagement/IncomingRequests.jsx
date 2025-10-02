import React from "react";

function IncomingRequests({ jwt }) {
  const [items, setItems] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setErr("");
      const r = await fetch("/api/access-requests/incoming", {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load requests");
      setItems(d);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [jwt]);

  React.useEffect(() => {
    load();
  }, [load]);

  const decide = async (id, approve) => {
    setIsProcessing(true);
    try {
      const r = await fetch(`/api/access-requests/${id}/decision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ approve }),
      });
      const d = await r.json();
      if (!r.ok) {
        alert(d.error || "Failed");
        return;
      }
      load();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card card_res">
      <h3>Incoming access requests</h3>
      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}
      {items.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <ul>
          {items.map((ar) => (
            <li key={ar._id} style={{ marginBottom: 8 }}>
              <span className="badge">{ar.tokenType}</span> {ar.requesterEmail}{" "}
              ({ar.requesterRole}) · org <code>{ar.organizationId}</code>
              {ar.message && <React.Fragment> · "{ar.message}"</React.Fragment>}
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={() => decide(ar._id, true)}
                  disabled={isProcessing}
                >
                  Approve
                </button>{" "}
                <button
                  className="secondary"
                  onClick={() => decide(ar._id, false)}
                  disabled={isProcessing}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default IncomingRequests;
