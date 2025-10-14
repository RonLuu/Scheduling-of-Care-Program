// BudgetOverviewView.jsx
import React from "react";
import {
  BiFirstAid,
  BiSpa,
  BiCloset,
  BiDish,
  BiAccessibility,
  BiPalette,
  BiCar,
  BiHome,
  BiClipboard,
} from "react-icons/bi";

function BudgetOverviewView({ budgetPlan, jwt, budgetPeriod, onReconfigure }) {
  // Predefined categories mapping
  const predefinedCategories = {
    health: BiFirstAid,
    hygiene: BiSpa,
    clothing: BiCloset,
    nutrition: BiDish,
    mobility: BiAccessibility,
    activities: BiPalette,
    transportation: BiCar,
    home: BiHome,
  };

  // Get the correct icon component for a category
  const getCategoryIcon = (category) => {
    // If it's a predefined category, use the icon mapping
    if (predefinedCategories[category.id]) {
      return predefinedCategories[category.id];
    }
    // For custom categories, always use BiClipboard
    return BiClipboard;
  };
  const [expandedCategories, setExpandedCategories] = React.useState(new Set());
  const [actualSpending, setActualSpending] = React.useState({});
  const [returnedAmounts, setReturnedAmounts] = React.useState({});
  const [expectedCosts, setExpectedCosts] = React.useState({});
  const [isLoadingSpending, setIsLoadingSpending] = React.useState(true);
  const [showIncreaseBudgetModal, setShowIncreaseBudgetModal] =
    React.useState(false);
  const [showReallocateModal, setShowReallocateModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [newItemBudget, setNewItemBudget] = React.useState("");
  const [reallocationAmounts, setReallocationAmounts] = React.useState({});
  const [reallocateFilter, setReallocateFilter] = React.useState("smart"); // "smart", "same-category", "other-category"

  // Load actual spending and returned amounts from care tasks
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
          console.log("Spending data:", data);
          setActualSpending(data.spending || {});
          setReturnedAmounts(data.returned || {});
          setExpectedCosts(data.expected || {});
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

  // Calculate totals including returned amounts
  const totalBudget = budgetPlan?.yearlyBudget || 0;
  const totalAllocated = (budgetPlan?.categories || []).reduce(
    (sum, cat) => sum + (cat.budget || 0),
    0
  );

  // Calculate gross spent (before returns) and total returned
  const totalGrossSpent = Object.values(actualSpending).reduce(
    (sum, catSpending) =>
      sum +
      Object.values(catSpending.items || {}).reduce(
        (itemSum, itemSpent) => itemSum + (itemSpent || 0),
        0
      ),
    0
  );

  const totalReturned = Object.values(returnedAmounts).reduce(
    (sum, catReturned) =>
      sum +
      Object.values(catReturned.items || {}).reduce(
        (itemSum, itemReturned) => itemSum + (itemReturned || 0),
        0
      ),
    0
  );

  // Net spending is gross minus returns
  const totalNetSpent = totalGrossSpent - totalReturned;

  // Calculate total expected costs for incomplete tasks
  const totalExpected = Object.values(expectedCosts).reduce(
    (sum, catExpected) =>
      sum +
      Object.values(catExpected.items || {}).reduce(
        (itemSum, itemExpected) => itemSum + (itemExpected || 0),
        0
      ),
    0
  );

  // Unallocated budget: total - spent - expected
  const unallocated = totalBudget - totalNetSpent - totalExpected;
  const remaining = totalBudget - totalNetSpent;

  const getCategorySpent = (categoryId) => {
    const catSpending = actualSpending[categoryId];
    if (!catSpending) return 0;
    return Object.values(catSpending.items || {}).reduce(
      (sum, itemSpent) => sum + (itemSpent || 0),
      0
    );
  };

  const getCategoryReturned = (categoryId) => {
    const catReturned = returnedAmounts[categoryId];
    if (!catReturned) return 0;
    return Object.values(catReturned.items || {}).reduce(
      (sum, itemReturned) => sum + (itemReturned || 0),
      0
    );
  };

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

  const getCategoryExpected = (categoryId) => {
    const catExpected = expectedCosts[categoryId];
    if (!catExpected) return 0;
    return Object.values(catExpected.items || {}).reduce(
      (sum, itemExpected) => sum + (itemExpected || 0),
      0
    );
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

  const getProgressPercentage = (netSpent, allocated) => {
    if (!allocated || allocated === 0) return 0;
    return Math.min(Math.round((netSpent / allocated) * 100), 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return "#dc2626"; // red
    if (percentage >= 75) return "#f59e0b"; // orange
    return "#10b981"; // green
  };

  const handleReallocateBudget = async () => {
    if (!selectedItem) return;

    try {
      // Calculate total amount being reallocated
      const totalReallocated = Object.values(reallocationAmounts).reduce(
        (sum, amount) => sum + (parseFloat(amount) || 0),
        0
      );

      if (totalReallocated <= 0) {
        alert("Please enter amounts to reallocate from other items.");
        return;
      }

      // Update categories: subtract from source items, add to target item
      const updatedCategories = budgetPlan.categories.map((cat) => {
        // Check if this category has the target item
        if (cat.id === selectedItem.category.id) {
          const newItems = cat.items.map((item) => {
            if (item._id === selectedItem.item._id) {
              // Add reallocated amount to target item
              return { ...item, budget: item.budget + totalReallocated };
            }
            return item;
          });
          // Increase category budget
          return { ...cat, items: newItems, budget: cat.budget + totalReallocated };
        }

        // Check if this category has any source items
        const hasSourceItems = cat.items.some(item => reallocationAmounts[item._id]);
        if (hasSourceItems) {
          let categoryDecrease = 0;
          const newItems = cat.items.map((item) => {
            if (reallocationAmounts[item._id]) {
              const reallocAmount = parseFloat(reallocationAmounts[item._id]);
              categoryDecrease += reallocAmount;
              const newBudget = item.budget - reallocAmount;
              if (newBudget < 0) {
                throw new Error(
                  `Cannot reallocate more than available budget from ${item.name}`
                );
              }
              return { ...item, budget: newBudget };
            }
            return item;
          });
          // Decrease category budget
          return { ...cat, items: newItems, budget: cat.budget - categoryDecrease };
        }

        return cat;
      });

      // Yearly budget remains the same (just moving money around)
      const response = await fetch(`/api/budget-plans`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          personId: budgetPlan.personId,
          year: budgetPlan.year,
          yearlyBudget: budgetPlan.yearlyBudget, // Unchanged
          categories: updatedCategories,
          budgetPeriodStart: budgetPlan.budgetPeriodStart,
          budgetPeriodEnd: budgetPlan.budgetPeriodEnd,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", response.status, errorData);
        throw new Error(
          errorData.error || `Server returned ${response.status}`
        );
      }

      // Close modal
      setShowReallocateModal(false);
      setSelectedItem(null);
      setReallocationAmounts({});

      // Reload the page to show updated budget data
      window.location.reload();
    } catch (err) {
      console.error("Error reallocating budget:", err);
      alert(`Failed to reallocate budget: ${err.message}`);
    }
  };

  const handleIncreaseBudget = async () => {
    if (!selectedItem) return;

    const newBudget = parseFloat(newItemBudget);
    if (isNaN(newBudget) || newBudget <= selectedItem.item.budget) {
      alert(
        "Please enter a valid budget amount greater than the current budget."
      );
      return;
    }

    try {
      // Calculate the difference to cascade up
      const budgetDifference = newBudget - selectedItem.item.budget;

      // Update the item budget
      const updatedCategories = budgetPlan.categories.map((cat) => {
        if (cat.id === selectedItem.category.id) {
          return {
            ...cat,
            // Increase category budget by the difference
            budget: cat.budget + budgetDifference,
            items: cat.items.map((item) => {
              if (item._id === selectedItem.item._id) {
                return { ...item, budget: newBudget };
              }
              return item;
            }),
          };
        }
        return cat;
      });

      // Increase yearly budget by the difference
      const newYearlyBudget = budgetPlan.yearlyBudget + budgetDifference;

      // Save to database
      const response = await fetch(`/api/budget-plans`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          personId: budgetPlan.personId,
          year: budgetPlan.year,
          yearlyBudget: newYearlyBudget,
          categories: updatedCategories,
          budgetPeriodStart: budgetPlan.budgetPeriodStart,
          budgetPeriodEnd: budgetPlan.budgetPeriodEnd,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", response.status, errorData);
        throw new Error(
          errorData.error || `Server returned ${response.status}`
        );
      }

      // Close modal
      setShowIncreaseBudgetModal(false);
      setSelectedItem(null);
      setNewItemBudget("");

      // Reload the page to show updated budget data
      window.location.reload();
    } catch (err) {
      console.error("Error increasing budget:", err);
      alert(`Failed to update budget: ${err.message}`);
    }
  };

  return (
    <div className="budget-overview">
      {/* Header */}
      <div className="overview-header">
        <div className="overview-header-text">
          <h2>
            Budget Plan for{" "}
            {budgetPeriod.startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            -{" "}
            {budgetPeriod.endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
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
            {isLoadingSpending ? "Loading..." : formatCurrency(totalNetSpent)}
          </div>
          <div className="summary-subtitle">
            {totalBudget > 0
              ? `${Math.round((totalNetSpent / totalBudget) * 100)}% of budget`
              : "0% of budget"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Committed (Scheduled)</div>
          <div className="summary-value committed">
            {isLoadingSpending ? "..." : formatCurrency(totalExpected)}
          </div>
          <div className="summary-subtitle">
            {totalBudget > 0
              ? `${Math.round((totalExpected / totalBudget) * 100)}% of budget`
              : "0% of budget"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Unallocated</div>
          <div className={`summary-value ${unallocated < 0 ? "negative" : "positive"}`}>
            {isLoadingSpending ? "..." : formatCurrency(unallocated)}
          </div>
          <div className="summary-subtitle">
            {totalBudget > 0
              ? `${Math.round((unallocated / totalBudget) * 100)}% of budget`
              : "0% of budget"}
          </div>
        </div>
      </div>

      {/* High Usage Warning Section */}
      {!isLoadingSpending && (() => {
        const highUsageItems = [];
        (budgetPlan?.categories || []).forEach((category) => {
          category.items?.forEach((item) => {
            const itemGrossSpent = getItemSpent(category.id, item._id);
            const itemReturned = getItemReturned(category.id, item._id);
            const itemNetSpent = itemGrossSpent - itemReturned;
            const itemProgressPct = getProgressPercentage(itemNetSpent, item.budget);

            if (itemProgressPct >= 80) {
              highUsageItems.push({
                item,
                category,
                itemNetSpent,
                itemProgressPct,
              });
            }
          });
        });

        if (highUsageItems.length > 0) {
          return (
            <div className="budget-warning-section">
              <div className="warning-header">
                <h3>⚠️ Items Requiring Attention</h3>
                <div className="warning-count">
                  {highUsageItems.length} {highUsageItems.length === 1 ? 'item' : 'items'}
                </div>
              </div>
              <p className="warning-description">
                The following items have used 80% or more of their budget. Consider increasing their budget or reallocating funds.
              </p>
              <div className="warning-items-list">
                {highUsageItems.map(({ item, category, itemNetSpent, itemProgressPct }) => (
                  <div key={`${category.id}-${item._id}`} className="warning-item">
                    <div className="warning-item-info">
                      <span className="warning-item-name">{item.name}</span>
                      <span className="warning-item-category">in {category.name}</span>
                    </div>
                    <div className="warning-item-stats">
                      <span className="warning-item-spent">{formatCurrency(itemNetSpent)} / {formatCurrency(item.budget)}</span>
                      <span className="warning-item-percentage" style={{
                        backgroundColor: itemProgressPct >= 100 ? '#dc2626' : itemProgressPct >= 90 ? '#f59e0b' : '#f59e0b',
                        color: 'white'
                      }}>
                        {itemProgressPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Categories Table */}
      <div className="categories-table">
        <div className="table-header">
          <div className="col-name">Category</div>
          <div className="col-amount">Allocated</div>
          <div className="col-amount">Spent</div>
          <div className="col-progress">Progress</div>
        </div>

        {(budgetPlan?.categories || []).map((category) => {
          const categoryGrossSpent = getCategorySpent(category.id);
          const categoryReturned = getCategoryReturned(category.id);
          const categoryNetSpent = categoryGrossSpent - categoryReturned;
          const categoryExpected = getCategoryExpected(category.id);
          const progressPct = getProgressPercentage(
            categoryNetSpent,
            category.budget
          );
          const expectedMarkerPct = category.budget > 0
            ? Math.min(((categoryNetSpent + categoryExpected) / category.budget) * 100, 100)
            : 0;
          const isExpanded = expandedCategories.has(category.id);

          // Check if category has items at 80% or more budget usage
          const hasHighUsageItems = !isLoadingSpending && category.items?.some((item) => {
            const itemGrossSpent = getItemSpent(category.id, item._id);
            const itemReturned = getItemReturned(category.id, item._id);
            const itemNetSpent = itemGrossSpent - itemReturned;
            const itemProgressPct = getProgressPercentage(itemNetSpent, item.budget);
            return itemProgressPct >= 80;
          });

          return (
            <div key={category.id} className="category-section">
              {/* Category Row */}
              <div
                className="category-row"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="col-name">
                  <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                  <span className="category-emoji">
                    {React.createElement(getCategoryIcon(category))}
                  </span>
                  <span className="category-name">{category.name}</span>
                  {hasHighUsageItems && (
                    <span className="category-warning-badge" title="Contains items requiring attention">
                      ⚠️
                    </span>
                  )}
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
                  {isLoadingSpending ? (
                    "..."
                  ) : (
                    <>{formatCurrency(categoryNetSpent)}</>
                  )}
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
                    {!isLoadingSpending && progressPct > 0 && (
                      <span
                        className="progress-text"
                        style={{
                          left: `${progressPct}%`,
                          borderColor: getProgressColor(progressPct),
                          top: Math.abs(progressPct - Math.round(expectedMarkerPct)) <= 2 ? '-1.8rem' : '-1.5rem',
                        }}
                        data-border-color={getProgressColor(progressPct)}
                      >
                        {progressPct}%
                      </span>
                    )}
                    {!isLoadingSpending && categoryExpected > 0 && (
                      <div
                        className="expected-marker"
                        style={{ left: `${expectedMarkerPct}%` }}
                        data-percentage={`${Math.round(expectedMarkerPct)}%`}
                        title={`Scheduled: ${formatCurrency(categoryExpected)}`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Items */}
              {isExpanded && category.items && category.items.length > 0 && (
                <div className="items-section">
                  {category.items.map((item) => {
                    const itemGrossSpent = getItemSpent(category.id, item._id);
                    const itemReturned = getItemReturned(category.id, item._id);
                    const itemNetSpent = itemGrossSpent - itemReturned;
                    const itemExpected = getItemExpected(category.id, item._id);
                    const itemProgressPct = getProgressPercentage(
                      itemNetSpent,
                      item.budget
                    );
                    const itemExpectedMarkerPct = item.budget > 0
                      ? Math.min(((itemNetSpent + itemExpected) / item.budget) * 100, 100)
                      : 0;

                    return (
                      <div key={item._id} className="item-row">
                        <div className="col-name item-name">
                          <span>{item.name}</span>
                          {itemReturned > 0 && (
                            <span className="return-badge">
                              {formatCurrency(itemReturned)} returned
                            </span>
                          )}
                          {itemProgressPct >= 80 && (
                            <div className="action-buttons">
                              <button
                                className="btn-increase"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({
                                    item,
                                    category,
                                    itemSpent: itemNetSpent,
                                    itemProgressPct,
                                  });
                                  setNewItemBudget(item.budget.toString());
                                  setShowIncreaseBudgetModal(true);
                                }}
                              >
                                Increase Budget
                              </button>
                              <button
                                className="btn-reallocate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({
                                    item,
                                    category,
                                    itemSpent: itemNetSpent,
                                    itemProgressPct,
                                  });
                                  setReallocationAmounts({});
                                  setShowReallocateModal(true);
                                }}
                              >
                                Reallocate Budget
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="col-amount">
                          {formatCurrency(item.budget)}
                        </div>
                        <div className="col-amount spent">
                          {isLoadingSpending ? (
                            "..."
                          ) : (
                            <div className="spent-details">
                              <span>{formatCurrency(itemNetSpent)}</span>
                            </div>
                          )}
                        </div>
                        <div className="col-progress">
                          <div className="progress-container">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${itemProgressPct}%`,
                                backgroundColor:
                                  getProgressColor(itemProgressPct),
                              }}
                            />
                            {!isLoadingSpending && itemProgressPct > 0 && (
                              <span
                                className="progress-text"
                                style={{
                                  left: `${itemProgressPct}%`,
                                  borderColor: getProgressColor(itemProgressPct),
                                  top: Math.abs(itemProgressPct - Math.round(itemExpectedMarkerPct)) <= 2 ? '-1.8rem' : '-1.5rem',
                                }}
                                data-border-color={getProgressColor(itemProgressPct)}
                              >
                                {itemProgressPct}%
                              </span>
                            )}
                            {!isLoadingSpending && itemExpected > 0 && (
                              <div
                                className="expected-marker"
                                style={{ left: `${itemExpectedMarkerPct}%` }}
                                data-percentage={`${Math.round(itemExpectedMarkerPct)}%`}
                                title={`Scheduled: ${formatCurrency(itemExpected)}`}
                              />
                            )}
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

      {/* Increase Budget Modal */}
      {showIncreaseBudgetModal && selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setShowIncreaseBudgetModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Increase Budget</h3>
            <p className="modal-description">
              Increasing the budget for{" "}
              <strong>{selectedItem.item.name}</strong> will also increase the
              budget for <strong>{selectedItem.category.name}</strong> and the
              total yearly budget.
            </p>

            <div className="budget-summary">
              <div className="budget-row">
                <span>Current Item Budget:</span>
                <span className="amount">
                  {formatCurrency(selectedItem.item.budget)}
                </span>
              </div>
              <div className="budget-row">
                <span>Amount Spent:</span>
                <span className="amount spent">
                  {formatCurrency(selectedItem.itemSpent)}
                </span>
              </div>
              <div className="budget-row">
                <span>Usage:</span>
                <span className="amount">{selectedItem.itemProgressPct}%</span>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="newBudget">New Item Budget</label>
              <input
                id="newBudget"
                type="number"
                step="0.01"
                value={newItemBudget}
                onChange={(e) => setNewItemBudget(e.target.value)}
                placeholder="Enter new budget amount"
              />
            </div>

            {parseFloat(newItemBudget) > selectedItem.item.budget && (
              <div className="cascade-info">
                <p>
                  <strong>Budget Changes:</strong>
                </p>
                <div className="budget-row">
                  <span>Item increase:</span>
                  <span className="amount increase">
                    +
                    {formatCurrency(
                      parseFloat(newItemBudget) - selectedItem.item.budget
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>Category new budget:</span>
                  <span className="amount">
                    {formatCurrency(
                      selectedItem.category.budget +
                        (parseFloat(newItemBudget) - selectedItem.item.budget)
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>Yearly new budget:</span>
                  <span className="amount">
                    {formatCurrency(
                      budgetPlan.yearlyBudget +
                        (parseFloat(newItemBudget) - selectedItem.item.budget)
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowIncreaseBudgetModal(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleIncreaseBudget}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reallocate Budget Modal */}
      {showReallocateModal && selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setShowReallocateModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Reallocate Budget</h3>
            <p className="modal-description">
              Move unused budget from other items to{" "}
              <strong>{selectedItem.item.name}</strong> under the{" "}
              <strong>{selectedItem.category.name}</strong> category.
            </p>

            <div className="reallocate-section">
              <h4>Sort by:</h4>

              <div className="filter-buttons">
                <button
                  className={`filter-btn ${reallocateFilter === "smart" ? "active" : ""}`}
                  onClick={() => setReallocateFilter("smart")}
                >
                  Items with Most Budget Left
                </button>
                <button
                  className={`filter-btn ${reallocateFilter === "same-category" ? "active" : ""}`}
                  onClick={() => setReallocateFilter("same-category")}
                >
                  Same Category
                </button>
                <button
                  className={`filter-btn ${reallocateFilter === "other-category" ? "active" : ""}`}
                  onClick={() => setReallocateFilter("other-category")}
                >
                  Other Categories
                </button>
              </div>

              {reallocateFilter === "smart" && (
                <p className="smart-sort-hint">
                  Items with the most unused budget will appear first. Enter the amount you want to reallocate from an item
                  (you can reallocate from multiple items). Then Scroll down and click Save Changes to apply your updates. 
                </p>
              )}

              {(() => {
                // Collect all items with their metadata
                const allAvailableItems = [];
                budgetPlan.categories.forEach((cat) => {
                  cat.items.forEach((item) => {
                    // Skip the target item
                    if (cat.id === selectedItem.category.id && item._id === selectedItem.item._id) {
                      return;
                    }

                    // Apply filter
                    if (reallocateFilter === "same-category" && cat.id !== selectedItem.category.id) {
                      return;
                    }
                    if (reallocateFilter === "other-category" && cat.id === selectedItem.category.id) {
                      return;
                    }

                    const sourceGrossSpent = getItemSpent(cat.id, item._id);
                    const sourceReturned = getItemReturned(cat.id, item._id);
                    const sourceNetSpent = sourceGrossSpent - sourceReturned;
                    const availableToReallocate = item.budget - sourceNetSpent;

                    // Only include items with available budget
                    if (availableToReallocate > 0) {
                      const utilizationPct = item.budget > 0 ? (sourceNetSpent / item.budget) * 100 : 0;
                      allAvailableItems.push({
                        item,
                        category: cat,
                        availableToReallocate,
                        sourceNetSpent,
                        utilizationPct,
                      });
                    }
                  });
                });

                // Smart sort: prioritize by available amount (descending), then by utilization (ascending - less used first)
                allAvailableItems.sort((a, b) => {
                  // Primary sort: available amount (descending - more available first)
                  if (b.availableToReallocate !== a.availableToReallocate) {
                    return b.availableToReallocate - a.availableToReallocate;
                  }
                  // Secondary sort: utilization percentage (ascending - less utilized first)
                  return a.utilizationPct - b.utilizationPct;
                });

                // Group by category for display
                const groupedItems = {};
                allAvailableItems.forEach(({ item, category, availableToReallocate, sourceNetSpent, utilizationPct }) => {
                  if (!groupedItems[category.id]) {
                    groupedItems[category.id] = {
                      category,
                      items: [],
                    };
                  }
                  groupedItems[category.id].items.push({
                    item,
                    availableToReallocate,
                    sourceNetSpent,
                    utilizationPct,
                  });
                });

                if (allAvailableItems.length === 0) {
                  return (
                    <div className="no-items-message">
                      No items available for reallocation in this filter.
                    </div>
                  );
                }

                return Object.values(groupedItems).map(({ category, items }) => (
                  <div key={category.id} className="category-group">
                    <h5 className="category-group-title">{category.name}</h5>
                    <div className="category-items-grid">
                    {items.map(({ item: sourceItem, availableToReallocate, sourceNetSpent, utilizationPct }) => {
                      const currentReallocation =
                        parseFloat(reallocationAmounts[sourceItem._id]) || 0;

                      return (
                        <div key={sourceItem._id} className="source-item">
                          <div className="source-item-header">
                            <div className="source-item-header-row">
                              <span className="source-item-name">
                                {sourceItem.name}
                              </span>
                              <span className="utilization-indicator" style={{
                                backgroundColor: utilizationPct < 50 ? '#fef3c7' : utilizationPct < 80 ? '#fef9c3' : '#d1fae5',
                                color: utilizationPct < 50 ? '#92400e' : utilizationPct < 80 ? '#854d0e' : '#065f46',
                              }}>
                                {utilizationPct.toFixed(0)}% used
                              </span>
                            </div>
                            <span className="source-item-budget">
                              Budget: {formatCurrency(sourceItem.budget)} |
                              Spent: {formatCurrency(sourceNetSpent)} | <br />Available:{" "}
                              <strong className="available-highlight">{formatCurrency(availableToReallocate)}</strong>
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={availableToReallocate}
                            value={reallocationAmounts[sourceItem._id] || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReallocationAmounts((prev) => ({
                                ...prev,
                                [sourceItem._id]: value,
                              }));
                            }}
                            placeholder="Amount to reallocate"
                            className="reallocate-input"
                          />
                          {currentReallocation > availableToReallocate && (
                            <span className="error-text">
                              Cannot reallocate more than available:{" "}
                              {formatCurrency(availableToReallocate)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-actions">
              {Object.values(reallocationAmounts).some(
                (amt) => parseFloat(amt) > 0
              ) && (
                <div className="new-budget-summary">
                  <span className="new-budget-label">New budget for {selectedItem.item.name}:</span>
                  <span className="new-budget-value">
                    {formatCurrency(
                      selectedItem.item.budget +
                        Object.values(reallocationAmounts).reduce(
                          (sum, amt) => sum + (parseFloat(amt) || 0),
                          0
                        )
                    )}
                  </span>
                </div>
              )}
              <div className="modal-buttons">
                <button
                  className="btn-cancel"
                  onClick={() => setShowReallocateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={handleReallocateBudget}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        .summary-value.committed {
          color: #eab308;
        }

        .summary-value.positive {
          color: #10b981;
        }

        .summary-value.negative {
          color: #dc2626;
        }

        .summary-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        /* Budget Warning Section */
        .budget-warning-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
        }

        .warning-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .warning-header h3 {
          margin: 0;
          color: #92400e;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .warning-count {
          font-size: 1rem;
          font-weight: 700;
          color: #d97706;
          background: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
        }

        .warning-description {
          margin: 0 0 1rem 0;
          color: #78350f;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .warning-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .warning-item {
          background: white;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .warning-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .warning-item-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .warning-item-category {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .warning-item-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .warning-item-spent {
          font-size: 0.875rem;
          color: #4b5563;
          font-weight: 500;
        }

        .warning-item-percentage {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          white-space: nowrap;
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
          padding: 0.75rem 1.5rem;
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

        .category-warning-badge {
          font-size: 1rem;
          animation: pulse 2s ease-in-out infinite;
          cursor: help;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        .item-count {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: normal;
          margin-left: auto;
        }

        .return-indicator {
          margin-left: 0.5rem;
          font-size: 0.875rem;
          cursor: help;
        }

        .col-amount {
          text-align: right;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .col-amount.spent {
          color: #f59e0b;
        }

        .returned-hint {
          color: #8b5cf6;
          margin-left: 0.25rem;
          font-size: 0.875rem;
          cursor: help;
        }

        .spent-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .spent-breakdown {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: normal;
        }

        .col-progress {
          display: flex;
          align-items: center;
        }

        .progress-container {
          position: relative;
          width: 100%;
          height: 0.5rem;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: visible;
          margin: 1rem 0;
        }

        .progress-bar {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: -1.5rem;
          left: 0;
          font-size: 0.7rem;
          font-weight: 600;
          color: #1f2937;
          background: white;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          border: 1px solid #10b981;
          white-space: nowrap;
          transform: translateX(-50%);
        }

        .progress-text::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top-width: 4px;
          border-top-style: solid;
          border-top-color: inherit;
        }

        .expected-marker {
          position: absolute;
          top: -0.25rem;
          bottom: -0.25rem;
          width: 3px;
          background: #eab308;
          transform: translateX(-50%);
          z-index: 10;
          box-shadow: 0 0 4px rgba(234, 179, 8, 0.6);
        }

        .expected-marker::after {
          content: attr(data-percentage);
          position: absolute;
          top: calc(100% + 0.25rem);
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.7rem;
          font-weight: 600;
          color: #1f2937;
          background: white;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          border: 1px solid #eab308;
          white-space: nowrap;
        }

        .expected-marker::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 4px solid #eab308;
          z-index: 1;
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
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .return-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-increase,
        .btn-reallocate {
          padding: 0.375rem 0.75rem;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .btn-increase {
          background: #2c3f70;
        }

        .btn-increase:hover {
          background: #1f2d4f;
        }

        .btn-reallocate {
          background: #059669;
        }

        .btn-reallocate:hover {
          background: #047857;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .modal-content.modal-large {
          max-width: 700px;
          max-height: 80vh;
        }

        .modal-content h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.5rem;
        }

        .modal-description {
          color: #6b7280;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .budget-summary {
          background: #f9fafb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .budget-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          font-size: 0.95rem;
        }

        .budget-row .amount {
          font-weight: 600;
          color: #1f2937;
        }

        .budget-row .amount.spent {
          color: #f59e0b;
        }

        .budget-row .amount.increase {
          color: #10b981;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .input-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          box-sizing: border-box;
        }

        .input-group input:focus {
          outline: none;
          border-color: #2c3f70;
          box-shadow: 0 0 0 3px rgba(44, 63, 112, 0.1);
        }

        .cascade-info {
          background: #eef2ff;
          border-left: 4px solid #2c3f70;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .cascade-info p {
          margin: 0 0 0.75rem 0;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          bottom: -2rem;
          background: white;
          padding: 1rem 2rem;
          margin: 1rem -2rem -2rem -2rem;
          border-top: 2px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .new-budget-summary {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .new-budget-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .new-budget-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #059669;
        }

        .modal-buttons {
          display: flex;
          gap: 1rem;
          margin-left: auto;
        }

        .btn-cancel,
        .btn-save {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-cancel {
          background: #6b7280 !important;
          color: white;
        }

        .btn-cancel:hover {
          background: #4b5563;
        }

        .btn-save {
          background: #2c3f70;
          color: white;
        }

        .btn-save:hover {
          background: #1f2d4f;
        }

        .reallocate-section {
          margin-bottom: 1.5rem;
        }

        .reallocate-section h4 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1.1rem;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          border: 2px solid #059669 !important;
          background: white;
          color: #1f2937!important;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: #f0fdf4;
        }

        .filter-btn.active {
          background: #059669 !important;
          border-color: #059669 !important;
          color: white !important;
        }

        .no-items-message {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .source-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .source-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .source-item-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .source-item-budget {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .reallocate-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          box-sizing: border-box;
        }

        .reallocate-input:focus {
          outline: none;
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .error-text {
          display: block;
          color: #dc2626;
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .category-group {
          margin-bottom: 1.5rem;
        }

        .category-group-title {
          margin: 0 0 0.75rem 0;
          color: #2c3f70;
          font-size: 1rem;
          font-weight: 600;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .category-items-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .category-items-grid {
            grid-template-columns: 1fr;
          }
        }

        .smart-sort-hint {
          background: #eef2ff;
          border-left: 4px solid #6366f1;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #4338ca;
          line-height: 1.5;
        }

        .source-item-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 0.5rem;
        }

        .utilization-indicator {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .available-highlight {
          color: #059669;
          font-weight: 700;
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
