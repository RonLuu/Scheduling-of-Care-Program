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
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  // Select all categories
  const selectAll = () => {
    const allIds = getCategoriesWithItems().map((cat) => cat.id);
    setSelectedCategories(new Set(allIds));
  };

  // Deselect all categories
  const deselectAll = () => {
    setSelectedCategories(new Set());
  };

  // Copy selected categories to target year
  const handleCopyPlan = async () => {
    if (!clientId || !budgetPlan || selectedCategories.size === 0) {
      alert("Please select at least one category to copy.");
      return;
    }

    setCopying(true);
    try {
      const target = await apiGetPlan(clientId, targetYear);
      const baseCategories = target?.categories ? [...target.categories] : [];

      // Copy selected categories
      const categoriesToCopy = budgetPlan.categories.filter((cat) =>
        selectedCategories.has(cat.id)
      );

      categoriesToCopy.forEach((srcCat) => {
        const tcat = ensureCategoryInTarget(baseCategories, srcCat);
        (srcCat.items || []).forEach((it) => upsertItemByName(tcat, it));
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
  const selectedItems = categoriesWithItems
    .filter((cat) => selectedCategories.has(cat.id))
    .reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="plan-future-container">
          {/* Header */}
          <div className="plan-header">
            <button className="back-btn-header" onClick={() => navigate("/budget-planning")}>
              <BiArrowBack /> Back to Budget Planning
            </button>
            <h2>Plan for Future Years</h2>
            <p>Carry over your {sourceYear} budget plan to a future year. <br /></p>
            <p>Save time setting up plans by copying all your 
               categories and items from {sourceYear} into a future year. 
              You can review or edit the details after copying.</p>
          </div>

          {/* Success Message */}
          {copySuccess && (
            <div className="success-banner">
              <BiCheck /> Successfully copied {selectedItems} item(s) to {targetYear}! Redirecting...
            </div>
          )}

          {/* Main Content */}
          <div className="content-section">
            {/* Year Selection */}
            <div className="year-selection-card">
              <h3>Select Target Year</h3>
              <p className="help-text">Choose which year to copy your budget plan to</p>
              <div className="year-selector">
                <label htmlFor="target-year">Target Year:</label>
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
              <div className="year-info">
                <div className="info-item">
                  <span className="label">Source Year:</span>
                  <span className="value">{sourceYear}</span>
                </div>
                <div className="info-item">
                  <span className="label">Total Categories:</span>
                  <span className="value">{categoriesWithItems.length}</span>
                </div>
                <div className="info-item">
                  <span className="label">Total Items:</span>
                  <span className="value">{totalItems}</span>
                </div>
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
                  <span className="separator">|</span>
                  <button className="text-btn" onClick={deselectAll} disabled={copying}>
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="help-text">
                Choose which categories to copy to {targetYear}. Items with the same name will be updated.
              </p>

              <div className="categories-list">
                {categoriesWithItems.map((category) => {
                  const isSelected = selectedCategories.has(category.id);
                  const categoryMeta = predefinedCategories.find(
                    (c) => c.id === category.id
                  ) || category;

                  return (
                    <div
                      key={category.id}
                      className={`category-item ${isSelected ? "selected" : ""}`}
                      onClick={() => !copying && toggleCategory(category.id)}
                    >
                      <div className="category-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCategory(category.id)}
                          disabled={copying}
                        />
                      </div>
                      <div className="category-icon">
                        {typeof categoryMeta.emoji === 'string' ? (
                          <span>{categoryMeta.emoji}</span>
                        ) : categoryMeta.emoji ? (
                          <categoryMeta.emoji />
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
                          {category.items.length} item{category.items.length !== 1 ? "s" : ""} • $
                          {category.budget.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-section">
              <div className="selection-summary">
                <strong>{selectedCategories.size}</strong> categor
                {selectedCategories.size === 1 ? "y" : "ies"} selected ({selectedItems} item
                {selectedItems !== 1 ? "s" : ""})
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
          left: 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .back-btn-header:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .plan-header h2 {
          margin: 2rem 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
        }
        .plan-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1rem;
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
          font-size: 0.875rem;
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
        }
        .selection-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .text-btn {
          background: none;
          border: none;
          color: #8189d2;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }
        .text-btn:hover {
          color: #6b73c1;
        }
        .text-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .separator {
          color: #d1d5db;
        }
        .categories-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .category-item:hover {
          border-color: #8189d2;
          background: #f3f4f6;
        }
        .category-item.selected {
          border-color: #8189d2;
          background: #eff6ff;
        }
        .category-checkbox input {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
        }
        .category-icon {
          font-size: 1.5rem;
          color: #8189d2;
          display: flex;
          align-items: center;
        }
        .category-details {
          flex: 1;
        }
        .category-name {
          font-weight: 600;
          color: #374151;
          font-size: 1rem;
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
        }
        .category-meta {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
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
        }
        .selection-summary strong {
          font-size: 1.25rem;
          color: #8189d2;
        }
        .action-buttons {
          display: flex;
          gap: 1rem;
        }
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background: white;
          color: #374151;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
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
