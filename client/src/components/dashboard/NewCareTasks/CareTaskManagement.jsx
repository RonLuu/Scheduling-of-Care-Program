import React from "react";
import CareTaskCalendar from "../CareTasks/CareTaskCalendar";

function CareTaskManagement({ jwt, clients }) {
  const [selectedClient, setSelectedClient] = React.useState("");
  const [viewMode, setViewMode] = React.useState("calendar");
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

  // Toggle task completion
  const toggleTaskComplete = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "Completed" ? "Scheduled" : "Completed";

    try {
      const response = await fetch(`/api/care-tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      // Reload tasks
      loadTasks(selectedClient);
    } catch (err) {
      alert("Error updating task: " + err.message);
    }
  };

  // Add cost to task
  const addCostToTask = async (taskId, cost) => {
    try {
      const response = await fetch(`/api/care-tasks/${taskId}/cost`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ cost: parseFloat(cost) }),
      });

      if (!response.ok) {
        throw new Error("Failed to save cost");
      }

      // Reload tasks
      loadTasks(selectedClient);
      return true;
    } catch (err) {
      alert("Error saving cost: " + err.message);
      return false;
    }
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
          <div className="view-toggle">
            <button
              className={viewMode === "calendar" ? "active" : ""}
              onClick={() => setViewMode("calendar")}
            >
              📅 Calendar
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              📋 List
            </button>
          </div>
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
          {viewMode === "calendar" ? (
            <CareTaskCalendar tasks={tasks} onTaskClick={handleTaskClick} />
          ) : (
            <CareTaskListView
              tasks={tasks}
              toggleTaskComplete={toggleTaskComplete}
              addCostToTask={addCostToTask}
            />
          )}
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

        .view-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .view-toggle button {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-toggle button:hover {
          background: #f3f4f6;
        }

        .view-toggle button.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
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

// Simple List View Component
function CareTaskListView({ tasks, toggleTaskComplete, addCostToTask }) {
  const [costEditing, setCostEditing] = React.useState({});
  const [costValues, setCostValues] = React.useState({});

  const handleCostSave = async (taskId) => {
    const cost = costValues[taskId];
    if (!cost || isNaN(cost)) {
      alert("Please enter a valid cost");
      return;
    }

    const success = await addCostToTask(taskId, cost);
    if (success) {
      setCostEditing({ ...costEditing, [taskId]: false });
      setCostValues({ ...costValues, [taskId]: "" });
    }
  };

  // Group tasks by status
  const groupedTasks = {
    scheduled: tasks.filter((t) => t.status === "Scheduled"),
    completed: tasks.filter((t) => t.status === "Completed"),
    other: tasks.filter((t) => !["Scheduled", "Completed"].includes(t.status)),
  };

  return (
    <div className="list-view">
      {/* Scheduled Tasks */}
      {groupedTasks.scheduled.length > 0 && (
        <div className="task-group">
          <h4>📋 Scheduled Tasks ({groupedTasks.scheduled.length})</h4>
          <div className="task-list">
            {groupedTasks.scheduled.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                toggleTaskComplete={toggleTaskComplete}
                costEditing={costEditing}
                setCostEditing={setCostEditing}
                costValues={costValues}
                setCostValues={setCostValues}
                handleCostSave={handleCostSave}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {groupedTasks.completed.length > 0 && (
        <div className="task-group">
          <h4>✅ Completed Tasks ({groupedTasks.completed.length})</h4>
          <div className="task-list">
            {groupedTasks.completed.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                toggleTaskComplete={toggleTaskComplete}
                costEditing={costEditing}
                setCostEditing={setCostEditing}
                costValues={costValues}
                setCostValues={setCostValues}
                handleCostSave={handleCostSave}
              />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .list-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .task-group h4 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}

// Individual Task Card
function TaskCard({ task, toggleTaskComplete, costEditing, setCostEditing, costValues, setCostValues, handleCostSave }) {
  const isCompleted = task.status === "Completed";
  const hasCost = task.cost !== undefined && task.cost !== null;

  return (
    <div className={`task-card ${isCompleted ? "completed" : ""}`}>
      <div className="task-main">
        <button
          className="complete-btn"
          onClick={() => toggleTaskComplete(task._id, task.status)}
          title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted ? "✓" : "○"}
        </button>
        <div className="task-info">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span className="task-date">
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </span>
            {task.scheduleType === "Timed" && task.startAt && (
              <span className="task-time">
                🕒 {new Date(task.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className={`task-status ${task.status.toLowerCase()}`}>
              {task.status}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Section - Only show for completed tasks */}
      {isCompleted && (
        <div className="task-cost">
          {!hasCost && !costEditing[task._id] ? (
            <button
              className="add-cost-btn"
              onClick={() => setCostEditing({ ...costEditing, [task._id]: true })}
            >
              + Add Cost
            </button>
          ) : hasCost && !costEditing[task._id] ? (
            <div className="cost-display">
              <span className="cost-label">Cost:</span>
              <span className="cost-value">${task.cost.toFixed(2)}</span>
              <button
                className="edit-cost-btn"
                onClick={() => {
                  setCostValues({ ...costValues, [task._id]: task.cost });
                  setCostEditing({ ...costEditing, [task._id]: true });
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="cost-editor">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costValues[task._id] || ""}
                onChange={(e) => setCostValues({ ...costValues, [task._id]: e.target.value })}
              />
              <button className="save-btn" onClick={() => handleCostSave(task._id)}>
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setCostEditing({ ...costEditing, [task._id]: false });
                  setCostValues({ ...costValues, [task._id]: "" });
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .task-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s;
        }

        .task-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .task-card.completed {
          opacity: 0.85;
          background: #f9fafb;
        }

        .task-main {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .complete-btn {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: 2px solid #d1d5db;
          background: white;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .complete-btn:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .task-card.completed .complete-btn {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .task-info {
          flex: 1;
        }

        .task-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .task-card.completed .task-title {
          text-decoration: line-through;
          color: #6b7280;
        }

        .task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .task-status {
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .task-status.scheduled {
          background: #e0f2fe;
          color: #0369a1;
        }

        .task-status.completed {
          background: #dcfce7;
          color: #16a34a;
        }

        .task-cost {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .add-cost-btn {
          padding: 0.375rem 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }

        .add-cost-btn:hover {
          background: #5a67d8;
        }

        .cost-display {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .cost-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .cost-value {
          font-size: 1rem;
          font-weight: 600;
          color: #10b981;
        }

        .edit-cost-btn {
          padding: 0.25rem 0.5rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .cost-editor {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .cost-editor input {
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          width: 120px;
          font-size: 0.875rem;
        }

        .save-btn,
        .cancel-btn {
          padding: 0.375rem 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .save-btn:hover {
          background: #059669;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
}

// Task Detail Modal
function TaskDetailModal({ task, jwt, onClose, onDelete, onSave }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedTask, setEditedTask] = React.useState({
    title: task.title,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    scheduleType: task.scheduleType,
    startAt: task.startAt ? new Date(task.startAt).toTimeString().slice(0, 5) : '',
    endAt: task.endAt ? new Date(task.endAt).toTimeString().slice(0, 5) : '',
  });

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

          {task.cost !== undefined && task.cost !== null && (
            <div className="detail-row">
              <span className="detail-label">Cost:</span>
              <span className="detail-value cost">${task.cost.toFixed(2)}</span>
            </div>
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
              <button className="btn-complete" onClick={onClose}>
                Complete Task
              </button>
              <button className="btn-reschedule" onClick={() => setIsEditing(true)}>
                Reschedule
              </button>
              <button className="btn-delete" onClick={onDelete}>
                Delete Task
              </button>
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

        @media (max-width: 640px) {
          .modal-content {
            margin: 0;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CareTaskManagement;
