import React from "react";
import { aud, formatFrequency } from "../utils/formatters";

function List({ jwt, clients }) {
  const [cniClientId, setCniClientId] = React.useState("");
  const [cniItems, setCniItems] = React.useState([]);
  const [cniLoading, setCniLoading] = React.useState(false);
  const [cniErr, setCniErr] = React.useState("");

  const loadCareNeedItemsFor = React.useCallback(
    async (personId) => {
      try {
        setCniLoading(true);
        setCniErr("");
        setCniItems([]);
        if (!jwt) throw new Error("UNAUTHENTICATED");
        if (!personId) return;

        const r = await fetch(
          `/api/care-need-items?personId=${encodeURIComponent(personId)}`,
          {
            headers: { Authorization: "Bearer " + jwt },
          }
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load items");

        // Sort by startDate or name
        d.sort((a, b) => {
          const as = a.frequency.startDate
            ? new Date(a.frequency.startDate).getTime()
            : 0;
          const bs = b.frequency.startDate
            ? new Date(b.frequency.startDate).getTime()
            : 0;
          return as - bs || a.name.localeCompare(b.name);
        });

        setCniItems(d);
      } catch (e) {
        setCniErr(e.message || String(e));
      } finally {
        setCniLoading(false);
      }
    },
    [jwt]
  );

  React.useEffect(() => {
    if (clients && clients.length > 0 && !cniClientId) {
      const first = clients[0]._id;
      setCniClientId(first);
      loadCareNeedItemsFor(first);
    }
  }, [clients, cniClientId, loadCareNeedItemsFor]);

  const handleClientChange = (e) => {
    const v = e.target.value;
    setCniClientId(v);
    if (v) loadCareNeedItemsFor(v);
  };

  return (
    <div className="card">
      <h3>Care Need Items</h3>
      <div className="row">
        <div>
          <label>Client</label>
          <select value={cniClientId} onChange={handleClientChange}>
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
          <button
            className="secondary"
            onClick={() => cniClientId && loadCareNeedItemsFor(cniClientId)}
          >
            Refresh
          </button>
        </div>
      </div>

      {cniErr && <p style={{ color: "#b91c1c" }}>Error: {cniErr}</p>}
      {cniLoading && <p>Loading items…</p>}

      {!cniLoading && cniItems.length === 0 && (
        <p>No care need items for this client.</p>
      )}

      {cniItems.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Frequency</th>
              <th style={{ textAlign: "left" }}>Budget</th>
              <th style={{ textAlign: "left" }}>Purchase cost</th>
              <th style={{ textAlign: "left" }}>Expected per task</th>
              <th style={{ textAlign: "left" }}>Schedule</th>
              <th style={{ textAlign: "left" }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {cniItems.map((it) => (
              <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                <td>{it.name}</td>
                <td>{formatFrequency(it.frequency)}</td>
                <td style={{ textAlign: "left" }}>
                  {aud.format(it.budgetCost || 0)}
                </td>
                <td style={{ textAlign: "left" }}>
                  {aud.format(it.purchaseCost || 0)}
                </td>
                <td style={{ textAlign: "left" }}>
                  {aud.format(it.occurrenceCost || 0)}
                </td>
                <td>
                  <span className="badge">
                    {it.scheduleType === "Timed" && it.timeWindow
                      ? `Scheduled ${it.timeWindow.startTime}–${it.timeWindow.endTime}`
                      : "All-day"}
                  </span>
                </td>
                <td>{it.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default List;
