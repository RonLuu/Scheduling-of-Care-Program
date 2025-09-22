import React from "react";
import { aud, formatFrequency } from "../utils/formatters.js";
import CommentPanel from "../Panels/CommentPanel.jsx";
import FilePanel from "../Panels/FilePanel.jsx";
import { useCareNeedItemsData } from "../hooks/useCareNeedItemData.js";

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

function List({ jwt, clients }) {
  const {
    cniClientId,
    items,
    filesByItem,
    panelFilesByItem,
    loading,
    err,
    handleClientChange,
    loadItemsFor,

    returnItem,
    deleteItem,

    openCommentsForItem,
    openFilesForItem,
    commentsByItem,
    newCommentTextItem,
    setNewCommentTextItem,
    newFileItem,
    setNewFileItem,
    toggleItemComments,
    toggleItemFiles,
    addItemComment,
    addItemFile,
    loadItemFilesPanel,
  } = useCareNeedItemsData(jwt, clients);

  const renderCategoryDivider = (category) => (
    <tr key={`div-${category}`}>
      <td colSpan={10} style={{ padding: "10px 6px", background: "#f9fafb" }}>
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
          <select
            value={cniClientId}
            onChange={(e) => handleClientChange(e.target.value)}
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
          <label>&nbsp;</label>
          <button
            className="secondary"
            onClick={() => cniClientId && loadItemsFor(cniClientId)}
          >
            Refresh
          </button>
        </div>
      </div>

      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}
      {loading && <p>Loading items…</p>}

      {!loading && items.length === 0 && (
        <p>No care need items for this client.</p>
      )}

      {items.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Category</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Frequency</th>
              <th style={{ textAlign: "left" }}>Budget</th>
              <th style={{ textAlign: "left" }}>Purchase cost</th>
              <th style={{ textAlign: "left" }}>Expected per task</th>
              <th style={{ textAlign: "left" }}>Schedule Period</th>
              <th style={{ textAlign: "left" }}>Returned</th>
              <th style={{ textAlign: "left" }}>Attachments</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [];
              let lastCat = null;

              items.forEach((it) => {
                const cat = it.category || "Other";
                if (cat !== lastCat) {
                  rows.push(renderCategoryDivider(cat));
                  lastCat = cat;
                }

                const rowFiles = filesByItem[it._id] || [];
                const isPurchaseOnly =
                  it.frequency?.intervalType === "JustPurchase";
                const isReturned = it.status === "Returned";

                rows.push(
                  <tr
                    key={it._id}
                    style={{
                      borderTop: "1px solid #eee",
                      opacity: isReturned ? 0.75 : 1,
                    }}
                  >
                    <td></td>
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
                      {isReturned ? (
                        <span
                          className="badge"
                          style={{ background: "#fef3c7", color: "#92400e" }}
                        >
                          Returned
                        </span>
                      ) : (
                        <span style={{ opacity: 0.4 }}>No</span>
                      )}
                    </td>
                    <td>
                      {rowFiles.length === 0 ? (
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
                          {rowFiles.map((f) => (
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
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="secondary"
                          disabled={isReturned}
                          title={
                            isReturned ? "Already returned" : "Mark as returned"
                          }
                          onClick={() => returnItem(it._id)}
                        >
                          Return
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteItem(it._id)}
                          title="Delete item and ALL associated tasks/files/comments"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Return attachments & comments entry (only when returned) */}
                      {isReturned && (
                        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="secondary"
                              onClick={() => toggleItemComments(it._id)}
                            >
                              Comments
                            </button>
                            <button
                              className="secondary"
                              onClick={() => toggleItemFiles(it._id)}
                            >
                              Files
                            </button>
                          </div>

                          {/* Comments panel (item scope) */}
                          {openCommentsForItem === it._id && (
                            <CommentPanel
                              comments={commentsByItem[it._id] || []}
                              newCommentText={newCommentTextItem}
                              onCommentTextChange={setNewCommentTextItem}
                              onAddComment={() => addItemComment(it._id)}
                            />
                          )}

                          {/* Files panel (item scope, direct uploads for returns) */}
                          {openFilesForItem === it._id && (
                            <FilePanel
                              scope="CareNeedItem"
                              targetId={it._id}
                              files={panelFilesByItem[it._id] || []} // direct uploads (panel)
                              newFile={newFileItem}
                              onNewFileChange={setNewFileItem}
                              onAddFile={() => addItemFile(it._id)} // your JSON add for items
                              onLoadFiles={() => loadItemFilesPanel(it._id)} // refresh panel list
                            />
                          )}
                        </div>
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
