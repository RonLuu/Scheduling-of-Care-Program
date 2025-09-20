import React from "react";
import { aud, formatFrequency } from "../utils/formatters";

function List({ jwt, clients }) {
  const [cniClientId, setCniClientId] = React.useState("");
  const [cniItems, setCniItems] = React.useState([]);
  const [filesByItem, setFilesByItem] = React.useState({});
  const [cniLoading, setCniLoading] = React.useState(false);
  const [cniErr, setCniErr] = React.useState("");
  const [categoryOrder, setCategoryOrder] = React.useState([]);

  function InlineAttachment({ f }) {
    const isImg = f.fileType && f.fileType.startsWith("image/");
    return (
      <a href={f.urlOrPath} target="_blank" rel="noreferrer" title={f.filename}>
        {isImg ? (
          <img
            src={f.urlOrPath}
            alt={f.filename}
            style={{
              maxHeight: 64,
              maxWidth: 96,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />
        ) : (
          <span style={{ textDecoration: "underline" }}>{f.filename}</span>
        )}
      </a>
    );
  }

  const loadFilesFor = async (itemId) => {
    try {
      const r = await fetch(`/api/file-upload/by-care-need-item/${itemId}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load files");
      setFilesByItem((prev) => ({ ...prev, [itemId]: d }));
    } catch {
      setFilesByItem((prev) => ({ ...prev, [itemId]: [] }));
    }
  };

  const loadCategoryOrder = async (personId) => {
    if (!jwt || !personId) return;
    try {
      const r = await fetch(
        `/api/person-with-needs/${encodeURIComponent(personId)}/categories`,
        { headers: { Authorization: "Bearer " + jwt } }
      );
      const d = await r.json();
      if (r.ok && Array.isArray(d.categories)) {
        setCategoryOrder(d.categories);
      } else {
        setCategoryOrder([]);
      }
    } catch {
      setCategoryOrder([]);
    }
  };

  const loadCareNeedItemsFor = React.useCallback(
    async (personId) => {
      try {
        setCniLoading(true);
        setCniErr("");
        setCniItems([]);
        setFilesByItem({});
        if (!jwt) throw new Error("UNAUTHENTICATED");
        if (!personId) return;

        await loadCategoryOrder(personId);

        const r = await fetch(
          `/api/care-need-items?personId=${encodeURIComponent(personId)}`,
          { headers: { Authorization: "Bearer " + jwt } }
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load items");

        const orderIndex = (cat) => {
          const idx = categoryOrder.indexOf(cat);
          return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
        };

        d.sort((a, b) => {
          const ca = orderIndex(a.category || "Other");
          const cb = orderIndex(b.category || "Other");
          if (ca !== cb) return ca - cb;

          const as = a.frequency?.startDate
            ? new Date(a.frequency.startDate).getTime()
            : 0;
          const bs = b.frequency?.startDate
            ? new Date(b.frequency.startDate).getTime()
            : 0;
          if (as !== bs) return as - bs;

          return (a.name || "").localeCompare(b.name || "");
        });

        setCniItems(d);
        d.forEach((it) => loadFilesFor(it._id));
      } catch (e) {
        setCniErr(e.message || String(e));
      } finally {
        setCniLoading(false);
      }
    },
    [jwt, categoryOrder]
  );

  React.useEffect(() => {
    if (clients && clients.length > 0 && !cniClientId) {
      const first = clients[0]._id;
      setCniClientId(first);
      loadCareNeedItemsFor(first);
    }
  }, [clients, cniClientId, loadCareNeedItemsFor]);

  const handleClientChange = async (e) => {
    const v = e.target.value;
    setCniClientId(v);
    if (v) {
      await loadCategoryOrder(v);
      loadCareNeedItemsFor(v);
    }
  };

  const renderCategoryDivider = (category) => (
    <tr key={`div-${category}`}>
      <td colSpan={8} style={{ padding: "10px 6px", background: "#f9fafb" }}>
        <strong style={{ fontSize: 13 }}>{category}</strong>
      </td>
    </tr>
  );

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
              <th style={{ textAlign: "left" }}>Category</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Frequency</th>
              <th style={{ textAlign: "left" }}>Budget</th>
              <th style={{ textAlign: "left" }}>Purchase cost</th>
              <th style={{ textAlign: "left" }}>Expected per task</th>
              <th style={{ textAlign: "left" }}>Schedule</th>
              <th style={{ textAlign: "left" }}>Attachments</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [];
              let lastCat = null;

              cniItems.forEach((it) => {
                const cat = it.category || "Other";
                if (cat !== lastCat) {
                  rows.push(renderCategoryDivider(cat));
                  lastCat = cat;
                }

                const files = filesByItem[it._id] || [];
                const isPurchaseOnly =
                  it.frequency?.intervalType === "JustPurchase";

                rows.push(
                  <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                    {/* <td>{cat}</td> */}
                    <td> </td>
                    <td>{it.name}</td>
                    <td>{formatFrequency(it.frequency)}</td>
                    <td>{aud.format(it.budgetCost || 0)}</td>
                    <td>{aud.format(it.purchaseCost || 0)}</td>
                    <td>
                      {isPurchaseOnly
                        ? "—"
                        : aud.format(it.occurrenceCost || 0)}
                    </td>
                    <td>
                      {isPurchaseOnly ? (
                        "—"
                      ) : (
                        <span className="badge">
                          {it.scheduleType === "Timed" && it.timeWindow
                            ? `Scheduled ${it.timeWindow.startTime}–${it.timeWindow.endTime}`
                            : "All-day"}
                        </span>
                      )}
                    </td>
                    <td>
                      {files.length === 0 ? (
                        <span style={{ opacity: 0.6 }}>—</span>
                      ) : (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 16,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {files.map((f) => (
                            <li key={f._id} style={{ listStyle: "none" }}>
                              <InlineAttachment f={f} />
                              {f.scope === "Shared" && (
                                <span
                                  className="badge"
                                  style={{ marginLeft: 6 }}
                                >
                                  Shared
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              });

              return rows;
            })()}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default List;
