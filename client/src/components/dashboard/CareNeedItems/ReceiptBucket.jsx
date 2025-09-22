import React from "react";

function ReceiptBuckets({ jwt, clients }) {
  const [personId, setPersonId] = React.useState("");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [file, setFile] = React.useState(null);
  const [bucket, setBucket] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [fileNote, setFileNote] = React.useState("");
  const [fileDate, setFileDate] = React.useState(""); // optional effective date
  const [err, setErr] = React.useState("");

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
  }, [personId, year, month]);

  const uploadToBucket = async () => {
    setErr("");
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!personId) throw new Error("Select a client");
      if (!file) throw new Error("Choose a file");

      const fd = new FormData();
      fd.append("scope", "Shared");
      fd.append("personId", personId);
      fd.append("year", String(year));
      fd.append("month", String(month));
      fd.append("file", file);
      if (fileNote) fd.append("description", fileNote);
      if (fileDate) fd.append("effectiveDate", fileDate);

      const r = await fetch("/api/file-upload/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + jwt },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      setFile(null);
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
            {clients.map((c) => (
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

      <div style={{ marginTop: 10 }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />{" "}
        <input
          type="text"
          placeholder='Optional note (e.g. "Pharmacy Receipt for Jan 12")'
          value={fileNote}
          onChange={(e) => setFileNote(e.target.value)}
          style={{ marginLeft: 8, minWidth: 240 }}
        />
        <input
          type="date"
          value={fileDate}
          onChange={(e) => setFileDate(e.target.value)}
          style={{ marginLeft: 8 }}
          title="Effective date (must be within the chosen bucket’s month)"
        />
        <button
          className="secondary"
          onClick={uploadToBucket}
          disabled={!file || !personId}
        >
          Upload to bucket
        </button>
      </div>

      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}
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
                <th style={{ textAlign: "left" }}>Actions</th> {/* NEW */}
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
                        {f.fileType?.startsWith("image/") && (
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
                        new Date(receiptDate).toLocaleDateString()
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
    </div>
  );
}

export default ReceiptBuckets;
