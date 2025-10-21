import React from "react";

function CareTaskCreate({
  jwt,
  clients,
  selectedClient,
  setSelectedClient,
  onTaskCreated,
  onCancel,
  onNavigateToBudget,
}) {
  const todayStr = React.useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );
  const [taskData, setTaskData] = React.useState({
    title: "",
    dueDate: todayStr,
    isRecurring: false,
    recurrencePattern: "daily",
    recurrenceInterval: 1,
    recurrenceEndType: "date",
    recurrenceEndDate: "",
    recurrenceOccurrences: 1,
    assignedToUserId: "",
    expectedCost: "",
  });

  const [budgetCategoryId, setBudgetCategoryId] = React.useState("");
  const [budgetItemId, setBudgetItemId] = React.useState("");
  const [categories, setCategories] = React.useState([]);
  const [budgetItems, setBudgetItems] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [estimatedEndDate, setEstimatedEndDate] = React.useState(null);
  const [affectedYears, setAffectedYears] = React.useState([]);
  const [actualSpending, setActualSpending] = React.useState({});
  const [returnedAmounts, setReturnedAmounts] = React.useState({});
  const [expectedCosts, setExpectedCosts] = React.useState({});
  const [isLoadingSpending, setIsLoadingSpending] = React.useState(false);

  const sourceYear = React.useMemo(() => {
    const base = taskData.dueDate ? new Date(taskData.dueDate) : new Date();
    return base.getFullYear();
  }, [taskData.dueDate]);

  // Calculate affected years for recurring tasks
  React.useEffect(() => {
    if (!taskData.isRecurring || !taskData.dueDate) {
      setAffectedYears([]);
      return;
    }

    const start = new Date(taskData.dueDate);
    const startYear = start.getFullYear();
    const years = new Set([startYear]);

    if (taskData.recurrenceEndType === "date" && taskData.recurrenceEndDate) {
      const endYear = new Date(taskData.recurrenceEndDate).getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        years.add(y);
      }
    } else if (
      taskData.recurrenceEndType === "occurrences" &&
      estimatedEndDate
    ) {
      const endYear = estimatedEndDate.getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        years.add(y);
      }
    }

    setAffectedYears(Array.from(years).sort());
  }, [
    taskData.isRecurring,
    taskData.dueDate,
    taskData.recurrenceEndType,
    taskData.recurrenceEndDate,
    estimatedEndDate,
  ]);

  // Calculate estimated end date
  React.useEffect(() => {
    if (!taskData.isRecurring || !taskData.dueDate) {
      setEstimatedEndDate(null);
      return;
    }
    if (
      taskData.recurrenceEndType !== "occurrences" ||
      taskData.recurrenceOccurrences < 1
    ) {
      setEstimatedEndDate(null);
      return;
    }

    const start = new Date(taskData.dueDate);
    let calc = new Date(start);
    const step = Math.max(1, Number(taskData.recurrenceInterval) || 1);
    const occurrences = Math.min(
      10000,
      Number(taskData.recurrenceOccurrences) || 1
    );

    for (let i = 1; i < occurrences; i++) {
      if (taskData.recurrencePattern === "daily") {
        calc.setDate(calc.getDate() + step);
      } else if (taskData.recurrencePattern === "weekly") {
        calc.setDate(calc.getDate() + 7 * step);
      } else if (taskData.recurrencePattern === "monthly") {
        calc.setMonth(calc.getMonth() + step);
      }
    }
    setEstimatedEndDate(calc);
  }, [
    taskData.isRecurring,
    taskData.dueDate,
    taskData.recurrencePattern,
    taskData.recurrenceInterval,
    taskData.recurrenceEndType,
    taskData.recurrenceOccurrences,
  ]);

  // Load budget categories
  React.useEffect(() => {
    if (!selectedClient) {
      setCategories([]);
      setBudgetItems([]);
      setBudgetItemId("");
      return;
    }

    const loadCategories = async () => {
      try {
        const response = await fetch(
          `/api/budget-plans?personId=${encodeURIComponent(
            selectedClient
          )}&year=${encodeURIComponent(sourceYear)}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );
        if (response.ok) {
          const data = await response.json();
          const cats = data.budgetPlan?.categories || [];
          setCategories(cats);

          if (cats.length === 0) {
            setError(
              `No budget plan found for ${sourceYear}. Please create a budget plan first.`
            );
          } else {
            setError("");
          }

          if (
            budgetCategoryId &&
            !cats.find((c) => c.id === budgetCategoryId)
          ) {
            setBudgetCategoryId("");
            setBudgetItems([]);
            setBudgetItemId("");
          } else if (budgetCategoryId) {
            const cat = cats.find((c) => c.id === budgetCategoryId);
            setBudgetItems(cat?.items || []);
            if (
              budgetItemId &&
              !(cat?.items || []).find(
                (i) => String(i._id) === String(budgetItemId)
              )
            ) {
              setBudgetItemId("");
            }
          }
        } else {
          setError(`Could not load budget plan for ${sourceYear}`);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Error loading budget categories");
      }
    };

    loadCategories();
  }, [selectedClient, sourceYear, jwt]);

  // Filter budget items
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

  // Load spending data when client and year are selected
  React.useEffect(() => {
    const loadSpendingData = async () => {
      if (!selectedClient || !sourceYear) {
        setActualSpending({});
        setReturnedAmounts({});
        setExpectedCosts({});
        return;
      }

      setIsLoadingSpending(true);
      try {
        const response = await fetch(
          `/api/budget-plans/${selectedClient}/spending?year=${sourceYear}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setActualSpending(data.spending || {});
          setReturnedAmounts(data.returned || {});
          setExpectedCosts(data.expected || {});
        }
      } catch (err) {
        console.error("Error loading spending data:", err);
      } finally {
        setIsLoadingSpending(false);
      }
    };

    loadSpendingData();
  }, [selectedClient, sourceYear, jwt]);

  // Helper functions to calculate spending
  const getItemSpent = (categoryId, itemId) => {
    const cat = actualSpending?.[String(categoryId)];
    const items = cat?.items || {};
    return items[String(itemId)] || 0;
  };

  const getItemReturned = (categoryId, itemId) => {
    const cat = returnedAmounts?.[String(categoryId)];
    const items = cat?.items || {};
    return items[String(itemId)] || 0;
  };

  const getItemExpected = (categoryId, itemId) => {
    const cat = expectedCosts?.[String(categoryId)];
    const items = cat?.items || {};
    return items[String(itemId)] || 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const handleSubmit = async () => {
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
      setError("Please select a date");
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

    // Validate recurring settings
    if (taskData.isRecurring) {
      if (taskData.recurrenceEndType === "occurrences") {
        if (
          !taskData.recurrenceOccurrences ||
          taskData.recurrenceOccurrences < 1
        ) {
          setError("Please specify the number of occurrences (at least 1)");
          return;
        }
      } else if (taskData.recurrenceEndType === "date") {
        if (!taskData.recurrenceEndDate) {
          setError("Please specify an end date for recurring tasks");
          return;
        }
        if (new Date(taskData.recurrenceEndDate) < new Date(taskData.dueDate)) {
          setError("End date must be on or after the start date");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
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
        scheduleType: "AllDay",
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
        expectedCost: taskData.expectedCost
          ? parseFloat(taskData.expectedCost)
          : undefined,
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
        result.message ||
          (taskData.isRecurring
            ? `Successfully created ${
                result.tasksCreated || 1
              } recurring task(s)`
            : "Task created successfully!")
      );

      // Reset
      setTaskData({
        title: "",
        dueDate: todayStr,
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEndType: "date",
        recurrenceEndDate: "",
        recurrenceOccurrences: 1,
        assignedToUserId: "",
        expectedCost: "",
      });
      setBudgetCategoryId("");
      setBudgetItemId("");

      if (onTaskCreated) {
        // Call immediately to trigger refresh
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
        Select a client, then create a one-time or recurring task.
      </p>

      <div className="form-content">
        {/* Client */}
        <div className="form-group">
          <label>Client <span className="required-mark" title="This field is required">*</span></label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget */}
        {selectedClient && (
          <div className="budget-settings">
            <div className="form-group">
              <label>Budget Category <span className="required-mark" title="This field is required">*</span></label>
              <select
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
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
                <label>Item Type <span className="required-mark" title="This field is required">*</span></label>
                <select
                  value={budgetItemId}
                  onChange={(e) => setBudgetItemId(e.target.value)}
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

            {budgetItemId &&
              (() => {
                const selectedItem = budgetItems.find(
                  (item) => item._id === budgetItemId
                );
                if (!selectedItem) return null;

                const itemGrossSpent = getItemSpent(
                  budgetCategoryId,
                  budgetItemId
                );
                const itemReturned = getItemReturned(
                  budgetCategoryId,
                  budgetItemId
                );
                const itemNetSpent = itemGrossSpent - itemReturned;
                const itemReserved = getItemExpected(
                  budgetCategoryId,
                  budgetItemId
                );
                const availableBudget =
                  selectedItem.budget - itemNetSpent - itemReserved;

                return (
                  <>
                    <div className="budget-info-box">
                      <div className="budget-info-row">
                        <span className="budget-info-label">
                          Available Budget for {selectedItem.name}:
                        </span>
                        <span
                          className={`budget-info-value available ${
                            availableBudget < 0 ? "negative" : ""
                          }`}
                        >
                          {isLoadingSpending
                            ? "Loading..."
                            : formatCurrency(availableBudget)}
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Expected Cost</label>
                      <small>
                        Enter the expected cost for this task. Leave it blank if
                        there’s no cost. You can always come back and add a cost
                        later.{" "}
                      </small>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={taskData.expectedCost}
                        onChange={(e) =>
                          setTaskData({
                            ...taskData,
                            expectedCost: e.target.value,
                          })
                        }
                        placeholder="e.g., 50.00"
                      />
                    </div>
                  </>
                );
              })()}

            <div className="tip-box">
              <span className="tip-icon">💡</span>
              <div className="tip-content">
                <strong>Can't find the right category or item?</strong>
                <p>
                  Go to the{" "}
                  {onNavigateToBudget ? (
                    <a
                      href="#"
                      className="tip-link"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateToBudget();
                      }}
                    >
                      Budget & Reports page
                    </a>
                  ) : (
                    <span className="tip-link-text">Budget & Reports page</span>
                  )}{" "}
                  to add new categories or items to your budget plan before
                  creating tasks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="form-group">
          <label>Task Title<span className="required-mark" title="This field is required">*</span></label>
          <input
            type="text"
            value={taskData.title}
            onChange={(e) =>
              setTaskData({ ...taskData, title: e.target.value })
            }
            placeholder="e.g., Doctor appointment, Buy medication"
          />
        </div>

        {/* Date */}
        <div className="form-group">
          <label>{taskData.isRecurring ? "Start Date *" : "Task's Due Date *"}</label>
          <input
            type="date"
            value={taskData.dueDate}
            onChange={(e) =>
              setTaskData({ ...taskData, dueDate: e.target.value })
            }
          />
          {taskData.isRecurring && (
            <small>First occurrence of the recurring task</small>
          )}
        </div>

        {/* Recurring */}
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

        {taskData.isRecurring && (
          <div className="recurrence-settings">
            <h4>Recurrence Pattern</h4>

            <div className="form-row">
              <div className="form-group">
                <label>Repeat</label>
                <select
                  value={taskData.recurrencePattern}
                  onChange={(e) =>
                    setTaskData({
                      ...taskData,
                      recurrencePattern: e.target.value,
                    })
                  }
                >
                  <option value="daily">by Day</option>
                  <option value="weekly">by Week</option>
                  <option value="monthly">by Month</option>
                </select>
              </div>

              <div className="form-group">
                <label>Every</label>
                <div className="interval-input">
                  <input
                    type="number"
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
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={taskData.recurrenceEndDate}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceEndDate: e.target.value,
                      })
                    }
                    min={taskData.dueDate || todayStr}
                  />
                </div>
              )}

              {taskData.recurrenceEndType === "occurrences" && (
                <div className="form-group">
                  <label>Number of Occurrences *</label>
                  <input
                    type="number"
                    value={taskData.recurrenceOccurrences}
                    onChange={(e) =>
                      setTaskData({
                        ...taskData,
                        recurrenceOccurrences: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                    max="10000"
                  />
                  {estimatedEndDate && (
                    <small>
                      Last task: {estimatedEndDate.toLocaleDateString()}
                    </small>
                  )}
                </div>
              )}
            </div>

            {affectedYears.length > 1 && (
              <div className="info-box">
                <span className="info-icon">📅</span>
                <div className="info-content">
                  <strong>Multi-Year Recurring Task</strong>
                  <p>
                    Spans {affectedYears.length} years:{" "}
                    <strong>{affectedYears.join(", ")}</strong>
                  </p>
                  <p className="info-detail">Budget linking per year:</p>
                  <ul className="info-list">
                    <li>
                      Existing category & item → links to them (preserves
                      budgets)
                    </li>
                    <li>
                      Only category exists → creates item from {sourceYear}{" "}
                      template
                    </li>
                    <li>
                      Neither exists → creates both from {sourceYear} template
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </button>
          {onCancel && (
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .task-create-form {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          max-width: 800px;
        }
        .form-header h3 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .form-description {
          margin: 0 0 1.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .form-content {
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
        .info-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: #eff6ff;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          align-items: flex-start;
        }
        .info-box-small {
          padding: 0.625rem;
          align-items: center;
          background: #fef3c7;
          border-color: #fde68a;
        }
        .info-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .info-text {
          color: #92400e;
          font-size: 0.875rem;
        }
        .info-content {
          flex: 1;
          color: #1e40af;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .info-content strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #1e3a8a;
        }
        .info-content p {
          margin: 0.5rem 0;
        }
        .info-detail {
          margin-top: 0.75rem;
          font-weight: 500;
        }
        .info-list {
          margin: 0.5rem 0 0 1.25rem;
          padding: 0;
        }
        .info-list li {
          margin: 0.375rem 0;
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
          width: 100%;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .budget-info-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .budget-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }
        .budget-info-label {
          color: #0369a1;
          font-weight: 500;
        }
        .budget-info-value {
          font-weight: 700;
          color: #0c4a6e;
        }
        .budget-info-value.spent {
          color: #f59e0b;
        }
        .budget-info-value.available {
          color: #059669;
        }
        .budget-info-value.available.negative {
          color: #dc2626;
        }
        .tip-box {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem;
          background: #fefce8;
          border: 1px solid #fde047;
          border-radius: 6px;
          align-items: flex-start;
        }
        .tip-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .tip-content {
          flex: 1;
        }
        .tip-content strong {
          display: block;
          color: #000000ff !important;
          font-size: 0.9rem;
          margin-bottom: 0.375rem;
        }
        .tip-content p {
          margin: 0;
          color: #000000ff !important;
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .tip-link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }
        .tip-link:hover {
          color: #1d4ed8;
        }
        .tip-link-text {
          color: #2563eb;
          font-weight: 600;
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
