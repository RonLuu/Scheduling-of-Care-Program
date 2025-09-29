import React from "react";
import { aud, formatFrequency } from "../utils/formatters.js";
import CommentPanel from "../Panels/CommentPanel.jsx";
import FilePanel from "../Panels/FilePanel.jsx";
import { useCareNeedItemsData } from "../hooks/useCareNeedItemData.js";
import CareNeedItemRowEditor from "./CareNeedItemRowEditor.jsx";

// function InlineAttachment({ f }) {
//   const isImg = f.fileType && f.fileType.startsWith("image/");
//   return (
//     <a href={f.urlOrPath} target="_blank" rel="noreferrer" title={f.filename}>
//       {isImg ? (
//         <img
//           src={f.urlOrPath}
//           alt={f.filename}
//           style={{
//             maxHeight: 64,
//             maxWidth: 96,
//             objectFit: "cover",
//             borderRadius: 6,
//             border: "1px solid #ddd",
//           }}
//         />
//       ) : (
//         <span style={{ textDecoration: "underline" }}>{f.filename}</span>
//       )}
//     </a>
//   );
// }

function List({ jwt, clients }) {
  const {
    cniClientId,
    items,
    // filesByItem,
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
    currentUserId,
    loadItemComments,
  } = useCareNeedItemsData(jwt, clients);

  const [editingItemId, setEditingItemId] = React.useState(null);

  const closeEditorIfReturned = React.useCallback(() => {
    if (!editingItemId) return;
    const edited = items.find((x) => x._id === editingItemId);
    if (edited && edited.status === "Returned") {
      setEditingItemId(null);
    }
  }, [editingItemId, items]);

  const groupedByCategory = React.useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const cat = it.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(it);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, arr]) => [
        cat,
        arr.sort((x, y) => (x.name || "").localeCompare(y.name || "")),
      ]);
  }, [items]);

  React.useEffect(() => {
    closeEditorIfReturned();
  }, [items, closeEditorIfReturned]);

  const generateNextYearTasks = async (itemId) => {
    if (
      !window.confirm(
        "This will replace ALL tasks for next year with newly generated ones. Continue?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/scheduling/care-need-items/${itemId}/generate-next-year`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate tasks");

      alert(
        `Successfully generated ${data.created} tasks for next year (deleted ${data.deleted} existing).`
      );
      if (cniClientId) await loadItemsFor(cniClientId);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="card">
      <h3>Sub-element List</h3>
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
      {!loading && items.length === 0 && <p>No items for this client.</p>}

      {items.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed", // evenly distribute column widths
          }}
        >
          {/* 5 columns, evenly spaced */}
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Frequency</th>
              <th style={{ textAlign: "left", padding: 8 }}>Purchase cost</th>
              <th style={{ textAlign: "left", padding: 8 }}>Returned</th>
              <th style={{ textAlign: "center", padding: 8 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {groupedByCategory.map(([category, group]) => (
              <React.Fragment key={category}>
                <tr>
                  <td
                    colSpan={5} // <-- fix colSpan
                    style={{
                      padding: "8px", // match body cell padding
                      background: "#f9fafb",
                      textAlign: "left", // <-- only this row is left-aligned
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{category}</strong>
                  </td>
                </tr>

                {group.map((it) => {
                  const isReturned = it.status === "Returned";
                  return (
                    <React.Fragment key={it._id}>
                      <tr
                        style={{
                          borderTop: "1px solid #eee",
                          opacity: isReturned ? 0.75 : 1,
                        }}
                      >
                        <td style={{ textAlign: "left", padding: 8 }}>
                          {it.name}
                        </td>
                        <td style={{ textAlign: "left", padding: 8 }}>
                          {formatFrequency(it.frequency)}
                        </td>
                        <td style={{ textAlign: "left", padding: 8 }}>
                          {aud.format(it.purchaseCost || 0)}
                        </td>
                        <td style={{ textAlign: "left", padding: 8 }}>
                          {isReturned ? (
                            <span
                              className="badge"
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                              }}
                            >
                              Returned
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>No</span>
                          )}
                        </td>

                        {/* Compact, centered actions that wrap */}
                        <td style={{ textAlign: "center", padding: 8 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(110px, 1fr))",
                              gap: 6,
                              justifyItems: "center",
                            }}
                          >
                            {!isReturned && (
                              <button
                                className="secondary"
                                title="Edit details"
                                onClick={() =>
                                  setEditingItemId(
                                    editingItemId === it._id ? null : it._id
                                  )
                                }
                                style={{ padding: "4px 8px", fontSize: 12 }}
                              >
                                {editingItemId === it._id
                                  ? "Close edit"
                                  : "Edit"}
                              </button>
                            )}

                            <button
                              className="secondary"
                              title="View/add comments"
                              onClick={() => toggleItemComments(it._id)}
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            >
                              {openCommentsForItem === it._id
                                ? "Hide comments"
                                : "Show comments"}
                            </button>

                            <button
                              className="secondary"
                              title="View/add files"
                              onClick={() => toggleItemFiles(it._id)}
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            >
                              {openFilesForItem === it._id
                                ? "Hide files"
                                : "Show files"}
                            </button>

                            {!isReturned && (
                              <button
                                className="secondary"
                                title="Mark as returned"
                                onClick={() => returnItem(it._id)}
                                style={{ padding: "4px 8px", fontSize: 12 }}
                              >
                                Return
                              </button>
                            )}

                            {!isReturned &&
                              it.frequency?.intervalType !== "JustPurchase" &&
                              it.endDate === null &&
                              it.occurrenceCount === null && (
                                <button
                                  className="secondary"
                                  title="Generate all tasks for next year"
                                  onClick={() => generateNextYearTasks(it._id)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: 12,
                                    backgroundColor: "#10b981",
                                    color: "white",
                                  }}
                                >
                                  Next year
                                </button>
                              )}

                            <button
                              className="danger"
                              onClick={() => deleteItem(it._id)}
                              title="Delete item and ALL associated tasks/files/comments"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {(openCommentsForItem === it._id ||
                        openFilesForItem === it._id) && (
                        <tr key={`${it._id}__panels`}>
                          <td colSpan={5} style={{ paddingTop: 0 }}>
                            {openCommentsForItem === it._id && (
                              <CommentPanel
                                comments={commentsByItem[it._id] || []}
                                newCommentText={newCommentTextItem}
                                onCommentTextChange={setNewCommentTextItem}
                                onAddComment={() => addItemComment(it._id)}
                                currentUserId={currentUserId}
                                onReload={() => loadItemComments(it._id)}
                              />
                            )}

                            {openFilesForItem === it._id && (
                              <FilePanel
                                scope="CareNeedItem"
                                targetId={it._id}
                                files={panelFilesByItem[it._id] || []}
                                newFile={newFileItem}
                                onNewFileChange={setNewFileItem}
                                onAddFile={() => addItemFile(it._id)}
                                onLoadFiles={() => loadItemFilesPanel(it._id)}
                                currentUserId={currentUserId}
                              />
                            )}
                          </td>
                        </tr>
                      )}

                      {!isReturned && editingItemId === it._id && (
                        <tr key={`${it._id}__editor`}>
                          <td colSpan={5} style={{ paddingTop: 0 }}>
                            <CareNeedItemRowEditor
                              item={it}
                              jwt={jwt}
                              onCancel={() => setEditingItemId(null)}
                              onSaved={async () => {
                                setEditingItemId(null);
                                if (cniClientId)
                                  await loadItemsFor(cniClientId);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default List;
