// BudgetAndReportsPage.jsx
import React from "react";
import NavigationTab from "../../NavigationTab";
import useAuth from "../hooks/useAuth";
import { useClients } from "../hooks/useClients";
import { useBudgetPlan } from "../hooks/useBudgetPlan";
import BudgetOverviewView from "./BudgetOverviewView";

function BudgetPlanningPage() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error } = useClients(me, jwt);

  const [selectedClient, setSelectedClient] = React.useState(null);
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear()
  );
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newCategoryDescription, setNewCategoryDescription] =
    React.useState("");
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState(null);
  const [newItemForms, setNewItemForms] = React.useState({});
  const [customCategories, setCustomCategories] = React.useState([]);
  const [deletedCategories, setDeletedCategories] = React.useState([]);
  const [showWizard, setShowWizard] = React.useState(true);
  const [editingItem, setEditingItem] = React.useState(null); // { categoryId, itemIndex }
  const [editItemData, setEditItemData] = React.useState({
    name: "",
    budget: "",
    description: "",
  });

  // COPY: small state for copy-target years (plan/category/item)
  const nextYearDefault = selectedYear + 1;
  const [planCopyYear, setPlanCopyYear] = React.useState(nextYearDefault);
  const [categoryCopyYears, setCategoryCopyYears] = React.useState({}); // { [categoryId]: year }
  const [itemCopyYears, setItemCopyYears] = React.useState({}); // { [`${categoryId}:${index}`]: year }
  React.useEffect(() => {
    setPlanCopyYear(selectedYear + 1);
    setCategoryCopyYears({});
    setItemCopyYears({});
  }, [selectedYear]);

  // Use the budget plan hook
  const {
    budgetPlan,
    loading: budgetLoading,
    error: budgetError,
    saveBudgetPlan,
    refresh,
  } = useBudgetPlan(selectedClient?._id, selectedYear, jwt);

  // Predefined categories with emojis
  const predefinedCategories = [
    {
      id: "health",
      name: "Health & Medical",
      emoji: "🏥",
      description: "Doctor visits, medications, medical equipment",
    },
    {
      id: "hygiene",
      name: "Hygiene & Personal Care",
      emoji: "🧴",
      description: "Toiletries, bathing aids, grooming supplies",
    },
    {
      id: "clothing",
      name: "Clothing & Footwear",
      emoji: "👕",
      description: "Adaptive clothing, shoes, accessories",
    },
    {
      id: "nutrition",
      name: "Nutrition & Supplements",
      emoji: "🥗",
      description: "Special diets, vitamins, nutritional support",
    },
    {
      id: "mobility",
      name: "Mobility & Equipment",
      emoji: "♿",
      description: "Wheelchairs, walkers, mobility aids",
    },
    {
      id: "activities",
      name: "Activities & Entertainment",
      emoji: "🎨",
      description: "Recreation, hobbies, social activities",
    },
    {
      id: "transportation",
      name: "Transportation",
      emoji: "🚗",
      description: "Medical transport, vehicle modifications",
    },
    {
      id: "home",
      name: "Home Modifications",
      emoji: "🏠",
      description: "Accessibility improvements, safety equipment",
    },
  ];

  // Calculate budget period for calendar year
  const budgetPeriod = React.useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const label = `Calendar Year ${selectedYear}`;
    return { startDate, endDate, label };
  }, [selectedYear]);

  // Auto-select first client when clients load
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  // Load custom categories and deleted categories from budget plan
  React.useEffect(() => {
    if (budgetPlan === null || budgetPlan === undefined) {
      setDeletedCategories([]);
      return;
    }
    if (!budgetPlan.categories || !Array.isArray(budgetPlan.categories)) {
      setDeletedCategories([]);
      return;
    }
    const customCatsFromBackend = budgetPlan.categories.filter(
      (cat) => cat.isCustom
    );
    setCustomCategories((prevCustom) => {
      const budgetPlanCustomIds = new Set(
        customCatsFromBackend.map((cat) => cat.id)
      );
      const localOnly = prevCustom.filter(
        (cat) => !budgetPlanCustomIds.has(cat.id)
      );
      return [...customCatsFromBackend, ...localOnly];
    });
    if (
      budgetPlan.deletedCategories &&
      Array.isArray(budgetPlan.deletedCategories)
    ) {
      setDeletedCategories(budgetPlan.deletedCategories);
    } else {
      setDeletedCategories([]);
    }
  }, [budgetPlan]);

  // Calculate total item budgets for a category
  const getCategoryBudget = (categoryId) => {
    const category = (budgetPlan?.categories || []).find(
      (cat) => cat.id === categoryId
    );
    if (!category || !category.items) return 0;
    return category.items.reduce(
      (sum, item) => sum + (parseFloat(item.budget) || 0),
      0
    );
  };

  // Calculate total yearly budget (sum of all categories)
  const getTotalYearlyBudget = () => {
    return getAllAvailableCategories().reduce(
      (sum, cat) => sum + getCategoryBudget(cat.id),
      0
    );
  };

  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }
    const newCategory = {
      id: `custom_${Date.now()}`,
      name: newCategoryName.trim(),
      emoji: "📋",
      description: newCategoryDescription.trim() || "Custom category",
      isCustom: true,
    };
    const updatedCustomCategories = [...customCategories, newCategory];
    setCustomCategories(updatedCustomCategories);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setShowAddCategory(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    const predefinedCategory = predefinedCategories.find(
      (cat) => cat.id === categoryId
    );
    let updatedDeletedCategories = deletedCategories;
    if (predefinedCategory) {
      updatedDeletedCategories = [...deletedCategories, categoryId];
      setDeletedCategories(updatedDeletedCategories);
    } else {
      setCustomCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryId)
      );
    }
    const updatedCategories = (budgetPlan?.categories || []).filter(
      (cat) => cat.id !== categoryId
    );
    const yearlyBudget = updatedCategories.reduce((sum, cat) => {
      const catBudget = (cat.items || []).reduce(
        (itemSum, item) => itemSum + (parseFloat(item.budget) || 0),
        0
      );
      return sum + catBudget;
    }, 0);
    try {
      await saveBudgetPlan({
        yearlyBudget,
        categories: updatedCategories,
        deletedCategories: updatedDeletedCategories,
        budgetPeriodStart: budgetPeriod.startDate,
        budgetPeriodEnd: budgetPeriod.endDate,
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      if (predefinedCategory) {
        setDeletedCategories((prev) => prev.filter((id) => id !== categoryId));
      } else {
        const categoryToRestore = customCategories.find(
          (cat) => cat.id === categoryId
        );
        if (categoryToRestore) {
          setCustomCategories((prev) => [...prev, categoryToRestore]);
        }
      }
    }
  };

  const getAllAvailableCategories = () => {
    const availablePredefined = predefinedCategories.filter(
      (cat) => !deletedCategories.includes(cat.id)
    );
    return [...availablePredefined, ...customCategories];
  };

  const handleAddBudgetItem = async (
    categoryId,
    itemName,
    itemBudget,
    itemDescription = ""
  ) => {
    if (!itemName.trim()) {
      alert("Please enter an item name");
      return;
    }
    if (!itemBudget || isNaN(itemBudget) || parseFloat(itemBudget) <= 0) {
      alert("Please enter a valid budget amount");
      return;
    }
    const newItem = {
      name: itemName.trim(),
      budget: parseFloat(itemBudget),
      description: itemDescription.trim(),
    };
    let updatedCategories = [...(budgetPlan?.categories || [])];
    const categoryIndex = updatedCategories.findIndex(
      (cat) => cat.id === categoryId
    );
    if (categoryIndex >= 0) {
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        items: [...(updatedCategories[categoryIndex].items || []), newItem],
      };
    } else {
      const categoryData = getAllAvailableCategories().find(
        (cat) => cat.id === categoryId
      );
      if (categoryData) {
        updatedCategories.push({
          ...categoryData,
          budget: 0,
          items: [newItem],
        });
      }
    }
    updatedCategories = updatedCategories.map((cat) => ({
      ...cat,
      budget: (cat.items || []).reduce(
        (sum, item) => sum + (parseFloat(item.budget) || 0),
        0
      ),
    }));
    const yearlyBudget = updatedCategories.reduce(
      (sum, cat) => sum + cat.budget,
      0
    );
    try {
      await saveBudgetPlan({
        yearlyBudget,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
        budgetPeriodStart: budgetPeriod.startDate,
        budgetPeriodEnd: budgetPeriod.endDate,
      });
      setNewItemForms((prev) => ({
        ...prev,
        [categoryId]: { name: "", budget: "", description: "" },
      }));
    } catch (error) {
      console.error("Error adding budget item:", error);
    }
  };

  const handleDeleteBudgetItem = async (categoryId, itemIndex) => {
    let updatedCategories = (budgetPlan?.categories || []).map((cat) => {
      if (cat.id === categoryId) {
        const updatedItems = [...(cat.items || [])];
        updatedItems.splice(itemIndex, 1);
        return { ...cat, items: updatedItems };
      }
      return cat;
    });
    updatedCategories = updatedCategories.map((cat) => ({
      ...cat,
      budget: (cat.items || []).reduce(
        (sum, item) => sum + (parseFloat(item.budget) || 0),
        0
      ),
    }));
    const yearlyBudget = updatedCategories.reduce(
      (sum, cat) => sum + cat.budget,
      0
    );
    try {
      await saveBudgetPlan({
        yearlyBudget,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
        budgetPeriodStart: budgetPeriod.startDate,
        budgetPeriodEnd: budgetPeriod.endDate,
      });
    } catch (error) {
      console.error("Error deleting budget item:", error);
    }
  };

  const handleStartEditItem = (categoryId, itemIndex, item) => {
    setEditingItem({ categoryId, itemIndex });
    setEditItemData({
      name: item.name,
      budget: item.budget.toString(),
      description: item.description || "",
    });
  };
  const handleCancelEditItem = () => {
    setEditingItem(null);
    setEditItemData({ name: "", budget: "", description: "" });
  };
  const handleSaveEditItem = async (categoryId, itemIndex) => {
    if (!editItemData.name.trim()) {
      alert("Please enter an item name");
      return;
    }
    if (
      !editItemData.budget ||
      isNaN(editItemData.budget) ||
      parseFloat(editItemData.budget) <= 0
    ) {
      alert("Please enter a valid budget amount");
      return;
    }
    let updatedCategories = (budgetPlan?.categories || []).map((cat) => {
      if (cat.id === categoryId) {
        const updatedItems = [...(cat.items || [])];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          name: editItemData.name.trim(),
          budget: parseFloat(editItemData.budget),
          description: editItemData.description.trim(),
        };
        return { ...cat, items: updatedItems };
      }
      return cat;
    });
    updatedCategories = updatedCategories.map((cat) => ({
      ...cat,
      budget: (cat.items || []).reduce(
        (sum, item) => sum + (parseFloat(item.budget) || 0),
        0
      ),
    }));
    const yearlyBudget = updatedCategories.reduce(
      (sum, cat) => sum + cat.budget,
      0
    );
    try {
      await saveBudgetPlan({
        yearlyBudget,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
        budgetPeriodStart: budgetPeriod.startDate,
        budgetPeriodEnd: budgetPeriod.endDate,
      });
      setEditingItem(null);
      setEditItemData({ name: "", budget: "", description: "" });
    } catch (error) {
      console.error("Error editing budget item:", error);
    }
  };

  // Generate year options (current year ± 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // COPY: build future-year choices (next 10 years starting from selectedYear)
  const getFutureYears = () => {
    const years = [];
    for (let y = selectedYear + 1; y <= selectedYear + 10; y++) years.push(y);
    return years;
  };

  // COPY: API helpers to load and upsert the target-year plan without disturbing current page state
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

  // COPY: merge logic — do NOT delete anything that already exists
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
      // keep existing meta; do not remove anything
      return targetCategories[idx];
    }
    const newCat = {
      id: sourceCatMeta.id,
      name: sourceCatMeta.name,
      emoji: sourceCatMeta.emoji || "📋",
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
      categoryObj.items[existingIdx] = clean; // override by same name
    } else {
      categoryObj.items.push(clean); // create new
    }
  };

  // COPY: core actions
  const copySingleItem = async (categoryId, item, targetYear) => {
    if (!selectedClient || !budgetPlan) return;
    try {
      const target = await apiGetPlan(selectedClient._id, targetYear);
      const baseCategories = target?.categories ? [...target.categories] : [];
      const srcCategoryMeta =
        (budgetPlan.categories || []).find((c) => c.id === categoryId) ||
        getAllAvailableCategories().find((c) => c.id === categoryId);

      const targetCat = ensureCategoryInTarget(baseCategories, srcCategoryMeta);
      upsertItemByName(targetCat, item);

      const { categories, yearlyBudget } = recomputeTotals(baseCategories);
      const payload = {
        categories,
        yearlyBudget,
        deletedCategories: target?.deletedCategories || [],
        budgetPeriodStart: new Date(targetYear, 0, 1),
        budgetPeriodEnd: new Date(targetYear, 11, 31),
      };
      await apiUpsertPlan(selectedClient._id, targetYear, payload, !!target);
      alert(
        `Copied “${item.name}” to ${targetYear} in “${srcCategoryMeta.name}”.`
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to copy item");
    }
  };

  const copyWholeCategory = async (categoryId, targetYear) => {
    if (!selectedClient || !budgetPlan) return;
    const src = (budgetPlan.categories || []).find((c) => c.id === categoryId);
    if (!src || !src.items || src.items.length === 0) {
      alert("This category has no items to copy.");
      return;
    }
    try {
      const target = await apiGetPlan(selectedClient._id, targetYear);
      const baseCategories = target?.categories ? [...target.categories] : [];

      const targetCat = ensureCategoryInTarget(baseCategories, src);
      (src.items || []).forEach((it) => upsertItemByName(targetCat, it));

      const { categories, yearlyBudget } = recomputeTotals(baseCategories);
      const payload = {
        categories,
        yearlyBudget,
        deletedCategories: target?.deletedCategories || [],
        budgetPeriodStart: new Date(targetYear, 0, 1),
        budgetPeriodEnd: new Date(targetYear, 11, 31),
      };
      await apiUpsertPlan(selectedClient._id, targetYear, payload, !!target);
      alert(
        `Copied category “${src.name}” (${src.items.length} item${
          src.items.length !== 1 ? "s" : ""
        }) to ${targetYear}.`
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to copy category");
    }
  };

  const copyWholePlan = async (targetYear) => {
    if (!selectedClient || !budgetPlan) return;
    const srcCats = (budgetPlan.categories || []).filter(
      (c) => (c.items || []).length > 0
    );
    if (srcCats.length === 0) {
      alert("There are no items in this budget plan to copy.");
      return;
    }
    try {
      const target = await apiGetPlan(selectedClient._id, targetYear);
      const baseCategories = target?.categories ? [...target.categories] : [];

      srcCats.forEach((srcCat) => {
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
      await apiUpsertPlan(selectedClient._id, targetYear, payload, !!target);
      alert(
        `Copied ${srcCats.reduce(
          (s, c) => s + (c.items?.length || 0),
          0
        )} item(s) across ${srcCats.length} categor${
          srcCats.length === 1 ? "y" : "ies"
        } to ${targetYear}.`
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to copy budget plan");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <h2>Error loading clients</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <h2>Budget Planning</h2>
          <p>Please add a client first to create a budget plan.</p>
          <a href="/clients" className="btn">
            Add Client
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="budget-planning-container">
          {/* Header */}
          <div className="budget-header">
            <h2>💰 Budget Planning</h2>
          </div>

          {/* Client and Year Selection */}
          <div className="client-selection">
            <div className="client-selection-row">
              <div className="client-select-wrapper">
                <label htmlFor="client-select">Client:</label>
                <select
                  id="client-select"
                  value={selectedClient?._id || ""}
                  onChange={(e) => {
                    const client = clients.find(
                      (c) => c._id === e.target.value
                    );
                    setSelectedClient(client);
                    setShowWizard(false);
                    setNewCategoryName("");
                    setNewCategoryDescription("");
                    setShowAddCategory(false);
                    setExpandedCategory(null);
                    setNewItemForms({});
                  }}
                >
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="year-select-wrapper">
                <label htmlFor="year-select">Budget Year:</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setShowWizard(false);
                  }}
                >
                  {getYearOptions().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const isBudgetPlanComplete =
                  budgetPlan?.yearlyBudget &&
                  budgetPlan?.categories?.length > 0 &&
                  budgetPlan?.categories?.some(
                    (cat) => cat.items && cat.items.length > 0
                  );
                const shouldShowOverview = isBudgetPlanComplete && !showWizard;

                return (
                  <>
                    {shouldShowOverview && (
                      <button
                        className="reconfigure-btn"
                        onClick={() => setShowWizard(true)}
                      >
                        ✏️ Edit Budget Plan
                      </button>
                    )}

                    {/* COPY: Plan-level copy controls */}
                    {selectedClient && (
                      <div
                        className="copy-plan-controls"
                        title="Copy the entire plan to a future year"
                      >
                        <label>
                          Copy whole plan to:{" "}
                          <select
                            value={planCopyYear}
                            onChange={(e) =>
                              setPlanCopyYear(parseInt(e.target.value))
                            }
                          >
                            {getFutureYears().map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="copy-plan-btn"
                          onClick={() => copyWholePlan(planCopyYear)}
                        >
                          ⤴️ Copy Plan
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="copy-tip">
              <strong>Tip:</strong> Copy items, categories, or the whole plan to
              a future year. Existing items in the destination year are{" "}
              <em>not deleted</em>; items with the same name in the same
              category are <em>updated</em>.
            </p>
          </div>

          {selectedClient && (
            <>
              {(() => {
                const isBudgetPlanComplete =
                  budgetPlan?.yearlyBudget &&
                  budgetPlan?.categories?.length > 0 &&
                  budgetPlan?.categories?.some(
                    (cat) => cat.items && cat.items.length > 0
                  );

                const shouldShowOverview = isBudgetPlanComplete && !showWizard;

                return shouldShowOverview ? (
                  <BudgetOverviewView
                    budgetPlan={budgetPlan}
                    jwt={jwt}
                    budgetPeriod={budgetPeriod}
                    onReconfigure={() => setShowWizard(true)}
                  />
                ) : (
                  <>
                    {/* Instructions */}
                    <div className="instructions-section">
                      <h3>📋 How to Create Your Budget Plan</h3>
                      <p>
                        Create a comprehensive budget plan in 2 simple steps:
                      </p>
                      <ol>
                        <li>
                          <strong>Review Categories:</strong> Select from
                          predefined categories or add custom ones.
                        </li>
                        <li>
                          <strong>Add Budget Items:</strong> Add items and their
                          budgets. Totals are automatic.
                        </li>
                      </ol>
                      <p className="instructions-copy-note">
                        Need to carry this plan forward? Use the “Copy…”
                        controls to move items to next year(s).
                      </p>
                    </div>

                    {/* Budget Summary */}
                    <div className="budget-summary-card">
                      <div className="summary-row-header">
                        <h3>Budget Summary for {selectedYear}</h3>
                      </div>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">
                            Total Yearly Budget:
                          </span>
                          <span className="summary-value">
                            ${getTotalYearlyBudget().toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Budget Period:</span>
                          <span className="summary-value">
                            {budgetPeriod.startDate.toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}{" "}
                            -{" "}
                            {budgetPeriod.endDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Select Categories */}
                    <div className="budget-step">
                      <div className="step-header">
                        <h3>📂 Step 1: Select Budget Categories</h3>
                        <p>
                          Choose the categories relevant to{" "}
                          {selectedClient.name}'s care needs, or add custom
                          categories.
                        </p>
                      </div>

                      <div className="categories-section">
                        {/* Add Custom Category Button */}
                        <div className="add-category-section">
                          {!showAddCategory ? (
                            <button
                              className="add-category-btn"
                              onClick={() => setShowAddCategory(true)}
                            >
                              ➕ Add Custom Category
                            </button>
                          ) : (
                            <div className="add-category-form">
                              <div className="add-category-inputs">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                  }
                                  placeholder="Category name (e.g., Entertainment)"
                                  className="category-name-input"
                                />
                                <input
                                  type="text"
                                  value={newCategoryDescription}
                                  onChange={(e) =>
                                    setNewCategoryDescription(e.target.value)
                                  }
                                  placeholder="Description (optional)"
                                  className="category-description-input"
                                />
                              </div>
                              <div className="add-category-buttons">
                                <button
                                  className="save-custom-category-btn"
                                  onClick={handleAddCustomCategory}
                                >
                                  ✅ Add
                                </button>
                                <button
                                  className="cancel-custom-category-btn"
                                  onClick={() => {
                                    setShowAddCategory(false);
                                    setNewCategoryName("");
                                    setNewCategoryDescription("");
                                  }}
                                >
                                  ❌ Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Categories Grid */}
                        <div className="categories-grid">
                          {getAllAvailableCategories().map((category) => {
                            const categoryBudget = getCategoryBudget(
                              category.id
                            );
                            const categoryData = (
                              budgetPlan?.categories || []
                            ).find((cat) => cat.id === category.id);
                            const itemCount = categoryData?.items?.length || 0;
                            const targetYearForCat =
                              categoryCopyYears[category.id] ||
                              selectedYear + 1;

                            return (
                              <div key={category.id} className="category-card">
                                <div className="category-header">
                                  <span className="category-emoji">
                                    {category.emoji}
                                  </span>
                                  <div className="category-info">
                                    <h4 className="category-name">
                                      {category.name}
                                      {category.isCustom && (
                                        <span className="custom-badge">
                                          Custom
                                        </span>
                                      )}
                                    </h4>
                                    <p className="category-description">
                                      {category.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="category-footer">
                                  <div className="category-budget-display">
                                    <span className="budget-label">
                                      Budget:
                                    </span>
                                    <span className="budget-amount">
                                      ${categoryBudget.toLocaleString()}
                                    </span>
                                    {itemCount > 0 && (
                                      <span className="item-count-badge">
                                        {itemCount} item
                                        {itemCount !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </div>

                                  {/* COPY: Category-level controls (only if has items) */}
                                  {itemCount > 0 && (
                                    <div className="copy-category-controls">
                                      <label>
                                        Copy to{" "}
                                        <select
                                          value={targetYearForCat}
                                          onChange={(e) =>
                                            setCategoryCopyYears((prev) => ({
                                              ...prev,
                                              [category.id]: parseInt(
                                                e.target.value
                                              ),
                                            }))
                                          }
                                        >
                                          {getFutureYears().map((y) => (
                                            <option key={y} value={y}>
                                              {y}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <button
                                        className="copy-category-btn"
                                        onClick={() =>
                                          copyWholeCategory(
                                            category.id,
                                            targetYearForCat
                                          )
                                        }
                                      >
                                        ⤴️ Copy Category
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    className="delete-category-btn"
                                    onClick={() =>
                                      handleDeleteCategory(category.id)
                                    }
                                    title="Remove category"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Add Budget Items */}
                    <div className="budget-step">
                      <div className="step-header">
                        <h3>📝 Step 2: Add Budget Items</h3>
                        <p>
                          Add specific items and their budgets within each
                          category. Category budgets are automatically
                          calculated.
                          <br />
                          <em>
                            You can also copy an individual item to a future
                            year using the “Copy” control on each row.
                          </em>
                        </p>
                      </div>

                      <div className="budget-items-section">
                        {getAllAvailableCategories().map((category) => {
                          const categoryData = (
                            budgetPlan?.categories || []
                          ).find((cat) => cat.id === category.id);
                          const categoryItems = categoryData?.items || [];
                          const categoryBudget = getCategoryBudget(category.id);
                          const isExpanded = expandedCategory === category.id;
                          const newItemForm = newItemForms[category.id] || {
                            name: "",
                            budget: "",
                            description: "",
                          };

                          return (
                            <div
                              key={category.id}
                              className="category-items-card"
                            >
                              <div
                                className="category-items-header"
                                onClick={() =>
                                  setExpandedCategory(
                                    isExpanded ? null : category.id
                                  )
                                }
                              >
                                <div className="category-items-info">
                                  <span className="category-emoji">
                                    {category.emoji}
                                  </span>
                                  <div className="category-items-details">
                                    <h4 className="category-items-name">
                                      {category.name}
                                    </h4>
                                    <div className="category-items-budget">
                                      Budget: ${categoryBudget.toLocaleString()}
                                      {categoryItems.length > 0 &&
                                        ` • ${categoryItems.length} item${
                                          categoryItems.length !== 1 ? "s" : ""
                                        }`}
                                    </div>
                                  </div>
                                </div>
                                <span className="expand-icon">
                                  {isExpanded ? "−" : "+"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="category-items-content">
                                  {/* Existing Items */}
                                  {categoryItems.length > 0 && (
                                    <div className="existing-items">
                                      {categoryItems.map((item, itemIndex) => {
                                        const isEditing =
                                          editingItem?.categoryId ===
                                            category.id &&
                                          editingItem?.itemIndex === itemIndex;
                                        const key = `${category.id}:${itemIndex}`;
                                        const itemTargetYear =
                                          itemCopyYears[key] ||
                                          selectedYear + 1;

                                        return (
                                          <div
                                            key={itemIndex}
                                            className="budget-item"
                                          >
                                            {isEditing ? (
                                              <>
                                                <div className="budget-item-edit-form">
                                                  <input
                                                    type="text"
                                                    value={editItemData.name}
                                                    onChange={(e) =>
                                                      setEditItemData(
                                                        (prev) => ({
                                                          ...prev,
                                                          name: e.target.value,
                                                        })
                                                      )
                                                    }
                                                    placeholder="Item name"
                                                    className="edit-item-name-input"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={
                                                      editItemData.description
                                                    }
                                                    onChange={(e) =>
                                                      setEditItemData(
                                                        (prev) => ({
                                                          ...prev,
                                                          description:
                                                            e.target.value,
                                                        })
                                                      )
                                                    }
                                                    placeholder="Description (optional)"
                                                    className="edit-item-description-input"
                                                  />
                                                  <div className="edit-item-budget-input">
                                                    <span className="currency-symbol">
                                                      $
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={
                                                        editItemData.budget
                                                      }
                                                      onChange={(e) =>
                                                        setEditItemData(
                                                          (prev) => ({
                                                            ...prev,
                                                            budget:
                                                              e.target.value,
                                                          })
                                                        )
                                                      }
                                                      placeholder="Budget"
                                                      min="0"
                                                      step="10"
                                                    />
                                                  </div>
                                                </div>
                                                <div className="budget-item-edit-actions">
                                                  <button
                                                    className="save-edit-btn"
                                                    onClick={() =>
                                                      handleSaveEditItem(
                                                        category.id,
                                                        itemIndex
                                                      )
                                                    }
                                                    title="Save changes"
                                                  >
                                                    ✓ Save
                                                  </button>
                                                  <button
                                                    className="cancel-edit-btn"
                                                    onClick={
                                                      handleCancelEditItem
                                                    }
                                                    title="Cancel editing"
                                                  >
                                                    ✕ Cancel
                                                  </button>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="budget-item-info">
                                                  <div className="budget-item-name">
                                                    {item.name}
                                                  </div>
                                                  {item.description && (
                                                    <div className="budget-item-description">
                                                      {item.description}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="budget-item-actions">
                                                  <span className="budget-item-amount">
                                                    $
                                                    {item.budget.toLocaleString()}
                                                  </span>

                                                  {/* COPY: item-level controls */}
                                                  <label className="copy-item-control">
                                                    Copy to{" "}
                                                    <select
                                                      value={itemTargetYear}
                                                      onChange={(e) =>
                                                        setItemCopyYears(
                                                          (prev) => ({
                                                            ...prev,
                                                            [key]: parseInt(
                                                              e.target.value
                                                            ),
                                                          })
                                                        )
                                                      }
                                                    >
                                                      {getFutureYears().map(
                                                        (y) => (
                                                          <option
                                                            key={y}
                                                            value={y}
                                                          >
                                                            {y}
                                                          </option>
                                                        )
                                                      )}
                                                    </select>
                                                  </label>
                                                  <button
                                                    className="copy-item-btn"
                                                    onClick={() =>
                                                      copySingleItem(
                                                        category.id,
                                                        item,
                                                        itemTargetYear
                                                      )
                                                    }
                                                    title="Copy this item to the selected year"
                                                  >
                                                    ⤴️ Copy
                                                  </button>

                                                  <button
                                                    className="edit-item-btn"
                                                    onClick={() =>
                                                      handleStartEditItem(
                                                        category.id,
                                                        itemIndex,
                                                        item
                                                      )
                                                    }
                                                    title="Edit item"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    className="delete-item-btn"
                                                    onClick={() =>
                                                      handleDeleteBudgetItem(
                                                        category.id,
                                                        itemIndex
                                                      )
                                                    }
                                                    title="Delete item"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Add New Item Form */}
                                  <div className="add-item-form">
                                    <div className="add-item-inputs">
                                      <input
                                        type="text"
                                        value={newItemForm.name}
                                        onChange={(e) =>
                                          setNewItemForms((prev) => ({
                                            ...prev,
                                            [category.id]: {
                                              ...newItemForm,
                                              name: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Item name (e.g., Toothpaste, Doctor visit)"
                                        className="item-name-input"
                                      />
                                      <input
                                        type="text"
                                        value={newItemForm.description}
                                        onChange={(e) =>
                                          setNewItemForms((prev) => ({
                                            ...prev,
                                            [category.id]: {
                                              ...newItemForm,
                                              description: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Description (optional)"
                                        className="item-description-input"
                                      />
                                      <div className="item-budget-input">
                                        <span className="currency-symbol">
                                          $
                                        </span>
                                        <input
                                          type="number"
                                          value={newItemForm.budget}
                                          onChange={(e) =>
                                            setNewItemForms((prev) => ({
                                              ...prev,
                                              [category.id]: {
                                                ...newItemForm,
                                                budget: e.target.value,
                                              },
                                            }))
                                          }
                                          placeholder="Budget"
                                          min="0"
                                          step="10"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      className="add-item-btn"
                                      onClick={() =>
                                        handleAddBudgetItem(
                                          category.id,
                                          newItemForm.name,
                                          newItemForm.budget,
                                          newItemForm.description
                                        )
                                      }
                                    >
                                      ➕ Add Item
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Finish Planning Button */}
                    {getTotalYearlyBudget() > 0 && (
                      <div className="finish-planning-section">
                        <button
                          className="finish-planning-btn"
                          onClick={() => {
                            setShowWizard(false);
                            alert(
                              "Budget planning complete! You can now view your budget overview and track spending."
                            );
                          }}
                        >
                          ✅ Finish Planning & View Overview
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
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
        .budget-planning-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }
        .budget-header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }
        .budget-header h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 600;
        }

        .client-selection {
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .client-selection-row {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .client-select-wrapper,
        .year-select-wrapper {
          flex: 0 0 auto;
          min-width: 200px;
        }
        .client-selection label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        .client-selection select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .client-selection select:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .reconfigure-btn {
          padding: 0.75rem 1.25rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .reconfigure-btn:hover {
          background: #4b5563;
          transform: translateY(-1px);
        }
        .copy-tip {
          width: 100%;
          margin-top: 0.75rem;
          color: #374151;
        }

        /* COPY: plan-level controls */
        .copy-plan-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .copy-plan-controls select {
          margin-left: 0.25rem;
        }
        .copy-plan-btn {
          padding: 0.5rem 0.75rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-plan-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .instructions-section {
          padding: 2rem;
          background: #eff6ff;
          border-bottom: 1px solid #dbeafe;
        }
        .instructions-section h3 {
          margin: 0 0 0.75rem 0;
          color: #1e40af;
          font-size: 1.25rem;
        }
        .instructions-section p {
          margin: 0 0 1rem 0;
          color: #1e3a8a;
          line-height: 1.6;
        }
        .instructions-section ol {
          margin: 0;
          padding-left: 1.5rem;
          color: #1e3a8a;
        }
        .instructions-section li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .instructions-copy-note {
          margin-top: 0.75rem;
          color: #1e3a8a;
        }

        .budget-summary-card {
          padding: 1.5rem 2rem;
          background: #f0fdf4;
          border-bottom: 1px solid #d1fae5;
        }
        .summary-row-header h3 {
          margin: 0 0 1rem 0;
          color: #065f46;
          font-size: 1.25rem;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-label {
          color: #047857;
          font-weight: 600;
        }
        .summary-value {
          color: #065f46;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .budget-step {
          padding: 2rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .budget-step:last-child {
          border-bottom: none;
        }
        .step-header h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.5rem;
        }
        .step-header p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .categories-section {
          margin-top: 1.5rem;
        }
        .add-category-section {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: flex-start;
        }
        .add-category-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-category-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .add-category-form {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          width: 100%;
          max-width: 500px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .category-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .category-card:hover {
          border-color: #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }
        .category-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .category-emoji {
          font-size: 1.5rem;
          margin-right: 0.75rem;
          margin-top: 0.25rem;
        }
        .category-info {
          flex: 1;
        }
        .category-name {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .category-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.4;
        }
        .custom-badge {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 12px;
          font-weight: 500;
        }
        .category-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }
        .category-budget-display {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .budget-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .budget-amount {
          font-size: 1.1rem;
          font-weight: 700;
          color: #10b981;
        }
        .item-count-badge {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* COPY: category controls */
        .copy-category-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .copy-category-btn {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-category-btn:hover {
          background: #1d4ed8;
        }

        .delete-category-btn {
          background: #fca5a5;
          color: #991b1b;
          border: 1px solid #f87171;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .delete-category-btn:hover {
          background: #f87171;
          border-color: #ef4444;
          color: #7f1d1d;
          transform: translateY(-1px);
        }

        .budget-items-section {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .category-items-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .category-items-header {
          padding: 1rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }
        .category-items-header:hover {
          background: #f3f4f6;
        }
        .category-items-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .category-items-details {
          flex: 1;
        }
        .category-items-name {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        .category-items-budget {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .expand-icon {
          font-size: 1.2rem;
          font-weight: bold;
          color: #6b7280;
          width: 2rem;
          text-align: center;
        }
        .category-items-content {
          padding: 1rem;
        }
        .existing-items {
          margin-bottom: 1.5rem;
        }
        .budget-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .budget-item:last-child {
          margin-bottom: 0;
        }
        .budget-item-info {
          flex: 1;
          min-width: 200px;
        }
        .budget-item-name {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        .budget-item-description {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .budget-item-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .budget-item-amount {
          font-weight: 600;
          color: #059669;
          font-size: 0.9rem;
        }
        .edit-item-btn {
          background: #3b82f6;
          color: white;
          border: 1px solid #2563eb;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .edit-item-btn:hover {
          background: #2563eb;
          border-color: #1d4ed8;
        }
        .delete-item-btn {
          background: #fca5a5;
          color: #991b1b;
          border: 1px solid #f87171;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .delete-item-btn:hover {
          background: #f87171;
          border-color: #ef4444;
          color: #7f1d1d;
        }

        /* COPY: item controls */
        .copy-item-control select {
          margin-left: 0.25rem;
        }
        .copy-item-btn {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-item-btn:hover {
          background: #1d4ed8;
        }

        .budget-item-edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          width: 100%;
        }
        .edit-item-name-input,
        .edit-item-description-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .edit-item-name-input:focus,
        .edit-item-description-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .edit-item-budget-input {
          position: relative;
          display: flex;
          align-items: center;
        }
        .edit-item-budget-input .currency-symbol {
          position: absolute;
          left: 0.5rem;
          color: #6b7280;
          font-weight: 600;
          z-index: 1;
        }
        .edit-item-budget-input input {
          width: 100%;
          padding: 0.5rem 0.5rem 0.5rem 1.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .edit-item-budget-input input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .budget-item-edit-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          width: 100%;
          justify-content: flex-end;
        }
        .save-edit-btn {
          background: #10b981;
          color: white;
          border: 1px solid #059669;
          border-radius: 4px;
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-edit-btn:hover {
          background: #059669;
          border-color: #047857;
        }
        .cancel-edit-btn {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-edit-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .add-item-form {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
        }
        .add-item-inputs {
          display: grid;
          grid-template-columns: 1.5fr 2fr 150px;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 1024px) {
          .add-item-inputs {
            grid-template-columns: 1fr;
          }
        }
        .item-name-input,
        .item-description-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .item-name-input:focus,
        .item-description-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .item-budget-input {
          position: relative;
          display: flex;
          align-items: center;
        }
        .item-budget-input .currency-symbol {
          position: absolute;
          left: 0.5rem;
          color: #6b7280;
          font-weight: 600;
          z-index: 1;
        }
        .item-budget-input input {
          width: 100%;
          padding: 0.5rem 0.5rem 0.5rem 1.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .item-budget-input input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .add-item-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-item-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .finish-planning-section {
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f8fafc;
          border-top: 2px solid #e5e7eb;
        }
        .finish-planning-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 3rem;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .finish-planning-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .btn {
          background: #10b981;
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          display: inline-block;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background: #059669;
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .budget-header {
            padding: 1.5rem;
          }
          .budget-header h2 {
            font-size: 1.5rem;
          }
          .client-selection,
          .budget-step {
            padding: 1.5rem;
          }
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetPlanningPage;
