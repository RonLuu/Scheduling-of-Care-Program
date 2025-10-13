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
  const [isLoadingSpending, setIsLoadingSpending] = React.useState(true);
  const [showIncreaseBudgetModal, setShowIncreaseBudgetModal] =
    React.useState(false);
  const [showReallocateModal, setShowReallocateModal] = React.useState(false);
  const [showCrossCategoryReallocateModal, setShowCrossCategoryReallocateModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [newItemBudget, setNewItemBudget] = React.useState("");
  const [reallocationAmounts, setReallocationAmounts] = React.useState({});

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

  const handleReallocateWithinCategory = async () => {
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

      // Validate that no item goes negative
      const updatedCategories = budgetPlan.categories.map((cat) => {
        if (cat.id === selectedItem.category.id) {
          const newItems = cat.items.map((item) => {
            if (item._id === selectedItem.item._id) {
              // Add reallocated amount to this item
              return { ...item, budget: item.budget + totalReallocated };
            } else if (reallocationAmounts[item._id]) {
              // Subtract from source items
              const newBudget =
                item.budget - parseFloat(reallocationAmounts[item._id]);
              if (newBudget < 0) {
                throw new Error(
                  `Cannot reallocate more than available budget from ${item.name}`
                );
              }
              return { ...item, budget: newBudget };
            }
            return item;
          });

          return { ...cat, items: newItems };
        }
        return cat;
      });

      // Save to database (category budget and yearly budget stay the same)
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

  const handleReallocateAcrossCategories = async () => {
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
      setShowCrossCategoryReallocateModal(false);
      setSelectedItem(null);
      setReallocationAmounts({});

      // Reload the page to show updated budget data
      window.location.reload();
    } catch (err) {
      console.error("Error reallocating budget across categories:", err);
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

      {/* Budget Surplus Section - Only show if there are returns */}
      {totalReturned > 0 && (
        <div className="budget-surplus-section">
          <div className="surplus-header">
            <h3>💰 Budget Surplus from Returns</h3>
            <div className="surplus-amount">
              {formatCurrency(totalReturned)}
            </div>
          </div>
          <p className="surplus-description">
            This amount represents money that was initially spent but has been
            returned/refunded. This surplus is now available to be spent on
            other care needs.
          </p>
        </div>
      )}

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
          const progressPct = getProgressPercentage(
            categoryNetSpent,
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
                  <span className="category-emoji">
                    {React.createElement(getCategoryIcon(category))}
                  </span>
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
                    <span className="progress-text">{progressPct}%</span>
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
                    const itemProgressPct = getProgressPercentage(
                      itemNetSpent,
                      item.budget
                    );

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
                                Reallocate (Same Category)
                              </button>
                              <button
                                className="btn-reallocate-cross"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({
                                    item,
                                    category,
                                    itemSpent: itemNetSpent,
                                    itemProgressPct,
                                  });
                                  setReallocationAmounts({});
                                  setShowCrossCategoryReallocateModal(true);
                                }}
                              >
                                Reallocate (Any Category)
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
                <span>Net Amount Spent:</span>
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

      {/* Reallocate Within Category Modal */}
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
              Reallocate budget from other items in{" "}
              <strong>{selectedItem.category.name}</strong> to{" "}
              <strong>{selectedItem.item.name}</strong>. The category's total
              budget will remain unchanged.
            </p>

            <div className="budget-summary">
              <div className="budget-row">
                <span>Current Item Budget:</span>
                <span className="amount">
                  {formatCurrency(selectedItem.item.budget)}
                </span>
              </div>
              <div className="budget-row">
                <span>Net Amount Spent:</span>
                <span className="amount spent">
                  {formatCurrency(selectedItem.itemSpent)}
                </span>
              </div>
              <div className="budget-row">
                <span>Usage:</span>
                <span className="amount">{selectedItem.itemProgressPct}%</span>
              </div>
            </div>

            <div className="reallocate-section">
              <h4>Reallocate From:</h4>
              {selectedItem.category.items
                .filter((item) => item._id !== selectedItem.item._id)
                .map((sourceItem) => {
                  const sourceGrossSpent = getItemSpent(
                    selectedItem.category.id,
                    sourceItem._id
                  );
                  const sourceReturned = getItemReturned(
                    selectedItem.category.id,
                    sourceItem._id
                  );
                  const sourceNetSpent = sourceGrossSpent - sourceReturned;
                  const availableToReallocate =
                    sourceItem.budget - sourceNetSpent;
                  const currentReallocation =
                    parseFloat(reallocationAmounts[sourceItem._id]) || 0;

                  return (
                    <div key={sourceItem._id} className="source-item">
                      <div className="source-item-header">
                        <span className="source-item-name">
                          {sourceItem.name}
                        </span>
                        <span className="source-item-budget">
                          Budget: {formatCurrency(sourceItem.budget)} | Net
                          Spent: {formatCurrency(sourceNetSpent)} | Available:{" "}
                          {formatCurrency(availableToReallocate)}
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

            {Object.values(reallocationAmounts).some(
              (amt) => parseFloat(amt) > 0
            ) && (
              <div className="cascade-info">
                <p>
                  <strong>Budget Changes:</strong>
                </p>
                <div className="budget-row">
                  <span>Total being reallocated:</span>
                  <span className="amount increase">
                    +
                    {formatCurrency(
                      Object.values(reallocationAmounts).reduce(
                        (sum, amt) => sum + (parseFloat(amt) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>New budget for {selectedItem.item.name}:</span>
                  <span className="amount">
                    {formatCurrency(
                      selectedItem.item.budget +
                        Object.values(reallocationAmounts).reduce(
                          (sum, amt) => sum + (parseFloat(amt) || 0),
                          0
                        )
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>Category budget:</span>
                  <span className="amount">
                    {formatCurrency(selectedItem.category.budget)} (unchanged)
                  </span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowReallocateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleReallocateWithinCategory}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reallocate Across Categories Modal */}
      {showCrossCategoryReallocateModal && selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setShowCrossCategoryReallocateModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Reallocate Budget from Any Category</h3>
            <p className="modal-description">
              Reallocate budget from underutilized items across all categories to{" "}
              <strong>{selectedItem.item.name}</strong> in{" "}
              <strong>{selectedItem.category.name}</strong>. Category budgets will be adjusted accordingly, but the yearly total budget will remain unchanged.
            </p>

            <div className="budget-summary">
              <div className="budget-row">
                <span>Current Item Budget:</span>
                <span className="amount">
                  {formatCurrency(selectedItem.item.budget)}
                </span>
              </div>
              <div className="budget-row">
                <span>Net Amount Spent:</span>
                <span className="amount spent">
                  {formatCurrency(selectedItem.itemSpent)}
                </span>
              </div>
              <div className="budget-row">
                <span>Usage:</span>
                <span className="amount">{selectedItem.itemProgressPct}%</span>
              </div>
            </div>

            <div className="reallocate-section">
              <h4>Reallocate From Items in All Categories:</h4>
              {budgetPlan.categories.map((cat) => (
                <div key={cat.id} className="category-group">
                  <h5 className="category-group-title">{cat.name}</h5>
                  {cat.items
                    .filter((item) =>
                      !(cat.id === selectedItem.category.id && item._id === selectedItem.item._id)
                    )
                    .map((sourceItem) => {
                      const sourceGrossSpent = getItemSpent(cat.id, sourceItem._id);
                      const sourceReturned = getItemReturned(cat.id, sourceItem._id);
                      const sourceNetSpent = sourceGrossSpent - sourceReturned;
                      const availableToReallocate = sourceItem.budget - sourceNetSpent;
                      const currentReallocation =
                        parseFloat(reallocationAmounts[sourceItem._id]) || 0;

                      // Only show items with available budget
                      if (availableToReallocate <= 0) return null;

                      return (
                        <div key={sourceItem._id} className="source-item">
                          <div className="source-item-header">
                            <span className="source-item-name">
                              {sourceItem.name}
                            </span>
                            <span className="source-item-budget">
                              Budget: {formatCurrency(sourceItem.budget)} | Net
                              Spent: {formatCurrency(sourceNetSpent)} | Available:{" "}
                              {formatCurrency(availableToReallocate)}
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
              ))}
            </div>

            {Object.values(reallocationAmounts).some(
              (amt) => parseFloat(amt) > 0
            ) && (
              <div className="cascade-info">
                <p>
                  <strong>Budget Changes:</strong>
                </p>
                <div className="budget-row">
                  <span>Total being reallocated:</span>
                  <span className="amount increase">
                    +
                    {formatCurrency(
                      Object.values(reallocationAmounts).reduce(
                        (sum, amt) => sum + (parseFloat(amt) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>New budget for {selectedItem.item.name}:</span>
                  <span className="amount">
                    {formatCurrency(
                      selectedItem.item.budget +
                        Object.values(reallocationAmounts).reduce(
                          (sum, amt) => sum + (parseFloat(amt) || 0),
                          0
                        )
                    )}
                  </span>
                </div>
                <div className="budget-row">
                  <span>Yearly budget:</span>
                  <span className="amount">
                    {formatCurrency(budgetPlan.yearlyBudget)} (unchanged)
                  </span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowCrossCategoryReallocateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleReallocateAcrossCategories}
              >
                Save Changes
              </button>
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

        .summary-value.negative {
          color: #dc2626;
        }

        .summary-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        /* Budget Surplus Section */
        .budget-surplus-section {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          border: 2px solid #a78bfa;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(167, 139, 250, 0.2);
        }

        .surplus-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .surplus-header h3 {
          margin: 0;
          color: #5b21b6;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .surplus-amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: #10b981;
        }

        .surplus-description {
          margin: 0;
          color: #4c1d95;
          font-size: 0.95rem;
          line-height: 1.5;
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

        .return-indicator {
          margin-left: 0.5rem;
          font-size: 0.875rem;
          cursor: help;
        }

        .col-amount {
          text-align: right;
          font-weight: 600;
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
        .btn-reallocate,
        .btn-reallocate-cross {
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

        .btn-reallocate-cross {
          background: #7c3aed;
        }

        .btn-reallocate-cross:hover {
          background: #6d28d9;
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
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content.modal-large {
          max-width: 700px;
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
          justify-content: flex-end;
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
          background: #e5e7eb;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #d1d5db;
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

          .surplus-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetOverviewView;
