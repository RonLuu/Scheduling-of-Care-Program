import React from "react";
import { aud, formatFrequency } from "../utils/formatters.js";
import CommentPanel from "../Panels/CommentPanel.jsx";
import FilePanel from "../Panels/FilePanel.jsx";
import { useCareNeedItemsData } from "../hooks/useCareNeedItemData.js";
import CareNeedItemRowEditor from "./CareNeedItemRowEditor.jsx";

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
    currentUserId,
  } = useCareNeedItemsData(jwt, clients);

  // track which item is being edited
  const [editingItemId, setEditingItemId] = React.useState(null);

  // auto-close editor if the item being edited is marked returned
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
    // optional: sort categories and their items by name
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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
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
            {groupedByCategory.map(([category, group]) => (
              <React.Fragment key={category}>
                {/* Category divider (appears once) */}
                <tr>
                  <td
                    colSpan={9}
                    style={{ padding: "10px 6px", background: "#f9fafb" }}
                  >
                    <strong style={{ fontSize: 13 }}>{category}</strong>
                  </td>
                </tr>

                {/* Items in this category */}
                {group.map((it) => {
                  const rowFiles = filesByItem[it._id] || [];
                  const isPurchaseOnly =
                    it.frequency?.intervalType === "JustPurchase";
                  const isReturned = it.status === "Returned";

                  return (
                    <React.Fragment key={it._id}>
                      <tr
                        style={{
                          borderTop: "1px solid #eee",
                          opacity: isReturned ? 0.75 : 1,
                        }}
                      >
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
                                ? `${it.timeWindow.startTime}–${it.timeWindow.endTime}`
                                : "All-day"}
                            </span>
                          )}
                        </td>
                        <td>
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
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {!isReturned && (
                              <>
                                <button
                                  className="secondary"
                                  title="Edit details"
                                  onClick={() =>
                                    setEditingItemId(
                                      editingItemId === it._id ? null : it._id
                                    )
                                  }
                                >
                                  {editingItemId === it._id
                                    ? "Close edit"
                                    : "Edit"}
                                </button>
                                <button
                                  className="secondary"
                                  title="Mark as returned"
                                  onClick={() => returnItem(it._id)}
                                >
                                  Return
                                </button>
                              </>
                            )}

                            <button
                              className="danger"
                              onClick={() => deleteItem(it._id)}
                              title="Delete item and ALL associated tasks/files/comments"
                            >
                              Delete
                            </button>
                          </div>

                          {/* Returned: comments/files panels */}
                          {isReturned && (
                            <div
                              style={{ marginTop: 8, display: "grid", gap: 8 }}
                            >
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

                              {openCommentsForItem === it._id && (
                                <CommentPanel
                                  comments={commentsByItem[it._id] || []}
                                  newCommentText={newCommentTextItem}
                                  onCommentTextChange={setNewCommentTextItem}
                                  onAddComment={() => addItemComment(it._id)}
                                  currentUserId={currentUserId}
                                />
                              )}

                              {openFilesForItem === it._id && (
                                <FilePanel
                                  taskId={it._id}
                                  scope="CareNeedItem"
                                  targetId={it._id}
                                  files={panelFilesByItem[it._id] || []}
                                  newFile={newFileItem}
                                  onNewFileChange={setNewFileItem}
                                  onAddFile={() => addItemFile(it._id)}
                                  onLoadFiles={() => loadItemFilesPanel(it._id)}
                                  currentUserId={currentUserId}
                                  onReload={() =>
                                    toggleItemComments(it._id) ||
                                    toggleItemComments(it._id)
                                  }
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Inline editor row (only when not returned) */}
                      {!isReturned && editingItemId === it._id && (
                        <tr key={`${it._id}__editor`}>
                          <td colSpan={9} style={{ paddingTop: 0 }}>
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
