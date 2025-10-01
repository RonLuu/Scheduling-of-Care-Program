import React from "react";

function ReceiptBucket({ jwt, clients }) {
  const [personId, setPersonId] = React.useState("");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [file, setFile] = React.useState(null);
  const [bucket, setBucket] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [fileNote, setFileNote] = React.useState("");
  const [fileDate, setFileDate] = React.useState("");
  const [err, setErr] = React.useState("");

  // Collapsible states
  const [showAdd, setShowAdd] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const todayISO = () => new Date().toISOString().slice(0, 10);

  // Auto-select first client on mount
  React.useEffect(() => {
    if (!personId && Array.isArray(clients) && clients.length > 0) {
      setPersonId(clients[0]._id);
    }
  }, [clients, personId]);

  // Month names for better display
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const deleteSharedReceipt = async (fileId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");

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

      const r2 = await fetch(`/api/file-upload/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || "Delete failed");

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
  }, [personId, year, month]);

  const handleOpenAdd = () => {
    setShowAdd(true);
    setFileDate(todayISO());
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setFile(null);
    setFileNote("");
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
      setFileNote("");
      handleCloseAdd();

      if (fileDate) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fileDate);
        if (m) {
          const yEff = Number(m[1]);
          const mEff = Number(m[2]);
          if (yEff && mEff && (yEff !== year || mEff !== month)) {
            setYear(yEff);
            setMonth(mEff);
            return;
          }
        }
      }
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const styles = {
    card: {
      background: "white",
      borderRadius: 8,
      padding: 0,
      marginBottom: 16,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      width: "1000px",
    },
    header: {
      padding: "16px 20px",
      background: "linear-gradient(to right, #f0f9ff, #e0f2fe)",
      borderBottom: "1px solid #bfdbfe",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
    },
    title: {
      fontSize: "1.125rem",
      fontWeight: 600,
      color: "#1e40af",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    content: {
      padding: 20,
      transition: "max-height 0.3s ease, opacity 0.3s ease",
    },
    controls: {
      display: "grid",
      gridTemplateColumns: "1fr 150px 150px 120px",
      gap: 12,
      marginBottom: 16,
      alignItems: "end",
    },
    bucketInfo: {
      background: "#f9fafb",
      borderRadius: 6,
      padding: 12,
      marginBottom: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: "0.925rem",
    },
    tableHeader: {
      background: "#f9fafb",
      borderBottom: "2px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "10px 12px",
      textAlign: "left",
      fontWeight: 600,
      fontSize: "0.825rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#6b7280",
    },
    tableRow: {
      borderBottom: "1px solid #f3f4f6",
      transition: "background-color 0.15s ease",
    },
    tableCell: {
      padding: "12px",
      verticalAlign: "middle",
    },
    addForm: {
      background: "#f0f9ff",
      borderRadius: 6,
      padding: 16,
      marginTop: 16,
      border: "1px solid #bfdbfe",
    },
    filePreview: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    thumbnail: {
      height: 48,
      width: 64,
      objectFit: "cover",
      borderRadius: 4,
      border: "1px solid #e5e7eb",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: "#6b7280",
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <h3 style={styles.title}>
          <span
            style={{
              fontSize: "1rem",
              transform: `rotate(${isExpanded ? 90 : 0}deg)`,
              transition: "transform 0.2s",
            }}
          >
            ▶
          </span>
          📁 Shared Receipts Bucket
        </h3>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          <div style={styles.controls}>
            <div>
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                Client
              </label>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                style={{ width: "100%" }}
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
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ width: "100%" }}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                Year
              </label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {err && (
            <div
              style={{
                color: "#dc2626",
                background: "#fef2f2",
                padding: "8px 12px",
                borderRadius: 4,
                marginBottom: 12,
                fontSize: "0.875rem",
              }}
            >
              Error: {err}
            </div>
          )}

          {personId && (
            <div style={styles.bucketInfo}>
              <div>
                <strong>Current Bucket:</strong>{" "}
                {bucket ? (
                  <span style={{ color: "#059669" }}>
                    {monthNames[month - 1]} {year} - {files.length} file
                    {files.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span style={{ color: "#6b7280" }}>
                    No bucket created yet
                  </span>
                )}
              </div>
            </div>
          )}

          {files.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ marginBottom: 16 }}>
                No receipts uploaded for this month yet.
              </p>
              {!showAdd && personId && (
                <button className="secondary" onClick={handleOpenAdd}>
                  + Upload First Receipt
                </button>
              )}
            </div>
          ) : (
            <>
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={{ ...styles.tableHeaderCell, width: "35%" }}>
                      File
                    </th>
                    <th style={{ ...styles.tableHeaderCell, width: "30%" }}>
                      Description
                    </th>
                    <th style={{ ...styles.tableHeaderCell, width: "20%" }}>
                      Receipt Date
                    </th>
                    <th
                      style={{
                        ...styles.tableHeaderCell,
                        width: "15%",
                        textAlign: "center",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => {
                    const receiptDate = f.effectiveDate || f.createdAt;
                    return (
                      <tr
                        key={f._id}
                        style={styles.tableRow}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f9fafb")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td style={styles.tableCell}>
                          <div style={styles.filePreview}>
                            {f.fileType?.startsWith("image/") && f.urlOrPath ? (
                              <a
                                href={f.urlOrPath}
                                target="_blank"
                                rel="noreferrer"
                                title={f.filename}
                              >
                                <img
                                  src={f.urlOrPath}
                                  alt={f.filename}
                                  style={styles.thumbnail}
                                />
                              </a>
                            ) : (
                              <div
                                style={{
                                  ...styles.thumbnail,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#f3f4f6",
                                  fontSize: "1.5rem",
                                }}
                              >
                                📄
                              </div>
                            )}
                            <div>
                              <a
                                href={f.urlOrPath}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#2563eb",
                                  textDecoration: "none",
                                  fontWeight: 500,
                                }}
                              >
                                {f.filename}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          {f.description || (
                            <span style={{ color: "#9ca3af" }}>
                              No description
                            </span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          {receiptDate && !isNaN(new Date(receiptDate)) ? (
                            <div>
                              <div>
                                {new Date(receiptDate).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td
                          style={{ ...styles.tableCell, textAlign: "center" }}
                        >
                          <button
                            className="danger"
                            onClick={() => deleteSharedReceipt(f._id)}
                            title="Delete this receipt"
                            style={{
                              padding: "4px 12px",
                              fontSize: "0.825rem",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!showAdd && (
                <div style={{ marginTop: 16 }}>
                  <button className="secondary" onClick={handleOpenAdd}>
                    + Add Another Receipt
                  </button>
                </div>
              )}
            </>
          )}

          {/* Add receipt form */}
          {showAdd && (
            <div style={styles.addForm}>
              <h4 style={{ margin: "0 0 12px 0", color: "#1e40af" }}>
                Upload New Receipt
              </h4>
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Select File *
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      value={fileDate}
                      onChange={(e) => setFileDate(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder='e.g., "Pharmacy receipt for medications"'
                    value={fileNote}
                    onChange={(e) => setFileNote(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button onClick={handleCloseAdd} className="secondary">
                    Cancel
                  </button>
                  <button
                    onClick={uploadToBucket}
                    disabled={!file || !personId}
                    title={personId ? "" : "Select a client first"}
                  >
                    Upload Receipt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceiptBucket;
