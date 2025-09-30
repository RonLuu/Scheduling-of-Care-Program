import React from "react";
import { aud, formatFrequency } from "../utils/formatters.js";
import CommentPanel from "../Panels/CommentPanel.jsx";
import FilePanel from "../Panels/FilePanel.jsx";
import { useCareNeedItemsData } from "../hooks/useCareNeedItemData.js";
import CareNeedItemRowEditor from "./CareNeedItemRowEditor.jsx";

function List({ jwt, clients }) {
  const {
    cniClientId,
    items,
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
  const [openActionMenuId, setOpenActionMenuId] = React.useState(null);

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

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".action-menu-container")) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const generateNextYearTasks = async (itemId) => {
    setOpenActionMenuId(null);
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

  const handleActionClick = (itemId, action) => {
    setOpenActionMenuId(null);

    switch (action) {
      case "edit":
        setEditingItemId(editingItemId === itemId ? null : itemId);
        break;
      case "comments":
        toggleItemComments(itemId);
        break;
      case "files":
        toggleItemFiles(itemId);
        break;
      case "return":
        returnItem(itemId);
        break;
      case "delete":
        deleteItem(itemId);
        break;
      case "nextYear":
        generateNextYearTasks(itemId);
        break;
      default:
        break;
    }
  };

  const styles = {
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: "0.925rem",
    },
    categoryRow: {
      background: "linear-gradient(to right, #f0f9ff, #f8fafc)",
      borderLeft: "3px solid #3b82f6",
    },
    categoryCell: {
      padding: "10px 12px",
      fontWeight: 600,
      fontSize: "0.875rem",
      color: "#1e40af",
      letterSpacing: "0.025em",
    },
    headerCell: {
      textAlign: "left",
      padding: "10px 12px",
      borderBottom: "2px solid #e5e7eb",
      fontWeight: 600,
      fontSize: "0.825rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#6b7280",
    },
    dataRow: {
      borderBottom: "1px solid #f3f4f6",
      transition: "background-color 0.15s ease",
      "&:hover": {
        backgroundColor: "#f9fafb",
      },
    },
    dataCell: {
      padding: "12px",
      verticalAlign: "middle",
    },
    compactButton: {
      padding: "5px 10px",
      fontSize: "0.825rem",
      borderRadius: 4,
      border: "1px solid #d1d5db",
      background: "white",
      cursor: "pointer",
      transition: "all 0.15s ease",
      color: "#374151",
      "&:hover": {
        backgroundColor: "#f3f4f6",
        borderColor: "#9ca3af",
      },
    },
    actionMenu: {
      position: "absolute",
      right: 0,
      top: "100%",
      marginTop: 4,
      background: "white",
      border: "1px solid #d1d5db",
      borderRadius: 6,
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 10,
      minWidth: 180,
      overflow: "hidden",
    },
    menuItem: {
      padding: "8px 12px",
      fontSize: "0.875rem",
      cursor: "pointer",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "background-color 0.15s ease",
      "&:hover": {
        backgroundColor: "#f9fafb",
      },
    },
    statusBadge: {
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: "0.75rem",
      fontWeight: 500,
      display: "inline-block",
    },
    expandedPanel: {
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      margin: "8px 12px 12px 12px",
      padding: 12,
    },
  };

  return (
    <div className="card">
      <h3>Sub-element List</h3>
      <div className="row" style={{ marginBottom: 20 }}>
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

      {err && <p style={{ color: "#dc2626" }}>Error: {err}</p>}
      {loading && <p>Loading items…</p>}
      {!loading && items.length === 0 && <p>No items for this client.</p>}

      {items.length > 0 && (
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.headerCell}>Name</th>
              <th style={styles.headerCell}>Frequency</th>
              <th style={styles.headerCell}>Budget</th>
              <th style={styles.headerCell}>Purchase</th>
              <th style={styles.headerCell}>Status</th>
              <th style={{ ...styles.headerCell, textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {groupedByCategory.map(([category, group]) => (
              <React.Fragment key={category}>
                <tr style={styles.categoryRow}>
                  <td colSpan={6} style={styles.categoryCell}>
                    {category} ({group.length} item
                    {group.length !== 1 ? "s" : ""})
                  </td>
                </tr>

                {group.map((it) => {
                  const isReturned = it.status === "Returned";
                  const hasExpanded =
                    openCommentsForItem === it._id ||
                    openFilesForItem === it._id ||
                    editingItemId === it._id;

                  return (
                    <React.Fragment key={it._id}>
                      <tr
                        style={{
                          ...styles.dataRow,
                          opacity: isReturned ? 0.65 : 1,
                          backgroundColor: hasExpanded
                            ? "#fafbfc"
                            : "transparent",
                        }}
                      >
                        <td style={{ ...styles.dataCell, fontWeight: 500 }}>
                          {it.name}
                          {it.frequency?.startDate && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              {it.frequency.intervalType === "JustPurchase"
                                ? "On: "
                                : "Started: "}
                              {new Date(
                                it.frequency.startDate
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={styles.dataCell}>
                          <span
                            style={{ color: "#059669", fontSize: "0.875rem" }}
                          >
                            {formatFrequency(it.frequency)}
                          </span>
                        </td>
                        <td style={styles.dataCell}>
                          {aud.format(it.budgetCost || 0)}
                        </td>
                        <td style={styles.dataCell}>
                          {aud.format(it.purchaseCost || 0)}
                        </td>
                        <td style={styles.dataCell}>
                          {isReturned ? (
                            <span
                              style={{
                                ...styles.statusBadge,
                                background: "#fef3c7",
                                color: "#92400e",
                              }}
                            >
                              Returned
                            </span>
                          ) : (
                            <span
                              style={{
                                ...styles.statusBadge,
                                background: "#d1fae5",
                                color: "#065f46",
                              }}
                            >
                              Active
                            </span>
                          )}
                        </td>

                        <td style={{ ...styles.dataCell, textAlign: "center" }}>
                          <div
                            className="action-menu-container"
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                          >
                            <button
                              style={{
                                ...styles.compactButton,
                                fontWeight: 500,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(
                                  openActionMenuId === it._id ? null : it._id
                                );
                              }}
                            >
                              Actions ▼
                            </button>

                            {openActionMenuId === it._id && (
                              <div style={styles.actionMenu}>
                                {!isReturned && (
                                  <div
                                    style={styles.menuItem}
                                    onClick={() =>
                                      handleActionClick(it._id, "edit")
                                    }
                                  >
                                    📝{" "}
                                    {editingItemId === it._id
                                      ? "Close Edit"
                                      : "Edit Details"}
                                  </div>
                                )}

                                <div
                                  style={styles.menuItem}
                                  onClick={() =>
                                    handleActionClick(it._id, "comments")
                                  }
                                >
                                  💬{" "}
                                  {openCommentsForItem === it._id
                                    ? "Hide"
                                    : "Show"}{" "}
                                  Comments
                                </div>

                                <div
                                  style={styles.menuItem}
                                  onClick={() =>
                                    handleActionClick(it._id, "files")
                                  }
                                >
                                  📎{" "}
                                  {openFilesForItem === it._id
                                    ? "Hide"
                                    : "Show"}{" "}
                                  Files
                                </div>

                                {!isReturned && (
                                  <div
                                    style={styles.menuItem}
                                    onClick={() =>
                                      handleActionClick(it._id, "return")
                                    }
                                  >
                                    ↩️ Mark as Returned
                                  </div>
                                )}

                                {!isReturned &&
                                  it.frequency?.intervalType !==
                                    "JustPurchase" &&
                                  it.endDate === null &&
                                  it.occurrenceCount === null && (
                                    <div
                                      style={{
                                        ...styles.menuItem,
                                        background: "#f0fdf4",
                                        color: "#15803d",
                                        fontWeight: 500,
                                      }}
                                      onClick={() =>
                                        handleActionClick(it._id, "nextYear")
                                      }
                                    >
                                      📅 Copy to Next Year
                                    </div>
                                  )}

                                <div
                                  style={{
                                    ...styles.menuItem,
                                    borderBottom: "none",
                                    color: "#dc2626",
                                  }}
                                  onClick={() =>
                                    handleActionClick(it._id, "delete")
                                  }
                                >
                                  🗑️ Delete Item
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded panels row */}
                      {hasExpanded && (
                        <tr key={`${it._id}__expanded`}>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={styles.expandedPanel}>
                              {editingItemId === it._id && (
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
                              )}

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
                            </div>
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
