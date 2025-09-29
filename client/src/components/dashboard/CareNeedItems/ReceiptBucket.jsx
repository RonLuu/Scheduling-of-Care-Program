import React from "react";

function ReceiptBucket({ jwt, clients }) {
  const [personId, setPersonId] = React.useState("");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [file, setFile] = React.useState(null);
  const [bucket, setBucket] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [fileNote, setFileNote] = React.useState("");
  const [fileDate, setFileDate] = React.useState(""); // effective date
  const [err, setErr] = React.useState("");

  // NEW: collapsible "add receipt" form state
  const [showAdd, setShowAdd] = React.useState(false);

  const todayISO = () => new Date().toISOString().slice(0, 10);

  // NEW: auto-select first client (if any) on first mount
  React.useEffect(() => {
    if (!personId && Array.isArray(clients) && clients.length > 0) {
      setPersonId(clients[0]._id);
    }
  }, [clients, personId]);

  // reference check + delete helper
  const deleteSharedReceipt = async (fileId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");

      // 1) Ask server which items reference this file
      const r1 = await fetch(`/api/file-upload/${fileId}/references`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Failed to check references");

      const refs = Array.isArray(d1.items) ? d1.items : [];
      let proceed = true;

      if (refs.length > 0) {
        const preview =
          refs
            .slice(0, 5)
            .map(
              (it) => `• ${it.name} (client ${it.personName || it.personId})`
            )
            .join("\n") +
          (refs.length > 5 ? `\n…and ${refs.length - 5} more` : "");

        proceed = window.confirm(
          `Warning: this receipt is referenced by ${refs.length} care need item(s).\n\n${preview}\n\nIf you delete this receipt, those references will be removed and the attachments will no longer be visible from those items.\n\nProceed to delete?`
        );
      } else {
        proceed = window.confirm("Delete this receipt? This cannot be undone.");
      }

      if (!proceed) return;

      // 2) Delete the file
      const r2 = await fetch(`/api/file-upload/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || "Delete failed");

      // 3) Refresh
      await load();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const load = async () => {
    if (!personId) return;
    setErr("");
    try {
      const r = await fetch(
        `/api/file-upload/buckets?personId=${personId}&year=${year}&month=${month}`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load bucket");
      setBucket(d.bucket);
      setFiles(d.files || []);
    } catch (e) {
      setErr(e.message || String(e));
      setBucket(null);
      setFiles([]);
      setFileNote("");
      setFileDate("");
    }
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, year, month]); // load when selection changes

  // NEW: when opening the form, prefill date to today
  const handleOpenAdd = () => {
    setShowAdd(true);
    setFileDate(todayISO());
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    // optional: keep what the user typed if they collapse; or reset:
    // setFile(null); setFileNote(""); setFileDate("");
  };

  const uploadToBucket = async () => {
    setErr("");
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!personId) throw new Error("Select a client");
      if (!file) throw new Error("Choose a file");

      const fd = new FormData();
      fd.append("scope", "Shared");
      fd.append("personId", personId);
      fd.append("year", String(year)); // bucket resolution still uses current selection
      fd.append("month", String(month)); // (date independence is enforced server-side)
      fd.append("file", file);
      if (fileNote) fd.append("description", fileNote);
      // Always send an effective date; defaults to today when form opened
      if (fileDate) fd.append("effectiveDate", fileDate);

      const r = await fetch("/api/file-upload/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + jwt },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");

      // Reset file chooser
      setFile(null);

      // If user picked an effective date, switch the UI to that month/year so they see it immediately
      if (fileDate) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fileDate);
        if (m) {
          const yEff = Number(m[1]);
          const mEff = Number(m[2]);
          if (yEff && mEff && (yEff !== year || mEff !== month)) {
            setYear(yEff);
            setMonth(mEff);
            // load() will be triggered by the useEffect on [personId, year, month]
            return;
          }
        }
      }
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  return (
    <div className="card">
      <h3>Shared receipts (by client & month)</h3>

      <div className="row">
        <div>
          <label>Client</label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">— Select client —</option>
            {(clients || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Month</label>
          <input
            type="number"
            min="1"
            max="12"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </div>
        <div>
          <label>&nbsp;</label>
          <button className="secondary" onClick={load} disabled={!personId}>
            Refresh
          </button>
        </div>
      </div>

      {err && <p style={{ color: "#b91c1c", marginTop: 8 }}>Error: {err}</p>}

      <div style={{ marginTop: 12 }}>
        <p>
          <strong>Bucket:</strong>{" "}
          {bucket ? bucket.title || `${month}/${year}` : "None yet"}
        </p>
        {files.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No shared receipts for this month.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>File</th>
                <th style={{ textAlign: "left" }}>Note</th>
                <th style={{ textAlign: "left" }}>Receipt date</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const receiptDate = f.effectiveDate || f.createdAt;
                return (
                  <tr key={f._id} style={{ borderTop: "1px solid #eee" }}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {f.fileType?.startsWith("image/") && f.urlOrPath && (
                          <a
                            href={f.urlOrPath}
                            target="_blank"
                            rel="noreferrer"
                            title={f.filename}
                          >
                            <img
                              src={f.urlOrPath}
                              alt={f.filename}
                              style={{
                                height: 40,
                                width: 60,
                                objectFit: "cover",
                                borderRadius: 4,
                                border: "1px solid #eee",
                              }}
                            />
                          </a>
                        )}
                        <span>{f.filename}</span>
                      </div>
                    </td>
                    <td>
                      {f.description ? (
                        <span>{f.description}</span>
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>
                    <td
                      title={
                        f.createdAt
                          ? `Uploaded: ${new Date(
                              f.createdAt
                            ).toLocaleString()}`
                          : ""
                      }
                    >
                      {receiptDate ? (
                        isNaN(new Date(receiptDate)) ? (
                          <span style={{ opacity: 0.6 }}>—</span>
                        ) : (
                          new Date(receiptDate).toLocaleDateString()
                        )
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() => deleteSharedReceipt(f._id)}
                        title="Delete this receipt"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/*  Add receipt area  */}
      <div style={{ marginTop: 12 }}>
        {!showAdd ? (
          <div>
            <button className="secondary" onClick={handleOpenAdd}>
              + Add receipt
            </button>
          </div>
        ) : (
          <div
            className="collapsible"
            style={{
              overflow: "hidden",
              transition: "max-height 240ms ease, opacity 240ms ease",
              maxHeight: showAdd ? 300 : 0,
              opacity: showAdd ? 1 : 0,
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
              background: "#fafafa",
            }}
            aria-expanded={showAdd}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <input
                type="text"
                placeholder='Optional note (e.g. "Pharmacy Receipt for Jan 12")'
                value={fileNote}
                onChange={(e) => setFileNote(e.target.value)}
                style={{ minWidth: 260, flex: "1 1 260px" }}
              />
              <input
                type="date"
                value={fileDate}
                onChange={(e) => setFileDate(e.target.value)}
                title="Effective date (independent of the selected bucket’s month)"
              />
              <button
                className="secondary"
                onClick={uploadToBucket}
                disabled={!file || !personId}
                title={personId ? "" : "Select a client first"}
              >
                Upload to bucket
              </button>
              <button onClick={handleCloseAdd}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReceiptBucket;
