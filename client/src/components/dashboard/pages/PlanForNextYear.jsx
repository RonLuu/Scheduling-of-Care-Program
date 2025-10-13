import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavigationTab from "../../NavigationTab";
import {
  BiArrowBack,
  BiCheck,
  BiCopy,
  BiFirstAid,
  BiSpa,
  BiCloset,
  BiDish,
  BiAccessibility,
  BiPalette,
  BiCar,
  BiHome,
  BiClipboard,
  BiChevronDown,
  BiChevronRight,
} from "react-icons/bi";

function PlanForNextYear() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientId, sourceYear, budgetPlan } = location.state || {};

  // Debug logging
  React.useEffect(() => {
    console.log('PlanForNextYear - Location state:', location.state);
    console.log('PlanForNextYear - clientId:', clientId);
    console.log('PlanForNextYear - sourceYear:', sourceYear);
    console.log('PlanForNextYear - budgetPlan:', budgetPlan);
  }, []);

  const [targetYear, setTargetYear] = React.useState(sourceYear ? sourceYear + 1 : new Date().getFullYear() + 1);
  const [selectedCategories, setSelectedCategories] = React.useState(new Set());
  const [selectedItems, setSelectedItems] = React.useState({}); // { categoryId: Set([itemName1, itemName2, ...]) }
  const [expandedCategories, setExpandedCategories] = React.useState(new Set());
  const [copying, setCopying] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);

  const jwt = localStorage.getItem("jwt");

  // Predefined categories (same as in BudgetAndReportsPage)
  const predefinedCategories = [
    {
      id: "health",
      name: "Health & Medical",
      emoji: BiFirstAid,
      description: "Doctor visits, medications, medical equipment",
    },
    {
      id: "hygiene",
      name: "Hygiene & Personal Care",
      emoji: BiSpa,
      description: "Toiletries, bathing aids, grooming supplies",
    },
    {
      id: "clothing",
      name: "Clothing & Footwear",
      emoji: BiCloset,
      description: "Adaptive clothing, shoes, accessories",
    },
    {
      id: "nutrition",
      name: "Nutrition & Supplements",
      emoji: BiDish,
      description: "Special diets, vitamins, nutritional support",
    },
    {
      id: "mobility",
      name: "Mobility & Equipment",
      emoji: BiAccessibility,
      description: "Wheelchairs, walkers, mobility aids",
    },
    {
      id: "activities",
      name: "Activities & Entertainment",
      emoji: BiPalette,
      description: "Recreation, hobbies, social activities",
    },
    {
      id: "transportation",
      name: "Transportation",
      emoji: BiCar,
      description: "Medical transport, vehicle modifications",
    },
    {
      id: "home",
      name: "Home Modifications",
      emoji: BiHome,
      description: "Accessibility improvements, safety equipment",
    },
  ];

  // Get future years
  const getFutureYears = () => {
    const years = [];
    for (let y = sourceYear + 1; y <= sourceYear + 10; y++) years.push(y);
    return years;
  };

  // Helper functions (copied from BudgetAndReportsPage)
  const apiGetPlan = async (personId, year) => {
    const resp = await fetch(
      `/api/budget-plans?personId=${encodeURIComponent(
        personId
      )}&year=${encodeURIComponent(year)}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    const data = await resp.json();
    if (!resp.ok)
      throw new Error(data.error || "Failed to load target budget plan");
    return data.budgetPlan || null;
  };

  const apiUpsertPlan = async (personId, year, payload, hasExistingPlan) => {
    const resp = await fetch("/api/budget-plans", {
      method: hasExistingPlan ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ personId, year, ...payload }),
    });
    const data = await resp.json();
    if (!resp.ok)
      throw new Error(data.error || "Failed to save target budget plan");
    return data.budgetPlan;
  };

  const sumItemBudgets = (items = []) =>
    items.reduce((s, it) => s + (parseFloat(it.budget) || 0), 0);

  const recomputeTotals = (categories = []) => {
    const cats = categories.map((c) => ({
      ...c,
      budget: sumItemBudgets(c.items || []),
    }));
    const yearlyBudget = cats.reduce((s, c) => s + (c.budget || 0), 0);
    return { categories: cats, yearlyBudget };
  };

  const ensureCategoryInTarget = (targetCategories, sourceCatMeta) => {
    const idx = targetCategories.findIndex((c) => c.id === sourceCatMeta.id);
    if (idx >= 0) {
      return targetCategories[idx];
    }
    const newCat = {
      id: sourceCatMeta.id,
      name: sourceCatMeta.name,
      emoji: sourceCatMeta.emoji || BiClipboard,
      description: sourceCatMeta.description || "",
      isCustom: !!sourceCatMeta.isCustom,
      items: [],
      budget: 0,
    };
    targetCategories.push(newCat);
    return newCat;
  };

  const upsertItemByName = (categoryObj, item) => {
    const existingIdx = (categoryObj.items || []).findIndex(
      (it) => it.name === item.name
    );
    const clean = {
      name: item.name,
      description: item.description || "",
      budget: parseFloat(item.budget) || 0,
    };
    if (existingIdx >= 0) {
      categoryObj.items[existingIdx] = clean;
    } else {
      categoryObj.items.push(clean);
    }
  };

  // Get categories that have items
  const getCategoriesWithItems = () => {
    if (!budgetPlan?.categories) return [];
    return budgetPlan.categories.filter(
      (cat) => cat.items && cat.items.length > 0
    );
  };

  // Toggle category selection
  const toggleCategory = (categoryId) => {
    const newSelected = new Set(selectedCategories);
    const category = getCategoriesWithItems().find(cat => cat.id === categoryId);

    if (newSelected.has(categoryId)) {
      // Deselecting category - remove all its items
      newSelected.delete(categoryId);
      setSelectedItems(prev => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
    } else {
      // Selecting category - add all its items
      newSelected.add(categoryId);
      if (category?.items) {
        setSelectedItems(prev => ({
          ...prev,
          [categoryId]: new Set(category.items.map(item => item.name))
        }));
      }
    }
    setSelectedCategories(newSelected);
  };

  // Toggle individual item selection
  const toggleItem = (categoryId, itemName) => {
    setSelectedItems(prev => {
      const categoryItems = prev[categoryId] || new Set();
      const updated = new Set(categoryItems);

      if (updated.has(itemName)) {
        updated.delete(itemName);
      } else {
        updated.add(itemName);
      }

      // If all items deselected, uncheck category
      if (updated.size === 0) {
        setSelectedCategories(prevCats => {
          const newCats = new Set(prevCats);
          newCats.delete(categoryId);
          return newCats;
        });
        const result = { ...prev };
        delete result[categoryId];
        return result;
      }

      // If some items selected, ensure category is checked
      if (updated.size > 0) {
        setSelectedCategories(prevCats => new Set([...prevCats, categoryId]));
      }

      return { ...prev, [categoryId]: updated };
    });
  };

  // Toggle category expansion
  const toggleExpansion = (categoryId) => {
    setExpandedCategories(prev => {
      const updated = new Set(prev);
      if (updated.has(categoryId)) {
        updated.delete(categoryId);
      } else {
        updated.add(categoryId);
      }
      return updated;
    });
  };

  // Get selected item count for a category
  const getSelectedItemCount = (categoryId) => {
    return selectedItems[categoryId]?.size || 0;
  };

  // Get selected items budget for a category
  const getSelectedItemsBudget = (categoryId) => {
    const category = getCategoriesWithItems().find(cat => cat.id === categoryId);
    if (!category) return 0;

    const selectedItemNames = selectedItems[categoryId];
    if (!selectedItemNames || selectedItemNames.size === 0) return 0;

    return category.items
      .filter(item => selectedItemNames.has(item.name))
      .reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0);
  };

  // Select all categories
  const selectAll = () => {
    const categories = getCategoriesWithItems();
    const allIds = categories.map((cat) => cat.id);
    setSelectedCategories(new Set(allIds));

    // Select all items in all categories
    const allItemsMap = {};
    categories.forEach(cat => {
      if (cat.items && cat.items.length > 0) {
        allItemsMap[cat.id] = new Set(cat.items.map(item => item.name));
      }
    });
    setSelectedItems(allItemsMap);
  };

  // Deselect all categories
  const deselectAll = () => {
    setSelectedCategories(new Set());
    setSelectedItems({});
  };

  // Copy selected categories to target year
  const handleCopyPlan = async () => {
    if (!clientId || !budgetPlan || selectedCategories.size === 0) {
      alert("Please select at least one category to copy.");
      return;
    }

    // Count total selected items
    let totalSelectedItems = 0;
    selectedCategories.forEach(catId => {
      totalSelectedItems += getSelectedItemCount(catId);
    });

    if (totalSelectedItems === 0) {
      alert("Please select at least one item to copy.");
      return;
    }

    setCopying(true);
    try {
      const target = await apiGetPlan(clientId, targetYear);
      const baseCategories = target?.categories ? [...target.categories] : [];

      // Copy only selected items from selected categories
      const categoriesToCopy = budgetPlan.categories.filter((cat) =>
        selectedCategories.has(cat.id)
      );

      categoriesToCopy.forEach((srcCat) => {
        const tcat = ensureCategoryInTarget(baseCategories, srcCat);
        const categorySelectedItems = selectedItems[srcCat.id] || new Set();

        // Only copy items that are selected
        (srcCat.items || [])
          .filter(item => categorySelectedItems.has(item.name))
          .forEach((it) => upsertItemByName(tcat, it));
      });

      const { categories, yearlyBudget } = recomputeTotals(baseCategories);
      const payload = {
        categories,
        yearlyBudget,
        deletedCategories: target?.deletedCategories || [],
        budgetPeriodStart: new Date(targetYear, 0, 1),
        budgetPeriodEnd: new Date(targetYear, 11, 31),
      };

      await apiUpsertPlan(clientId, targetYear, payload, !!target);

      setCopySuccess(true);
      setTimeout(() => {
        navigate("/budget-planning");
      }, 2000);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to copy budget plan");
      setCopying(false);
    }
  };

  // Redirect if no data
  if (!clientId || !budgetPlan || !sourceYear) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <div className="error-container">
            <h2>No Budget Plan Data</h2>
            <p>Please navigate from the Budget Planning page.</p>
            <button className="back-btn" onClick={() => navigate("/budget-planning")}>
              Go to Budget Planning
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categoriesWithItems = getCategoriesWithItems();
  const totalItems = categoriesWithItems.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  // Calculate total selected items count
  const totalSelectedItemsCount = Array.from(selectedCategories).reduce((sum, catId) => {
    return sum + getSelectedItemCount(catId);
  }, 0);

  // Calculate total selected budget
  const totalSelectedBudget = Array.from(selectedCategories).reduce((sum, catId) => {
    return sum + getSelectedItemsBudget(catId);
  }, 0);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="plan-future-container">
          {/* Header */}
          <div className="plan-header">
            <h2>Set Up Future Budgets</h2>
            <p>Carry over your {sourceYear} budget to the future. You can edit details later.<br /></p>
          </div>

          {/* Success Message */}
          {copySuccess && (
            <div className="success-banner">
              <BiCheck /> Successfully copied {totalSelectedItemsCount} item(s) to {targetYear}! Redirecting...
            </div>
          )}

          {/* Main Content */}
          <div className="content-section">
            {/* Year Selection */}
            <div className="year-selection-card">
              <div className="year-selector">
                <label htmlFor="target-year">Copy your {sourceYear} budget to:</label>
                <select
                  id="target-year"
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value))}
                  disabled={copying}
                >
                  {getFutureYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Selection */}
            <div className="category-selection-card">
              <div className="card-header">
                <h3>Select Categories to Copy</h3>
                <div className="selection-controls">
                  <button className="text-btn" onClick={selectAll} disabled={copying}>
                    Select All
                  </button>
                  <button className="text-btn" onClick={deselectAll} disabled={copying}>
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="help-text">
                Choose which categories and items to copy to {targetYear}.
                Click on a category to expand and view its items.
              </p>

              <div className="categories-list">
                {categoriesWithItems.map((category) => {
                  const isSelected = selectedCategories.has(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const selectedItemCount = getSelectedItemCount(category.id);
                  const categoryMeta = predefinedCategories.find(
                    (c) => c.id === category.id
                  ) || category;

                  return (
                    <div
                      key={category.id}
                      className={`category-item ${isSelected ? "selected" : ""}`}
                    >
                      <div className="category-header-row">
                        <div className="category-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !copying && toggleCategory(category.id)}
                            disabled={copying}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div
                          className="category-content"
                          onClick={() => !copying && toggleExpansion(category.id)}
                        >
                          <div className="category-icon">
                            {category.isCustom ? (
                              <BiClipboard />
                            ) : categoryMeta.emoji ? (
                              React.createElement(categoryMeta.emoji)
                            ) : (
                              <BiClipboard />
                            )}
                          </div>
                          <div className="category-details">
                            <div className="category-name">
                              {category.name}
                              {category.isCustom && (
                                <span className="custom-badge">Custom</span>
                              )}
                            </div>
                            <div className="category-meta">
                              {isSelected && selectedItemCount !== category.items.length ? (
                                <span>{selectedItemCount} of {category.items.length} item{category.items.length !== 1 ? "s" : ""} selected • </span>
                              ) : (
                                <span>{category.items.length} item{category.items.length !== 1 ? "s" : ""} • </span>
                              )}
                              {isSelected && selectedItemCount > 0 && selectedItemCount !== category.items.length ? (
                                <span>${getSelectedItemsBudget(category.id).toLocaleString()}</span>
                              ) : (
                                <span>${category.budget.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <span className="expand-indicator">
                            {isExpanded ? "−" : "+"}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Items List */}
                      {isExpanded && (
                        <div className="items-list">
                          {category.items.map((item, idx) => {
                            const isItemSelected = selectedItems[category.id]?.has(item.name);
                            return (
                              <div
                                key={idx}
                                className={`item-row ${isItemSelected ? "selected" : ""}`}
                                onClick={() => !copying && toggleItem(category.id, item.name)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isItemSelected}
                                  onChange={() => toggleItem(category.id, item.name)}
                                  disabled={copying}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="item-details">
                                  <span className="item-name">{item.name}</span>
                                  {item.description && (
                                    <span className="item-description">{item.description}</span>
                                  )}
                                </div>
                                <span className="item-budget">${item.budget.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-section">
              <div className="selection-summary">
                <div className="summary-text">
                  <strong>{selectedCategories.size}</strong> categor
                  {selectedCategories.size === 1 ? "y" : "ies"} selected ({totalSelectedItemsCount} item
                  {totalSelectedItemsCount !== 1 ? "s" : ""})
                </div>
                <div className="summary-budget">
                  Total Budget: <span className="budget-amount">${totalSelectedBudget.toLocaleString()}</span>
                </div>
              </div>
              <div className="action-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => navigate("/budget-planning")}
                  disabled={copying}
                >
                  Cancel
                </button>
                <button
                  className="copy-btn"
                  onClick={handleCopyPlan}
                  disabled={copying || selectedCategories.size === 0}
                >
                  <BiCopy />
                  {copying ? "Copying..." : `Copy to ${targetYear}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fafc;
        }
        .page-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .plan-future-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .plan-header {
          background: #8189d2;
          color: white;
          padding: 2rem 2.5rem;
          position: relative;
        }
        .back-btn-header {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .back-btn-header:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .plan-header h2 {
          margin: 2rem 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
          color: white;
          text-align: left;
          font-family: "Inter", sans-serif;
        }
        .plan-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1rem;
          color: white;
          text-align: left;
          font-family: "Inter", sans-serif;
        }
        .success-banner {
          background: #d1fae5;
          color: #065f46;
          padding: 1rem 2.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          border-bottom: 1px solid #a7f3d0;
        }
        .content-section {
          padding: 2rem 2.5rem;
        }
        .year-selection-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .year-selection-card h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.25rem;
        }
        .help-text {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 1rem;
          text-align: left;
          font-family: "Inter", sans-serif;
        }
        .year-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .year-selector label {
          font-weight: 600;
          color: #374151;
        }
        .year-selector select {
          padding: 0.625rem;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 1rem;
          min-width: 120px;
        }
        .year-selector select:focus {
          outline: none;
          border-color: #8189d2;
        }
        .year-info {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: white;
          border-radius: 6px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .info-item .label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .info-item .value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
        }
        .category-selection-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .card-header h3 {
          margin: 0;
          color: #374151;
          font-size: 1.25rem;
          text-align: left;
          font-family: "Inter", sans-serif;
        }
        .selection-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .text-btn {
          border: none;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-width: 180px;
          height: 40px;
        }
        .text-btn:first-of-type {
          background: #10b981;
          color: white;
        }
        .text-btn:first-of-type:hover {
          background: #059669;
        }
        .text-btn:last-of-type {
          background: #6b7280;
          color: white;
        }
        .text-btn:last-of-type:hover {
          background: #4b5563;
        }
        .text-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .categories-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .category-item {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
          overflow: hidden;
        }
        .category-item:hover {
          border-color: #8189d2;
        }
        .category-item.selected {
          border-color: #8189d2;
          background: #eff6ff;
        }
        .category-header-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
        }
        .category-checkbox {
          flex-shrink: 0;
        }
        .category-checkbox input {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        .category-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
          padding: 0.25rem;
          margin: -0.25rem;
        }
        .category-content:hover {
          background: #f3f4f6;
        }
        .category-icon {
          font-size: 1.5rem;
          color: #8189d2;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .category-details {
          flex: 1;
          min-width: 0;
        }
        .category-name {
          font-weight: 600;
          color: #374151;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .custom-badge {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .category-meta {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        .expand-indicator {
          font-size: 1.5rem;
          font-weight: 400;
          color: #9ca3af;
          user-select: none;
          line-height: 1;
        }
        .items-list {
          padding: 0 1rem 1rem 1rem;
          background: white;
        }
        .item-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .item-row:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }
        .item-row.selected {
          background: #dbeafe;
          border-color: #3b82f6;
        }
        .item-row input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }
        .item-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .item-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }
        .item-description {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .item-budget {
          font-weight: 600;
          color: #059669;
          font-size: 0.875rem;
        }
        .action-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 8px;
        }
        .selection-summary {
          color: #374151;
          font-size: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .summary-text strong {
          font-size: 1.25rem;
          color: #8189d2;
        }
        .summary-budget {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .budget-amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: #059669;
          margin-left: 0.5rem;
        }
        .action-buttons {
          display: flex;
          gap: 1rem;
        }
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          background: #4b5563;
        }
        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .copy-btn {
          padding: 0.75rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.3);
        }
        .copy-btn:hover {
          background: #6b73c1;
          box-shadow: 0 4px 8px rgba(129, 137, 210, 0.4);
        }
        .copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .error-container {
          text-align: center;
          padding: 3rem;
        }
        .error-container h2 {
          color: #374151;
          margin-bottom: 1rem;
        }
        .error-container p {
          color: #6b7280;
          margin-bottom: 2rem;
        }
        .back-btn {
          padding: 0.75rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .back-btn:hover {
          background: #6b73c1;
        }
        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }
          .plan-header {
            padding: 1.5rem 1rem 1rem 1rem;
          }
          .content-section {
            padding: 1rem;
          }
          .year-info {
            flex-direction: column;
            gap: 1rem;
          }
          .action-section {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default PlanForNextYear;
