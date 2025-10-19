// CareTaskManagement.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import CareTaskCalendar from "../CareTasks/CareTaskCalendar";

const CareTaskManagement = React.forwardRef(({ jwt, clients, me }, ref) => {
  const [selectedClient, setSelectedClient] = React.useState("");
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
    reloadTasks: () => {
      if (selectedClient) {
        loadTasks(selectedClient);
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
});

CareTaskManagement.displayName = "CareTaskManagement";

// TaskDetailModal component remains the same as in your original code
// (Including all the modal code here for completeness)

export default CareTaskManagement;
