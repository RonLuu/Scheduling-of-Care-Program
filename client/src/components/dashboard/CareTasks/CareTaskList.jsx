import React from "react";
import FilePanel from "../Panels/FilePanel";
import CommentPanel from "../Panels/CommentPanel";
import CareTaskCostEditor from "./CareTaskCostEditor.jsx";
import CareTaskRowEditor from "./CareTaskRowEditor.jsx";
import { formatDate } from "../utils/formatters";

function CareTaskList({
  tasks,
  toggleTaskComplete,
  aud,
  costEditorHiddenByTask,
  setCostEditorHiddenByTask,
  costDraftByTask,
  setCostDraftByTask,
  saveTaskCost,
  toggleComments,
  toggleFiles,
  openCommentsFor,
  openFilesFor,
  commentsByTask,
  filesByTask,
  newCommentText,
  setNewCommentText,
  addComment,
  newFile,
  setNewFile,
  addFile,
  loadFiles,
  reloadAfterEdit,
  currentUserId,
}) {
  const [editingTaskId, setEditingTaskId] = React.useState(null);
  const [openActionMenuId, setOpenActionMenuId] = React.useState(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".task-action-menu-container")) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const deleteTaskHard = async (taskId) => {
    setOpenActionMenuId(null);
    if (
      !window.confirm(
        "Delete this task and ALL its files and comments? This cannot be undone."
      )
    )
      return;
    try {
      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");

      const r = await fetch(`/api/care-tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to delete task");
      await reloadAfterEdit?.();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const handleActionClick = (taskId, action) => {
    setOpenActionMenuId(null);

    switch (action) {
      case "edit":
        setEditingTaskId(editingTaskId === taskId ? null : taskId);
        break;
      case "comments":
        toggleComments(taskId);
        break;
      case "files":
        toggleFiles(taskId);
        break;
      case "changeCost":
        setCostEditorHiddenByTask((prev) => ({
          ...prev,
          [taskId]: false,
        }));
        setCostDraftByTask((prev) => ({
          ...prev,
          [taskId]: String(tasks.find((t) => t._id === taskId)?.cost || 0),
        }));
        break;
      case "delete":
        deleteTaskHard(taskId);
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return { bg: "#d1fae5", color: "#065f46" };
      case "Scheduled":
        return { bg: "#dbeafe", color: "#1e40af" };
      case "Missed":
        return { bg: "#fee2e2", color: "#991b1b" };
      case "InProgress":
        return { bg: "#fef3c7", color: "#92400e" };
      default:
        return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  const styles = {
    container: {
      background: "white",
      borderRadius: 8,
      overflow: "hidden",
    },
    header: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 120px 100px 100px 100px",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "2px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      gap: 12,
    },
    headerCell: {
      fontSize: "0.825rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#6b7280",
    },
    taskRow: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 120px 100px 100px 100px",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "1px solid #f3f4f6",
      transition: "background-color 0.15s ease",
      gap: 12,
    },
    taskRowHover: {
      backgroundColor: "#f9fafb",
    },
    checkbox: {
      width: 20,
      height: 20,
      cursor: "pointer",
      margin: 0,
    },
    taskInfo: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
    },
    taskTitle: {
      fontWeight: 500,
      fontSize: "0.95rem",
      color: "#111827",
    },
    taskMeta: {
      fontSize: "0.825rem",
      color: "#6b7280",
    },
    statusBadge: {
      padding: "4px 10px",
      borderRadius: 4,
      fontSize: "0.825rem",
      fontWeight: 500,
      display: "inline-block",
      textAlign: "center",
    },
    costDisplay: {
      fontSize: "0.9rem",
      fontWeight: 500,
      color: "#059669",
      textAlign: "center",
    },
    actionButton: {
      padding: "6px 12px",
      fontSize: "0.875rem",
      borderRadius: 4,
      border: "1px solid #d1d5db",
      background: "white",
      cursor: "pointer",
      transition: "all 0.15s ease",
      fontWeight: 500,
      color: "#374151",
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
    },
    menuItemHover: {
      backgroundColor: "#f9fafb",
    },
    expandedPanel: {
      background: "#f8fafc",
      borderTop: "1px solid #e5e7eb",
      padding: 16,
    },
  };

  return (
    <div style={styles.container}>
      {/* Table header */}
      {tasks.length > 0 && (
        <div style={styles.header}>
          <div style={styles.headerCell}></div>
          <div style={styles.headerCell}>Task</div>
          <div style={{ ...styles.headerCell, textAlign: "center" }}>
            Due Date
          </div>
          <div style={{ ...styles.headerCell, textAlign: "center" }}>
            Status
          </div>
          <div style={{ ...styles.headerCell, textAlign: "center" }}>Cost</div>
          <div style={{ ...styles.headerCell, textAlign: "center" }}>
            Actions
          </div>
        </div>
      )}

      {/* Task rows */}
      {tasks.map((t) => {
        const statusStyle = getStatusColor(t.status);
        const hasExpanded =
          openCommentsFor === t._id ||
          openFilesFor === t._id ||
          editingTaskId === t._id ||
          (!costEditorHiddenByTask[t._id] && t.status === "Completed");

        return (
          <React.Fragment key={t._id}>
            <div
              style={{
                ...styles.taskRow,
                backgroundColor: hasExpanded ? "#fafbfc" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!hasExpanded) {
                  e.currentTarget.style.backgroundColor =
                    styles.taskRowHover.backgroundColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!hasExpanded) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={t.status === "Completed"}
                onChange={(e) => toggleTaskComplete(t, e.target.checked)}
                style={styles.checkbox}
                title={
                  t.status === "Completed"
                    ? "Unmark as completed"
                    : "Mark as completed"
                }
              />

              {/* Task name and metadata */}
              <div style={styles.taskInfo}>
                <div style={styles.taskTitle}>{t.title}</div>
              </div>

              {/* Due date */}
              <div style={{ textAlign: "center", fontSize: "0.875rem" }}>
                {formatDate(t.dueDate)}
              </div>

              {/* Status badge */}
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                  }}
                >
                  {t.status}
                </span>
              </div>

              {/* Cost (when completed) */}
              <div style={styles.costDisplay}>
                {t.status === "Completed" &&
                t.cost !== undefined &&
                t.cost !== null
                  ? aud.format(t.cost)
                  : "—"}
              </div>

              {/* Actions dropdown */}
              <div
                className="task-action-menu-container"
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  style={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenActionMenuId(
                      openActionMenuId === t._id ? null : t._id
                    );
                  }}
                >
                  Actions ▼
                </button>

                {openActionMenuId === t._id && (
                  <div style={styles.actionMenu}>
                    <div
                      style={styles.menuItem}
                      onClick={() => handleActionClick(t._id, "edit")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          styles.menuItemHover.backgroundColor)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      📝 {editingTaskId === t._id ? "Close Edit" : "Edit Task"}
                    </div>

                    {t.status === "Completed" && (
                      <div
                        style={styles.menuItem}
                        onClick={() => handleActionClick(t._id, "changeCost")}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            styles.menuItemHover.backgroundColor)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        💰 Change Cost
                      </div>
                    )}

                    <div
                      style={styles.menuItem}
                      onClick={() => handleActionClick(t._id, "comments")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          styles.menuItemHover.backgroundColor)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      💬 {openCommentsFor === t._id ? "Hide" : "Show"} Comments
                    </div>

                    <div
                      style={styles.menuItem}
                      onClick={() => handleActionClick(t._id, "files")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          styles.menuItemHover.backgroundColor)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      📎 {openFilesFor === t._id ? "Hide" : "Show"} Files
                    </div>

                    <div
                      style={{
                        ...styles.menuItem,
                        borderBottom: "none",
                        color: "#dc2626",
                      }}
                      onClick={() => handleActionClick(t._id, "delete")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fef2f2")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      🗑️ Delete Task
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded panels */}
            {hasExpanded && (
              <div style={styles.expandedPanel}>
                {/* Cost Editor */}
                {t.status === "Completed" && !costEditorHiddenByTask[t._id] && (
                  <CareTaskCostEditor
                    taskId={t._id}
                    currentCost={t.cost}
                    draftValue={costDraftByTask[t._id]}
                    onDraftChange={(value) =>
                      setCostDraftByTask((prev) => ({
                        ...prev,
                        [t._id]: value,
                      }))
                    }
                    onSave={() => saveTaskCost(t._id)}
                  />
                )}

                {/* Task Editor */}
                {editingTaskId === t._id && (
                  <CareTaskRowEditor
                    task={t}
                    onCancel={() => setEditingTaskId(null)}
                    onSaved={async () => {
                      setEditingTaskId(null);
                      await reloadAfterEdit?.();
                    }}
                  />
                )}

                {/* Comments Panel */}
                {openCommentsFor === t._id && (
                  <CommentPanel
                    taskId={t._id}
                    comments={commentsByTask[t._id] || []}
                    newCommentText={newCommentText}
                    onCommentTextChange={setNewCommentText}
                    onAddComment={() => addComment(t._id)}
                    currentUserId={currentUserId}
                    onReload={() =>
                      toggleComments(t._id) || toggleComments(t._id)
                    }
                  />
                )}

                {/* Files Panel */}
                {openFilesFor === t._id && (
                  <FilePanel
                    scope="CareTask"
                    targetId={t._id}
                    files={filesByTask[t._id] || []}
                    newFile={newFile}
                    onNewFileChange={setNewFile}
                    onAddFile={() => addFile(t._id)}
                    onLoadFiles={() => loadFiles(t._id)}
                    currentUserId={currentUserId}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {tasks.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
          No tasks to display
        </div>
      )}
    </div>
  );
}

export default CareTaskList;
