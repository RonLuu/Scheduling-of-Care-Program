import React from "react";
import { useNavigate } from "react-router-dom";
import CareTaskCalendar from "../CareTasks/CareTaskCalendar";

function CareTaskManagement({ jwt, clients }) {
  const [selectedClient, setSelectedClient] = React.useState("");
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [showTaskModal, setShowTaskModal] = React.useState(false);

  // Load tasks for selected client
  const loadTasks = async (clientId) => {
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
  };

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

    if (!confirm(`Are you sure you want to delete "${selectedTask.title}"?`)) {
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
  }, [clients]);

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

// Task Detail Modal
function TaskDetailModal({ task, jwt, onClose, onDelete, onSave }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [budgetCategoryName, setBudgetCategoryName] = React.useState("");
  const [budgetItemName, setBudgetItemName] = React.useState("");
  const [editedTask, setEditedTask] = React.useState({
    title: task.title,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    scheduleType: task.scheduleType,
    startAt: task.startAt ? new Date(task.startAt).toTimeString().slice(0, 5) : '',
    endAt: task.endAt ? new Date(task.endAt).toTimeString().slice(0, 5) : '',
  });

  // Load budget category and item names
  React.useEffect(() => {
    const loadBudgetNames = async () => {
      if (!task.budgetCategoryId && !task.budgetItemId) return;

      try {
        // Get current year
        const currentYear = new Date().getFullYear();

        const response = await fetch(`/api/budget-plans?personId=${task.personId}&year=${currentYear}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (response.ok) {
          const data = await response.json();
          const categories = data.budgetPlan?.categories || [];

          // Find category name
          if (task.budgetCategoryId) {
            const category = categories.find(c => c.id === task.budgetCategoryId);
            if (category) {
              setBudgetCategoryName(category.name);

              // Find budget item name within that category
              if (task.budgetItemId) {
                const item = category.items?.find(i => String(i._id) === String(task.budgetItemId));
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

  // Load comments and files for completed tasks
  React.useEffect(() => {
    const loadCompletionDetails = async () => {
      if (task.status !== "Completed") return;

      setLoadingDetails(true);
      try {
        // Load comments
        const commentsResponse = await fetch(`/api/comments?careTaskId=${task._id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }

        // Load files - both direct uploads and referenced files
        const filesResponse = await fetch(`/api/file-upload?scope=CareTask&targetId=${task._id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        let allFiles = [];
        if (filesResponse.ok) {
          const directFiles = await filesResponse.json();
          allFiles = [...directFiles];
        }

        // Also load files from fileRefs (shared receipts)
        if (task.fileRefs && task.fileRefs.length > 0) {
          const refsPromises = task.fileRefs.map(fileId =>
            fetch(`/api/file-upload/${fileId}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }).then(res => res.ok ? res.json() : null)
          );
          const refsFiles = await Promise.all(refsPromises);
          allFiles = [...allFiles, ...refsFiles.filter(f => f !== null)];
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

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
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

    if (editedTask.scheduleType === "Timed" && (!editedTask.startAt || !editedTask.endAt)) {
      alert("Start and end times are required for timed tasks");
      return;
    }

    setIsSaving(true);

    try {
      // Helper function to combine date and time
      const combineDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return undefined;
        const date = new Date(dateStr);
        const [hours, minutes] = timeStr.split(':');
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
        payload.startAt = combineDateTime(editedTask.dueDate, editedTask.startAt);
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
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      scheduleType: task.scheduleType,
      startAt: task.startAt ? new Date(task.startAt).toTimeString().slice(0, 5) : '',
      endAt: task.endAt ? new Date(task.endAt).toTimeString().slice(0, 5) : '',
    });
    setIsEditing(false);
  };

  const isOverdue = task.status === "Scheduled" && new Date(task.dueDate) < new Date();

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
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                placeholder="Task title"
              />
            ) : (
              <>
                <h3 className="task-title">{task.title}</h3>
                <span className={`status-badge ${task.status.toLowerCase()} ${isOverdue ? "overdue" : ""}`}>
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
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              />
            ) : (
              <span className="detail-value">{formatDate(task.dueDate)}</span>
            )}
          </div>

          <div className="detail-row">
            <span className="detail-label">Schedule Type:</span>
            {isEditing ? (
              <select
                className="edit-input"
                value={editedTask.scheduleType}
                onChange={(e) => setEditedTask({ ...editedTask, scheduleType: e.target.value })}
              >
                <option value="AllDay">All Day</option>
                <option value="Timed">Specific Time</option>
              </select>
            ) : (
              <span className="detail-value">{task.scheduleType}</span>
            )}
          </div>

          {(isEditing ? editedTask.scheduleType === "Timed" : task.scheduleType === "Timed") && (
            <>
              <div className="detail-row">
                <span className="detail-label">Start Time:</span>
                {isEditing ? (
                  <input
                    type="time"
                    className="edit-input"
                    value={editedTask.startAt}
                    onChange={(e) => setEditedTask({ ...editedTask, startAt: e.target.value })}
                  />
                ) : task.startAt ? (
                  <span className="detail-value">{formatTime(task.startAt)}</span>
                ) : (
                  <span className="detail-value">—</span>
                )}
              </div>
              <div className="detail-row">
                <span className="detail-label">End Time:</span>
                {isEditing ? (
                  <input
                    type="time"
                    className="edit-input"
                    value={editedTask.endAt}
                    onChange={(e) => setEditedTask({ ...editedTask, endAt: e.target.value })}
                  />
                ) : task.endAt ? (
                  <span className="detail-value">{formatTime(task.endAt)}</span>
                ) : (
                  <span className="detail-value">—</span>
                )}
              </div>
            </>
          )}

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

          {task.expectedCost !== undefined && task.expectedCost !== null && task.status !== "Completed" && (
            <div className="detail-row">
              <span className="detail-label">Expected Cost:</span>
              <span className="detail-value cost">${task.expectedCost.toFixed(2)}</span>
            </div>
          )}

          {task.cost !== undefined && task.cost !== null && task.status === "Completed" && (
            <div className="detail-row">
              <span className="detail-label">Cost:</span>
              <span className="detail-value cost">${task.cost.toFixed(2)}</span>
            </div>
          )}

          {/* Completion Details for Completed Tasks */}
          {task.status === "Completed" && (
            <>
              {loadingDetails && (
                <div className="loading-details">Loading completion details...</div>
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
                            {comment.author?.name || comment.author?.email || comment.authorUserId?.name || comment.authorUserId?.email || "User"}
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
            </>
          )}
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button className="btn-save" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button className="btn-close" onClick={handleCancelEdit} disabled={isSaving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {task.status !== "Completed" && (
                <button className="btn-complete" onClick={() => navigate(`/tasks/${task._id}/complete`)}>
                  Complete Task
                </button>
              )}
              {task.status !== "Completed" && (
                <button className="btn-reschedule" onClick={() => setIsEditing(true)}>
                  Reschedule
                </button>
              )}
              {task.status !== "Completed" && (
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
          max-width: 600px;
          width: 100%;
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

        @media (max-width: 640px) {
          .modal-content {
            margin: 0;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
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
        }
      `}</style>
    </div>
  );
}

export default CareTaskManagement;
