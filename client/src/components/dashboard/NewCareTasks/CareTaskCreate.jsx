import React from "react";

function CareTaskCreate({ jwt, clients, onTaskCreated, onCancel }) {
  const [selectedClient, setSelectedClient] = React.useState("");
  const [taskData, setTaskData] = React.useState({
    title: "",
    dueDate: "",
    isRecurring: false,
    recurrencePattern: "daily",
    recurrenceInterval: 1,
    recurrenceEndType: "date", // "date" or "occurrences"
    recurrenceEndDate: "",
    recurrenceOccurrences: 1,
    assignedToUserId: "",
  });

  const [budgetCategoryId, setBudgetCategoryId] = React.useState("");
  const [budgetItemId, setBudgetItemId] = React.useState("");
  const [categories, setCategories] = React.useState([]);
  const [budgetItems, setBudgetItems] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [maxOccurrences, setMaxOccurrences] = React.useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = React.useState(null);

  // Get current year limits
  const currentYear = new Date().getFullYear();
  const yearEndDate = `${currentYear}-12-31`;

  // Calculate max occurrences based on recurrence pattern
  React.useEffect(() => {
    if (!taskData.isRecurring || !taskData.dueDate) {
      setMaxOccurrences(null);
      setEstimatedEndDate(null);
      return;
    }

    const startDate = new Date(taskData.dueDate);
    const endOfYear = new Date(currentYear, 11, 31); // December 31st

    let count = 0;
    let currentDate = new Date(startDate);
    let lastValidDate = new Date(startDate);

    // Calculate maximum occurrences that fit within the current year
    while (currentDate <= endOfYear) {
      count++;
      lastValidDate = new Date(currentDate);

      // Increment based on pattern
      if (taskData.recurrencePattern === "daily") {
        currentDate.setDate(
          currentDate.getDate() + taskData.recurrenceInterval
        );
      } else if (taskData.recurrencePattern === "weekly") {
        currentDate.setDate(
          currentDate.getDate() + 7 * taskData.recurrenceInterval
        );
      } else if (taskData.recurrencePattern === "monthly") {
        currentDate.setMonth(
          currentDate.getMonth() + taskData.recurrenceInterval
        );
      }
    }

    setMaxOccurrences(count);

    // Calculate estimated end date based on occurrences
    if (
      taskData.recurrenceEndType === "occurrences" &&
      taskData.recurrenceOccurrences > 0
    ) {
      let calcDate = new Date(startDate);
      for (
        let i = 1;
        i < Math.min(taskData.recurrenceOccurrences, count);
        i++
      ) {
        if (taskData.recurrencePattern === "daily") {
          calcDate.setDate(calcDate.getDate() + taskData.recurrenceInterval);
        } else if (taskData.recurrencePattern === "weekly") {
          calcDate.setDate(
            calcDate.getDate() + 7 * taskData.recurrenceInterval
          );
        } else if (taskData.recurrencePattern === "monthly") {
          calcDate.setMonth(calcDate.getMonth() + taskData.recurrenceInterval);
        }
      }
      setEstimatedEndDate(calcDate);
    } else {
      setEstimatedEndDate(null);
    }
  }, [
    taskData.isRecurring,
    taskData.dueDate,
    taskData.recurrencePattern,
    taskData.recurrenceInterval,
    taskData.recurrenceEndType,
    taskData.recurrenceOccurrences,
    currentYear,
  ]);

  // Load budget categories when client is selected
  React.useEffect(() => {
    if (!selectedClient) {
      setCategories([]);
      return;
    }

    const loadCategories = async () => {
      try {
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
  }, [selectedClient, jwt, currentYear]);

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

    if (!budgetCategoryId) {
      setError("Please select a budget category");
      return;
    }

    if (!budgetItemId) {
      setError("Please select an item type");
      return;
    }

    // Validate recurring task settings
    if (taskData.isRecurring) {
      if (taskData.recurrenceEndType === "occurrences") {
        if (
          !taskData.recurrenceOccurrences ||
          taskData.recurrenceOccurrences < 1
        ) {
          setError("Please specify the number of occurrences");
          return;
        }
        if (taskData.recurrenceOccurrences > maxOccurrences) {
          setError(
            `Maximum ${maxOccurrences} occurrences allowed within ${currentYear}`
          );
          return;
        }
      } else if (taskData.recurrenceEndType === "date") {
        if (!taskData.recurrenceEndDate) {
          setError("Please specify an end date for recurring tasks");
          return;
        }
        if (new Date(taskData.recurrenceEndDate) > new Date(yearEndDate)) {
          setError(`End date must be within ${currentYear}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Calculate actual end date for API
      let actualEndDate = null;
      if (taskData.isRecurring) {
        if (taskData.recurrenceEndType === "occurrences") {
          actualEndDate = estimatedEndDate
            ? estimatedEndDate.toISOString().split("T")[0]
            : null;
        } else {
          actualEndDate = taskData.recurrenceEndDate;
        }
      }

      const payload = {
        personId: selectedClient,
        title: taskData.title.trim(),
        dueDate: taskData.dueDate,
        scheduleType: "AllDay", // Always AllDay
        assignedToUserId: taskData.assignedToUserId || undefined,
        isRecurring: taskData.isRecurring,
        recurrencePattern: taskData.isRecurring
          ? taskData.recurrencePattern
          : undefined,
        recurrenceInterval: taskData.isRecurring
          ? taskData.recurrenceInterval
          : undefined,
        recurrenceEndDate: taskData.isRecurring ? actualEndDate : undefined,
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
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndType: "date",
        recurrenceEndDate: "",
        recurrenceOccurrences: 1,
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
        Create a one-time or recurring care task. Tasks are scoped within the
        current year ({currentYear}).
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
                  {category.emoji} {category.name}
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

        {/* Due Date / Start Date */}
        <div className="form-group">
          <label htmlFor="dueDate">
            {taskData.isRecurring ? "Start Date *" : "Due Date *"}
          </label>
          <input
            type="date"
            id="dueDate"
            value={taskData.dueDate}
            onChange={(e) =>
              setTaskData({ ...taskData, dueDate: e.target.value })
            }
            min={new Date().toISOString().split("T")[0]}
            max={yearEndDate}
            required
          />
          {taskData.isRecurring && (
            <small>First occurrence of the recurring task</small>
          )}
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
            <h4>Recurrence Pattern</h4>

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
                <div className="interval-input">
                  <input
                    type="number"
                    id="recurrenceInterval"
                    min="1"
                    max="30"
                    value={taskData.recurrenceInterval}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceInterval: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                  <span className="interval-label">
                    {taskData.recurrencePattern === "daily" && "day(s)"}
                    {taskData.recurrencePattern === "weekly" && "week(s)"}
                    {taskData.recurrencePattern === "monthly" && "month(s)"}
                  </span>
                </div>
              </div>
            </div>

            {/* End Condition */}
            <div className="end-condition-section">
              <h4>End Condition</h4>

              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="endType"
                    value="date"
                    checked={taskData.recurrenceEndType === "date"}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceEndType: e.target.value,
                      })
                    }
                  />
                  <span>End by date</span>
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="endType"
                    value="occurrences"
                    checked={taskData.recurrenceEndType === "occurrences"}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceEndType: e.target.value,
                      })
                    }
                  />
                  <span>End after occurrences</span>
                </label>
              </div>

              {taskData.recurrenceEndType === "date" && (
                <div className="form-group">
                  <label htmlFor="recurrenceEndDate">End Date *</label>
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
                    min={taskData.dueDate}
                    max={yearEndDate}
                    required
                  />
                  <small>Tasks can only be created within {currentYear}</small>
                </div>
              )}

              {taskData.recurrenceEndType === "occurrences" && (
                <div className="form-group">
                  <label htmlFor="recurrenceOccurrences">
                    Number of Occurrences *
                  </label>
                  <input
                    type="number"
                    id="recurrenceOccurrences"
                    value={taskData.recurrenceOccurrences}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceOccurrences: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                    max={maxOccurrences || 365}
                    required
                  />
                  {maxOccurrences && (
                    <small>
                      Maximum {maxOccurrences} occurrences possible within{" "}
                      {currentYear}
                      {estimatedEndDate &&
                        taskData.recurrenceOccurrences <= maxOccurrences && (
                          <span>
                            {" "}
                            (Last task will be on{" "}
                            {estimatedEndDate.toLocaleDateString()})
                          </span>
                        )}
                    </small>
                  )}
                </div>
              )}
            </div>

            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <div className="info-text">
                <strong>Year-based Task Management:</strong> Tasks are managed
                within yearly budget cycles. To extend recurring tasks into next
                year, use the "Copy to Next Year" function in the Budget
                Overview page.
              </div>
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
          line-height: 1.5;
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
          padding: 1.25rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .recurrence-settings h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1rem;
          font-weight: 600;
        }

        .interval-input {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .interval-input input {
          width: 80px;
        }

        .interval-label {
          color: #6b7280;
          font-size: 0.95rem;
        }

        .end-condition-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .radio-group {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: normal;
        }

        .radio-label input[type="radio"] {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
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

        .info-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: #eff6ff;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          margin-top: 0.5rem;
        }

        .info-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .info-text {
          color: #1e40af;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .info-text strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        small {
          color: #6b7280;
          font-size: 0.75rem;
          line-height: 1.4;
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

          .radio-group {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CareTaskCreate;
