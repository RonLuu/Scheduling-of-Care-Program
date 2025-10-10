import React from "react";

function CareTaskCreate({ jwt, clients, onTaskCreated, onCancel }) {
  const [selectedClient, setSelectedClient] = React.useState("");
  const [taskData, setTaskData] = React.useState({
    title: "",
    dueDate: "",
    scheduleType: "AllDay",
    startAt: "",
    endAt: "",
    isRecurring: false,
    recurrencePattern: "daily",
    recurrenceInterval: 1,
    recurrenceEndDate: "",
    assignedToUserId: "",
  });
  const [budgetCategoryId, setBudgetCategoryId] = React.useState("");
  const [budgetItemId, setBudgetItemId] = React.useState("");
  const [categories, setCategories] = React.useState([]);
  const [budgetItems, setBudgetItems] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  // Load budget categories when client is selected
  React.useEffect(() => {
    if (!selectedClient) {
      setCategories([]);
      return;
    }

    const loadCategories = async () => {
      try {
        // Get current year
        const currentYear = new Date().getFullYear();

        const response = await fetch(
          `/api/budget-plans?personId=${selectedClient}&year=${currentYear}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setCategories(data.budgetPlan?.categories || []);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    loadCategories();
  }, [selectedClient, jwt]);

  // Filter budget items based on selected category
  React.useEffect(() => {
    if (!budgetCategoryId) {
      setBudgetItems([]);
      setBudgetItemId("");
      return;
    }

    const category = categories.find((c) => c.id === budgetCategoryId);
    if (category) {
      setBudgetItems(category.items || []);
    }
  }, [budgetCategoryId, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedClient) {
      setError("Please select a client");
      return;
    }

    if (!taskData.title.trim()) {
      setError("Please enter a task title");
      return;
    }

    if (!taskData.dueDate) {
      setError("Please select a due date");
      return;
    }

    if (
      taskData.scheduleType === "Timed" &&
      (!taskData.startAt || !taskData.endAt)
    ) {
      setError("Please set start and end times for timed tasks");
      return;
    }

    if (!budgetCategoryId) {
      setError("Please select a budget category");
      return;
    }

    if (!budgetItemId) {
      setError("Please select an item type");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        personId: selectedClient,
        title: taskData.title.trim(),
        dueDate: taskData.dueDate,
        scheduleType: taskData.scheduleType,
        startAt:
          taskData.scheduleType === "Timed" ? taskData.startAt : undefined,
        endAt: taskData.scheduleType === "Timed" ? taskData.endAt : undefined,
        assignedToUserId: taskData.assignedToUserId || undefined,
        isRecurring: taskData.isRecurring,
        recurrencePattern: taskData.isRecurring
          ? taskData.recurrencePattern
          : undefined,
        recurrenceInterval: taskData.isRecurring
          ? taskData.recurrenceInterval
          : undefined,
        recurrenceEndDate:
          taskData.isRecurring && taskData.recurrenceEndDate
            ? taskData.recurrenceEndDate
            : undefined,
        budgetCategoryId: budgetCategoryId,
        budgetItemId: budgetItemId,
      };

      const response = await fetch("/api/care-tasks/standalone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      const result = await response.json();
      setSuccess(
        taskData.isRecurring
          ? `Successfully created recurring task! ${
              result.tasksCreated || 1
            } task(s) created.`
          : "Task created successfully!"
      );

      // Reset form
      setTaskData({
        title: "",
        dueDate: "",
        scheduleType: "AllDay",
        startAt: "",
        endAt: "",
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
        assignedToUserId: "",
      });
      setBudgetCategoryId("");
      setBudgetItemId("");

      // Notify parent to reload tasks
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-create-form">
      <div className="form-header">
        <h3>Create New Task</h3>
      </div>
      <p className="form-description">
        Create a one-time or recurring care task. Costs can be added after the
        task is completed.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Client Selection */}
        <div className="form-group">
          <label htmlFor="client">Client *</label>
          <select
            id="client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            required
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget Category Selection */}
        <div className="budget-settings">
          <div className="form-group">
            <label htmlFor="budgetCategory">Select a category *</label>
            <select
              id="budgetCategory"
              value={budgetCategoryId}
              onChange={(e) => setBudgetCategoryId(e.target.value)}
              required
            >
              <option value="">Select a category...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {budgetCategoryId && (
            <div className="form-group">
              <label htmlFor="budgetItem">Select item type *</label>
              <select
                id="budgetItem"
                value={budgetItemId}
                onChange={(e) => setBudgetItemId(e.target.value)}
                required
              >
                <option value="">Select an item type...</option>
                {budgetItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="tip-box">
            <span className="tip-icon">💡</span>
            <span className="tip-text">
              Can't find a suitable category/item?{" "}
              <a href="/budget-and-reports" className="tip-link">
                Add a new one to your budget plan
              </a>
            </span>
          </div>
        </div>

        {/* Task Title */}
        <div className="form-group">
          <label htmlFor="title">Task Title *</label>
          <input
            type="text"
            id="title"
            value={taskData.title}
            onChange={(e) =>
              setTaskData({ ...taskData, title: e.target.value })
            }
            placeholder="e.g., Doctor appointment, Buy medication, Exercise"
            required
          />
        </div>

        {/* Due Date */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              type="date"
              id="dueDate"
              value={taskData.dueDate}
              onChange={(e) =>
                setTaskData({ ...taskData, dueDate: e.target.value })
              }
              required
            />
          </div>
        </div>

        {/* Recurring Task Option */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={taskData.isRecurring}
              onChange={(e) =>
                setTaskData({ ...taskData, isRecurring: e.target.checked })
              }
            />
            <span>Make this a recurring task</span>
          </label>
        </div>

        {/* Recurrence Settings */}
        {taskData.isRecurring && (
          <div className="recurrence-settings">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="recurrencePattern">Repeat</label>
                <select
                  id="recurrencePattern"
                  value={taskData.recurrencePattern}
                  onChange={(e) =>
                    setTaskData({
                      ...taskData,
                      recurrencePattern: e.target.value,
                    })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="recurrenceInterval">Every</label>
                <input
                  type="number"
                  id="recurrenceInterval"
                  min="1"
                  value={taskData.recurrenceInterval}
                  onChange={(e) =>
                    setTaskData({
                      ...taskData,
                      recurrenceInterval: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="recurrenceEndDate">End Date (Optional)</label>
              <input
                type="date"
                id="recurrenceEndDate"
                value={taskData.recurrenceEndDate}
                onChange={(e) =>
                  setTaskData({
                    ...taskData,
                    recurrenceEndDate: e.target.value,
                  })
                }
              />
              <small>Leave blank for indefinite recurrence</small>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Submit Button */}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Task"}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .task-create-form {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .form-header {
          margin-bottom: 0.5rem;
        }

        .form-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .form-description {
          margin: 0 0 1.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        input[type="text"],
        input[type="date"],
        input[type="time"],
        input[type="number"],
        select {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: normal;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
        }

        .recurrence-settings {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .budget-settings {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tip-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .tip-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .tip-text {
          color: #92400e;
          line-height: 1.5;
        }

        .tip-link {
          color: #b45309;
          font-weight: 600;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .tip-link:hover {
          color: #92400e;
        }

        small {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .error-message {
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .success-message {
          padding: 0.75rem;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 6px;
          color: #16a34a;
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background-color 0.2s;
          width: 100%;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5a67d8;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CareTaskCreate;
