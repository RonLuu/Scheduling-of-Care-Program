import React from "react";

function BudgetOverviewView({ budgetPlan, jwt, budgetPeriod, onReconfigure }) {
  const [expandedCategories, setExpandedCategories] = React.useState(new Set());
  const [actualSpending, setActualSpending] = React.useState({});
  const [isLoadingSpending, setIsLoadingSpending] = React.useState(true);

  // Load actual spending from completed care tasks
  React.useEffect(() => {
    const loadActualSpending = async () => {
      if (!budgetPlan?.personId || !budgetPlan?.year) return;

      setIsLoadingSpending(true);
      try {
        const response = await fetch(
          `/api/budget-plans/${budgetPlan.personId}/spending?year=${budgetPlan.year}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setActualSpending(data.spending || {});
        }
      } catch (err) {
        console.error("Error loading spending:", err);
      } finally {
        setIsLoadingSpending(false);
      }
    };

    loadActualSpending();
  }, [budgetPlan?.personId, budgetPlan?.year, jwt]);

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculate totals
  const totalBudget = budgetPlan?.yearlyBudget || 0;
  const totalAllocated = (budgetPlan?.categories || []).reduce(
    (sum, cat) => sum + (cat.budget || 0),
    0
  );
  const totalSpent = Object.values(actualSpending).reduce(
    (sum, catSpending) =>
      sum +
      Object.values(catSpending.items || {}).reduce(
        (itemSum, itemSpent) => itemSum + (itemSpent || 0),
        0
      ),
    0
  );
  const remaining = totalBudget - totalSpent;

  const getCategorySpent = (categoryId) => {
    const catSpending = actualSpending[categoryId];
    if (!catSpending) return 0;
    return Object.values(catSpending.items || {}).reduce(
      (sum, itemSpent) => sum + (itemSpent || 0),
      0
    );
  };

  const getItemSpent = (categoryId, itemId) => {
    return actualSpending[categoryId]?.items?.[itemId] || 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getProgressPercentage = (spent, allocated) => {
    if (!allocated || allocated === 0) return 0;
    return Math.min(Math.round((spent / allocated) * 100), 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return "#dc2626"; // red
    if (percentage >= 75) return "#f59e0b"; // orange
    return "#10b981"; // green
  };

  return (
    <div className="budget-overview">
      {/* Header */}
      <div className="overview-header">
        <div className="overview-header-text">
          <h2>Budget Plan for {budgetPeriod.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {budgetPeriod.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Budget</div>
          <div className="summary-value">{formatCurrency(totalBudget)}</div>
          <div className="summary-subtitle">Annual care budget</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Spent</div>
          <div className="summary-value spent">
            {isLoadingSpending ? "Loading..." : formatCurrency(totalSpent)}
          </div>
          <div className="summary-subtitle">
            {totalBudget > 0
              ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget`
              : "0% of budget"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Remaining</div>
          <div className={`summary-value ${remaining < 0 ? "negative" : ""}`}>
            {isLoadingSpending ? "..." : formatCurrency(remaining)}
          </div>
          <div className="summary-subtitle">
            {totalBudget > 0
              ? `${Math.round((remaining / totalBudget) * 100)}% of budget`
              : "0% of budget"}
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="categories-table">
        <div className="table-header">
          <div className="col-name">Category</div>
          <div className="col-amount">Allocated</div>
          <div className="col-amount">Spent</div>
          <div className="col-progress">Progress</div>
        </div>

        {(budgetPlan?.categories || []).map((category) => {
          const categorySpent = getCategorySpent(category.id);
          const progressPct = getProgressPercentage(
            categorySpent,
            category.budget
          );
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} className="category-section">
              {/* Category Row */}
              <div
                className="category-row"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="col-name">
                  <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                  <span className="category-emoji">{category.emoji}</span>
                  <span className="category-name">{category.name}</span>
                  {category.items && category.items.length > 0 && (
                    <span className="item-count">
                      ({category.items.length} items)
                    </span>
                  )}
                </div>
                <div className="col-amount">
                  {formatCurrency(category.budget)}
                </div>
                <div className="col-amount spent">
                  {isLoadingSpending ? "..." : formatCurrency(categorySpent)}
                </div>
                <div className="col-progress">
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: getProgressColor(progressPct),
                      }}
                    />
                    <span className="progress-text">{progressPct}%</span>
                  </div>
                </div>
              </div>

              {/* Budget Items */}
              {isExpanded && category.items && category.items.length > 0 && (
                <div className="items-section">
                  {category.items.map((item) => {
                    const itemSpent = getItemSpent(category.id, item._id);
                    const itemProgressPct = getProgressPercentage(
                      itemSpent,
                      item.budget
                    );

                    return (
                      <div key={item._id} className="item-row">
                        <div className="col-name item-name">{item.name}</div>
                        <div className="col-amount">
                          {formatCurrency(item.budget)}
                        </div>
                        <div className="col-amount spent">
                          {isLoadingSpending ? "..." : formatCurrency(itemSpent)}
                        </div>
                        <div className="col-progress">
                          <div className="progress-container">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${itemProgressPct}%`,
                                backgroundColor: getProgressColor(itemProgressPct),
                              }}
                            />
                            <span className="progress-text">
                              {itemProgressPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .budget-overview {
          padding: 1.5rem;
        }

        .overview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .overview-header-text {
          flex: 1;
          max-width: 700px;
        }

        .overview-header h2 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.75rem;
          text-align: left;
        }

        .budget-period-dates {
          margin: 0.5rem 0;
          color: #2c3f70;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .overview-subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.95rem;
        }

        .btn-secondary {
          padding: 0.625rem 1.25rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .summary-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .summary-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .summary-value.spent {
          color: #f59e0b;
        }

        .summary-value.negative {
          color: #dc2626;
        }

        .summary-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .categories-table {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 700;
          font-size: 0.875rem;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category-section {
          border-bottom: 1px solid #e5e7eb;
        }

        .category-section:last-child {
          border-bottom: none;
        }

        .category-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          cursor: pointer;
          transition: background-color 0.15s;
          align-items: center;
        }

        .category-row:hover {
          background: #f9fafb;
        }

        .col-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .expand-icon {
          color: #9ca3af;
          font-size: 0.75rem;
          width: 1rem;
          display: inline-block;
        }

        .category-emoji {
          font-size: 1.25rem;
        }

        .item-count {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: normal;
          margin-left: 0.5rem;
        }

        .col-amount {
          text-align: right;
          font-weight: 600;
        }

        .col-amount.spent {
          color: #f59e0b;
        }

        .col-progress {
          display: flex;
          align-items: center;
        }

        .progress-container {
          position: relative;
          width: 100%;
          height: 1.5rem;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 999px;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 700;
          color: #1f2937;
        }

        .items-section {
          background: #f9fafb;
        }

        .item-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 1rem;
          padding: 0.75rem 1.5rem 0.75rem 3.5rem;
          border-top: 1px solid #e5e7eb;
          align-items: center;
        }

        .item-row:first-child {
          border-top: none;
        }

        .item-name {
          font-weight: normal;
          color: #4b5563;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .table-header,
          .category-row,
          .item-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .col-amount,
          .col-progress {
            text-align: left;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetOverviewView;
