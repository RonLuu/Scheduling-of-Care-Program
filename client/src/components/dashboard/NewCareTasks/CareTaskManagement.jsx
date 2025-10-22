// CareTaskManagement.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import CareTaskCalendar from "../CareTasks/CareTaskCalendar";

const CareTaskManagement = React.forwardRef(
  ({ jwt, clients, me, selectedClient, setSelectedClient }, ref) => {
    const [tasks, setTasks] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showTaskModal, setShowTaskModal] = React.useState(false);

    // Load tasks for selected client
    const loadTasks = React.useCallback(
      async (clientId) => {
        if (!clientId) {
          setTasks([]);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const response = await fetch(`/api/care-tasks/client/${clientId}`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });

          if (!response.ok) {
            throw new Error("Failed to load tasks");
          }

          const data = await response.json();
          setTasks(data);
        } catch (err) {
          setError(err.message || "Failed to load tasks");
          setTasks([]);
        } finally {
          setLoading(false);
        }
      },
      [jwt]
    );

    // Expose reloadTasks method to parent component
    React.useImperativeHandle(ref, () => ({
      reloadTasks: (clientId) => {
        // Use provided clientId or the currently selected client
        const clientToLoad = clientId || selectedClient;

        if (clientToLoad) {
          loadTasks(clientToLoad);
        } else if (clients && clients.length > 0) {
          // If no client selected but clients exist, select and load the first one
          const firstClientId = clients[0]._id;
          setSelectedClient(firstClientId);
          loadTasks(firstClientId);
        }
      },
    }));

    // Handle client change
    const handleClientChange = (e) => {
      const clientId = e.target.value;
      setSelectedClient(clientId);
      loadTasks(clientId);
    };

    // Handle task click
    const handleTaskClick = (task) => {
      setSelectedTask(task);
      setShowTaskModal(true);
    };

    // Handle task deletion
    const handleDeleteTask = async () => {
      if (!selectedTask) return;

      if (
        !confirm(`Are you sure you want to delete "${selectedTask.title}"?`)
      ) {
        return;
      }

      try {
        const response = await fetch(`/api/care-tasks/${selectedTask._id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to delete task");
        }

        // Close modal and reload tasks
        setShowTaskModal(false);
        setSelectedTask(null);
        loadTasks(selectedClient);
      } catch (err) {
        alert("Error deleting task: " + err.message);
      }
    };

    // Auto-select first client on mount
    React.useEffect(() => {
      if (clients.length > 0 && !selectedClient) {
        const firstClientId = clients[0]._id;
        setSelectedClient(firstClientId);
        loadTasks(firstClientId);
      }
    }, [clients, selectedClient, loadTasks]);

    return (
      <div className="task-management">
        <div className="management-header">
          <div className="client-selector">
            {clients.length > 1 ? (
              <>
                <label htmlFor="client-select">Client:</label>
                <select
                  id="client-select"
                  value={selectedClient}
                  onChange={handleClientChange}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </>
            ) : clients.length === 1 ? (
              <div className="single-client">
                <strong>Client:</strong> {clients[0].name}
              </div>
            ) : null}
          </div>

          <div className="view-controls">
            <button
              className="refresh-btn"
              onClick={() => selectedClient && loadTasks(selectedClient)}
              title="Refresh tasks"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading && <div className="loading-state">Loading tasks...</div>}
        {error && <div className="error-state">{error}</div>}

        {!loading && !error && !selectedClient && (
          <div className="empty-state">
            <p>Please select a client to view their tasks</p>
          </div>
        )}

        {!loading && !error && selectedClient && tasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks found for this client</p>
            <p className="hint">Create a task using the form above</p>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <div className="tasks-view">
            <CareTaskCalendar tasks={tasks} onTaskClick={handleTaskClick} />
          </div>
        )}

        {/* Task Detail Modal */}
        {showTaskModal && selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            jwt={jwt}
            me={me}
            onClose={() => {
              setShowTaskModal(false);
              setSelectedTask(null);
            }}
            onDelete={handleDeleteTask}
            onSave={() => {
              setShowTaskModal(false);
              setSelectedTask(null);
              loadTasks(selectedClient);
            }}
          />
        )}

        <style jsx>{`
          .task-management {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
          }

          .management-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .client-selector {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .client-selector label {
            font-weight: 600;
            color: #374151;
          }

          .client-selector select {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.95rem;
          }

          .single-client {
            color: #374151;
          }

          .view-controls {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .refresh-btn {
            padding: 0.5rem 1rem;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .refresh-btn:hover {
            background: #f3f4f6;
          }

          .loading-state,
          .error-state,
          .empty-state {
            padding: 3rem;
            text-align: center;
            color: #6b7280;
          }

          .error-state {
            color: #dc2626;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
          }

          .empty-state .hint {
            font-size: 0.875rem;
            color: #9ca3af;
            margin-top: 0.5rem;
          }

          .tasks-view {
            margin-top: 1.5rem;
          }

          @media (max-width: 768px) {
            .management-header {
              flex-direction: column;
              align-items: stretch;
            }

            .view-controls {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    );
  }
);

CareTaskManagement.displayName = "CareTaskManagement";

// Task Detail Modal
function TaskDetailModal({ task, jwt, me, onClose, onDelete, onSave }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [budgetCategoryName, setBudgetCategoryName] = React.useState("");
  const [budgetItemName, setBudgetItemName] = React.useState("");

  // New states for completed/returned task features
  const [isEditingCost, setIsEditingCost] = React.useState(false);
  const [editedCost, setEditedCost] = React.useState(task.cost || "");
  const [showAddSection, setShowAddSection] = React.useState(false);
  const [newComment, setNewComment] = React.useState("");
  const [newFiles, setNewFiles] = React.useState([]);
  const [isAddingSupplement, setIsAddingSupplement] = React.useState(false);

  const [editedTask, setEditedTask] = React.useState({
    title: task.title,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().split("T")[0]
      : "",
    scheduleType: task.scheduleType,
    startAt: task.startAt
      ? new Date(task.startAt).toTimeString().slice(0, 5)
      : "",
    endAt: task.endAt ? new Date(task.endAt).toTimeString().slice(0, 5) : "",
  });

  // Load budget category and item names
  React.useEffect(() => {
    const loadBudgetNames = async () => {
      if (!task.budgetCategoryId && !task.budgetItemId) return;

      try {
        // Get current year
        const currentYear = new Date().getFullYear();

        const response = await fetch(
          `/api/budget-plans?personId=${task.personId}&year=${currentYear}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const categories = data.budgetPlan?.categories || [];

          // Find category name
          if (task.budgetCategoryId) {
            const category = categories.find(
              (c) => c.id === task.budgetCategoryId
            );
            if (category) {
              setBudgetCategoryName(category.name);

              // Find budget item name within that category
              if (task.budgetItemId) {
                const item = category.items?.find(
                  (i) => String(i._id) === String(task.budgetItemId)
                );
                if (item) {
                  setBudgetItemName(item.name);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading budget names:", err);
      }
    };

    loadBudgetNames();
  }, [task.budgetCategoryId, task.budgetItemId, task.personId, jwt]);

  // Load comments and files for completed/returned tasks
  React.useEffect(() => {
    const loadCompletionDetails = async () => {
      if (task.status !== "Completed" && task.status !== "Returned") return;

      setLoadingDetails(true);
      try {
        // Load comments
        const commentsResponse = await fetch(
          `/api/comments?careTaskId=${task._id}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }

        // Load files - both direct uploads and referenced files
        const filesResponse = await fetch(
          `/api/file-upload?scope=CareTask&targetId=${task._id}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        let allFiles = [];
        if (filesResponse.ok) {
          const directFiles = await filesResponse.json();
          allFiles = [...directFiles];
        }

        // Also load files from fileRefs (shared receipts)
        if (task.fileRefs && task.fileRefs.length > 0) {
          const refsPromises = task.fileRefs.map((fileId) =>
            fetch(`/api/file-upload/${fileId}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }).then((res) => (res.ok ? res.json() : null))
          );
          const refsFiles = await Promise.all(refsPromises);
          allFiles = [...allFiles, ...refsFiles.filter((f) => f !== null)];
        }

        setFiles(allFiles);
      } catch (err) {
        console.error("Error loading completion details:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadCompletionDetails();
  }, [task._id, task.status, jwt]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSaveEdit = async () => {
    // Validation
    if (!editedTask.title.trim()) {
      alert("Task title is required");
      return;
    }

    if (!editedTask.dueDate) {
      alert("Due date is required");
      return;
    }

    if (
      editedTask.scheduleType === "Timed" &&
      (!editedTask.startAt || !editedTask.endAt)
    ) {
      alert("Start and end times are required for timed tasks");
      return;
    }

    setIsSaving(true);

    try {
      // Helper function to combine date and time
      const combineDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return undefined;
        const date = new Date(dateStr);
        const [hours, minutes] = timeStr.split(":");
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toISOString();
      };

      // Prepare payload
      const payload = {
        title: editedTask.title.trim(),
        dueDate: editedTask.dueDate,
        scheduleType: editedTask.scheduleType,
      };

      // Only add time fields if schedule type is Timed
      if (editedTask.scheduleType === "Timed") {
        payload.startAt = combineDateTime(
          editedTask.dueDate,
          editedTask.startAt
        );
        payload.endAt = combineDateTime(editedTask.dueDate, editedTask.endAt);
      } else {
        // Clear time fields if changing from Timed to AllDay
        payload.startAt = null;
        payload.endAt = null;
      }

      const response = await fetch(`/api/care-tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      // Success - close modal and notify parent
      setIsEditing(false);
      if (onSave) {
        onSave();
      }
    } catch (err) {
      alert("Error saving task: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditedTask({
      title: task.title,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      scheduleType: task.scheduleType,
      startAt: task.startAt
        ? new Date(task.startAt).toTimeString().slice(0, 5)
        : "",
      endAt: task.endAt ? new Date(task.endAt).toTimeString().slice(0, 5) : "",
    });
    setIsEditing(false);
  };

  // Handle cost edit save
  const handleSaveCost = async () => {
    const costValue = parseFloat(editedCost);
    if (editedCost && (isNaN(costValue) || costValue < 0)) {
      alert("Please enter a valid cost amount");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/care-tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          cost: editedCost ? costValue : 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update cost");
      }

      setIsEditingCost(false);
      if (onSave) {
        onSave();
      }
    } catch (err) {
      alert("Error updating cost: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle refund (change to Returned status)
  const handleRefund = async () => {
    const confirmMessage =
      "Are you sure you want to mark this task as returned\n\n" +
      "It's recommended to add a comment explaining the reason and upload any relevant proof (receipt, documentation, etc.).";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/care-tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          status: "Returned",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      // Show the add section automatically for adding proof/comment
      setShowAddSection(true);
      if (onSave) {
        onSave();
      }
    } catch (err) {
      alert("Error processing refund: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle adding new comment and files
  const handleAddSupplement = async () => {
    if (!newComment.trim() && newFiles.length === 0) {
      alert("Please add a comment or select files to upload");
      return;
    }

    setIsAddingSupplement(true);
    try {
      // Add comment if provided
      if (newComment.trim()) {
        await fetch(`/api/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            careTaskId: task._id,
            text: newComment.trim(),
          }),
        });
      }

      // Upload files
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("scope", "CareTask");
        formData.append("targetId", task._id);
        formData.append("description", "Additional Document");

        await fetch("/api/file-upload/upload?scope=CareTask", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        });
      }

      // Reset form and refresh
      setNewComment("");
      setNewFiles([]);
      setShowAddSection(false);
      if (onSave) {
        onSave();
      }
    } catch (err) {
      alert("Error adding supplement: " + err.message);
    } finally {
      setIsAddingSupplement(false);
    }
  };

  const handleNewFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...files]);
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isOverdue =
    task.status === "Scheduled" && new Date(task.dueDate) < new Date();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task Details</h2>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            {isEditing ? (
              <input
                type="text"
                className="edit-input title-input"
                value={editedTask.title}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, title: e.target.value })
                }
                placeholder="Task title"
              />
            ) : (
              <>
                <h3 className="task-title">{task.title}</h3>
                <span
                  className={`status-badge ${task.status.toLowerCase()} ${
                    isOverdue ? "overdue" : ""
                  }`}
                >
                  {isOverdue ? "Overdue" : task.status}
                </span>
              </>
            )}
          </div>

          <div className="detail-row">
            <span className="detail-label">Due Date:</span>
            {isEditing ? (
              <input
                type="date"
                className="edit-input"
                value={editedTask.dueDate}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, dueDate: e.target.value })
                }
              />
            ) : (
              <span className="detail-value">{formatDate(task.dueDate)}</span>
            )}
          </div>

          {task.assignedToUserId && (
            <div className="detail-row">
              <span className="detail-label">Assigned To:</span>
              <span className="detail-value">
                {task.assignedToUserId.name || task.assignedToUserId.email}
              </span>
            </div>
          )}

          {budgetCategoryName && (
            <div className="detail-row">
              <span className="detail-label">Budget Category:</span>
              <span className="detail-value">{budgetCategoryName}</span>
            </div>
          )}

          {budgetItemName && (
            <div className="detail-row">
              <span className="detail-label">Budget Item:</span>
              <span className="detail-value">{budgetItemName}</span>
            </div>
          )}

          {task.expectedCost !== undefined &&
            task.expectedCost !== null &&
            task.status !== "Completed" &&
            task.status !== "Returned" && (
              <div className="detail-row">
                <span className="detail-label">Expected Cost:</span>
                <span className="detail-value cost">
                  ${task.expectedCost.toFixed(2)}
                </span>
              </div>
            )}

          {/* Cost section for Completed/Returned tasks */}
          {(task.status === "Completed" || task.status === "Returned") && (
            <div className="detail-row cost-row">
              <span className="detail-label">
                {task.status === "Returned" ? "Original Cost:" : "Cost:"}
              </span>
              {isEditingCost && task.status === "Completed" ? (
                <div className="cost-edit-group">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="cost-edit-input"
                    value={editedCost}
                    onChange={(e) => setEditedCost(e.target.value)}
                  />
                  <button
                    className="btn-inline save"
                    onClick={handleSaveCost}
                    disabled={isSaving}
                  >
                    Save
                  </button>
                  <button
                    className="btn-inline cancel"
                    onClick={() => {
                      setIsEditingCost(false);
                      setEditedCost(task.cost || "");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="cost-display-group">
                  <span className="detail-value cost">
                    ${(task.cost || 0).toFixed(2)}
                  </span>
                  {task.status === "Completed" && (
                    <button
                      className="btn-inline edit"
                      onClick={() => setIsEditingCost(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completion Details for Completed/Returned Tasks */}
          {(task.status === "Completed" || task.status === "Returned") && (
            <>
              {loadingDetails && (
                <div className="loading-details">
                  Loading completion details...
                </div>
              )}

              {/* Comments Section */}
              {!loadingDetails && comments.length > 0 && (
                <div className="completion-section">
                  <h4 className="completion-section-title">Comments</h4>
                  <div className="comments-list">
                    {comments.map((comment) => (
                      <div key={comment._id} className="comment-item">
                        <div className="comment-meta">
                          <span className="comment-author">
                            {comment.author?.name ||
                              comment.author?.email ||
                              comment.authorUserId?.name ||
                              comment.authorUserId?.email ||
                              "User"}
                          </span>
                          <span className="comment-date">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {!loadingDetails && files.length > 0 && (
                <div className="completion-section">
                  <h4 className="completion-section-title">
                    Receipts & Documents ({files.length})
                  </h4>
                  <div className="files-list">
                    {files.map((file) => (
                      <div key={file._id} className="file-item">
                        <div className="file-info">
                          <div className="file-details">
                            <span className="file-name">{file.filename}</span>
                            <span className="file-meta">
                              {file.description && `${file.description} • `}
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <div className="file-actions">
                          <a
                            href={file.urlOrPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-action-btn view-btn"
                          >
                            View
                          </a>
                          <a
                            href={file.urlOrPath}
                            download={file.filename}
                            className="file-action-btn download-btn"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Comments/Files Section */}
              {showAddSection && (
                <div className="add-supplement-section">
                  <h4 className="section-title">Add Comments or Documents</h4>
                  {task.status === "Returned" && (
                    <p className="info-message">
                      ℹ️ Please provide details about the return/refund and
                      upload any supporting documents.
                    </p>
                  )}
                  <div className="add-form">
                    <div className="form-group">
                      <label>Comment</label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add any notes or explanations..."
                        rows="4"
                        className="comment-textarea"
                      />
                    </div>

                    <div className="form-group">
                      <label>Upload Files</label>
                      <input
                        type="file"
                        multiple
                        onChange={handleNewFileChange}
                        className="file-input"
                        id="new-files-input"
                      />
                      <label
                        htmlFor="new-files-input"
                        className="file-input-label"
                      >
                        Choose Files
                      </label>
                      {newFiles.length > 0 && (
                        <div className="new-files-list">
                          {newFiles.map((file, index) => (
                            <div key={index} className="new-file-item">
                              <span className="file-name">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeNewFile(index)}
                                className="remove-btn"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="add-form-actions">
                      <button
                        className="btn-submit"
                        onClick={handleAddSupplement}
                        disabled={isAddingSupplement}
                      >
                        {isAddingSupplement ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => {
                          setShowAddSection(false);
                          setNewComment("");
                          setNewFiles([]);
                        }}
                        disabled={isAddingSupplement}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Button to show add section if not already shown */}
              {!showAddSection && !loadingDetails && (
                <button
                  className="btn-add-supplement"
                  onClick={() => setShowAddSection(true)}
                >
                  + Add Comment and Files
                </button>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button
                className="btn-save"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="btn-close"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {task.status === "Completed" && (
                <button
                  className="btn-refund"
                  onClick={handleRefund}
                  disabled={isSaving}
                  title="Mark this task as returned/refunded"
                >
                  {isSaving ? "Processing..." : "Refund"}
                </button>
              )}
              {task.status !== "Completed" && task.status !== "Returned" && (
                <button
                  className="btn-complete"
                  onClick={() => navigate(`/tasks/${task._id}/complete`)}
                >
                  Complete Task
                </button>
              )}
              {task.status !== "Completed" &&
                task.status !== "Returned" &&
                (me?.role === "Family" ||
                  me?.role === "PoA" ||
                  me?.role === "Admin") && (
                  <button
                    className="btn-reschedule"
                    onClick={() => setIsEditing(true)}
                  >
                    Reschedule
                  </button>
                )}
              {task.status !== "Completed" &&
                task.status !== "Returned" &&
                (me?.role === "Family" ||
                  me?.role === "PoA" ||
                  me?.role === "Admin") && (
                  <button className="btn-delete" onClick={onDelete}>
                    Delete Task
                  </button>
                )}
              <button className="btn-close" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 300px;
          width: 70%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .task-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
        }

        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-badge.scheduled {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.completed {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.returned {
          background: #fef3c7;
          color: #d97706;
        }

        .status-badge.overdue {
          background: #fee2e2;
          color: #dc2626;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-row.cost-row {
          align-items: center;
        }

        .detail-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .detail-value {
          color: #1f2937;
          font-size: 0.875rem;
        }

        .detail-value.cost {
          font-weight: 600;
          color: #10b981;
          font-size: 1rem;
        }

        .cost-edit-group,
        .cost-display-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .currency-symbol {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .cost-edit-input {
          width: 100px;
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .btn-inline {
          padding: 0.25rem 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-inline.edit {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-inline.edit:hover {
          background: #e5e7eb;
        }

        .btn-inline.save {
          background: #10b981;
          color: white;
        }

        .btn-inline.save:hover {
          background: #059669;
        }

        .btn-inline.cancel {
          background: #6b7280;
          color: white;
        }

        .btn-inline.cancel:hover {
          background: #4b5563;
        }

        .edit-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          flex: 1;
          transition: border-color 0.2s;
        }

        .edit-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .title-input {
          width: 100%;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .modal-footer button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .modal-footer button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-complete {
          background: #10b981;
          color: white;
        }

        .btn-complete:hover {
          background: #059669;
        }

        .btn-reschedule {
          background: #3b82f6;
          color: white;
        }

        .btn-reschedule:hover {
          background: #2563eb;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .btn-refund {
          background: #f59e0b;
          color: white;
        }

        .btn-refund:hover {
          background: #d97706;
        }

        .btn-close {
          background: #6b7280;
          color: white;
        }

        .btn-close:hover {
          background: #4b5563;
        }

        .btn-save {
          background: #10b981;
          color: white;
        }

        .btn-save:hover {
          background: #059669;
        }

        .loading-details {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          background: #f9fafb;
          border-radius: 6px;
          margin-top: 0.5rem;
        }

        .completion-section {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .completion-section-title {
          margin: 0 0 0.75rem 0;
          color: #1f2937;
          font-size: 1rem;
          font-weight: 600;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .comment-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.75rem;
        }

        .comment-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }

        .comment-author {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .comment-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .comment-text {
          color: #1f2937;
          font-size: 0.875rem;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .files-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.75rem;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .file-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .file-name {
          color: #1f2937;
          font-weight: 500;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        .file-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .file-action-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
          text-align: center;
        }

        .view-btn {
          background: #667eea;
          color: white;
        }

        .view-btn:hover {
          background: #5a67d8;
        }

        .download-btn {
          background: #10b981;
          color: white;
        }

        .download-btn:hover {
          background: #059669;
        }

        .btn-add-supplement {
          width: 100%;
          padding: 0.75rem 1rem;
          margin-top: 1rem;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 6px;
          color: #374151 !important;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-supplement:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .add-supplement-section {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .section-title {
          margin: 0 0 0.75rem 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .info-message {
          margin: 0 0 1rem 0;
          padding: 0.75rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          color: #92400e;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .add-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .comment-textarea {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .comment-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .file-input {
          display: none;
        }

        .file-input-label {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .file-input-label:hover {
          background: #f3f4f6;
          border-color: #667eea;
        }

        .new-files-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .new-file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .remove-btn {
          padding: 0.25rem 0.5rem;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .remove-btn:hover {
          background: #fecaca;
        }

        .add-form-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-submit,
        .btn-cancel {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-submit {
          background: #10b981;
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          background: #059669;
        }

        .btn-cancel {
          background: #6b7280;
          color: white;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #4b5563;
        }

        .btn-submit:disabled,
        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .modal-content {
            margin: 0;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
          }

          .cost-edit-group,
          .cost-display-group {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .cost-edit-input {
            width: 100%;
          }

          .btn-inline {
            width: 100%;
          }

          .file-item {
            flex-direction: column;
            align-items: stretch;
          }

          .file-actions {
            flex-direction: column;
            width: 100%;
          }

          .file-action-btn {
            width: 100%;
          }

          .comment-meta {
            flex-direction: column;
            align-items: flex-start;
          }

          .add-form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

// TaskDetailModal component remains the same as in your original code
// (Including all the modal code here for completeness)

export default CareTaskManagement;
