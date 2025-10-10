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
  const [year] = React.useState(new Date().getFullYear());
  const [budgetYearType, setBudgetYearType] = React.useState('calendar'); // 'calendar' or 'financial'
  const [budgetPeriod, setBudgetPeriod] = React.useState(null); // Will store { startDate, endDate, label }
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newCategoryDescription, setNewCategoryDescription] = React.useState("");
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState(null);
  const [newItemForms, setNewItemForms] = React.useState({});
  const [tempYearlyBudget, setTempYearlyBudget] = React.useState("");
  const [customCategories, setCustomCategories] = React.useState([]);
  const [deletedCategories, setDeletedCategories] = React.useState([]);
  const [budgetItems, setBudgetItems] = React.useState({});
  // Start with wizard mode by default - will be auto-adjusted based on budget plan completeness
  const [showWizard, setShowWizard] = React.useState(true);
  const [categoriesSaved, setCategoriesSaved] = React.useState(false);
  const [hasLoadedSavedPeriod, setHasLoadedSavedPeriod] = React.useState(false);

  // Use the budget plan hook
  const { budgetPlan, loading: budgetLoading, error: budgetError, saveBudgetPlan } = useBudgetPlan(
    selectedClient?._id,
    year,
    jwt
  );

  // Predefined categories with emojis
  const predefinedCategories = [
    { id: 'health', name: 'Health & Medical', emoji: '🏥', description: 'Doctor visits, medications, medical equipment' },
    { id: 'hygiene', name: 'Hygiene & Personal Care', emoji: '🧴', description: 'Toiletries, bathing aids, grooming supplies' },
    { id: 'clothing', name: 'Clothing & Footwear', emoji: '👕', description: 'Adaptive clothing, shoes, accessories' },
    { id: 'nutrition', name: 'Nutrition & Supplements', emoji: '🥗', description: 'Special diets, vitamins, nutritional support' },
    { id: 'mobility', name: 'Mobility & Equipment', emoji: '♿', description: 'Wheelchairs, walkers, mobility aids' },
    { id: 'activities', name: 'Activities & Entertainment', emoji: '🎨', description: 'Recreation, hobbies, social activities' },
    { id: 'transportation', name: 'Transportation', emoji: '🚗', description: 'Medical transport, vehicle modifications' },
    { id: 'home', name: 'Home Modifications', emoji: '🏠', description: 'Accessibility improvements, safety equipment' }
  ];

  // Reset flag when budgetPlan changes (new client selected or data reloaded)
  React.useEffect(() => {
    setHasLoadedSavedPeriod(false);
  }, [budgetPlan?._id, selectedClient?._id]);

  // Load budget period from saved budget plan - runs ONCE per budgetPlan
  React.useEffect(() => {
    if (budgetPlan?.budgetPeriodStart && budgetPlan?.budgetPeriodEnd && !hasLoadedSavedPeriod) {
      const startDate = new Date(budgetPlan.budgetPeriodStart);
      const endDate = new Date(budgetPlan.budgetPeriodEnd);

      // Determine the budget year type based on the dates
      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();

      let yearType = 'calendar'; // default
      let label = '';

      // Check if it's a financial year (July-June)
      if (startMonth === 6 && endMonth === 5) {
        yearType = 'financial';
        const fyStartYear = startDate.getFullYear();
        const fyEndYear = endDate.getFullYear();
        label = `FY ${fyStartYear}/${fyEndYear}`;
      }
      // Check if it's calendar year (Jan-Dec)
      else if (startMonth === 0 && endMonth === 11) {
        yearType = 'calendar';
        label = `Calendar Year ${startDate.getFullYear()}`;
      }
      // Otherwise it's a rolling period
      else {
        yearType = 'rolling';
        label = `12-Month Period`;
      }

      setBudgetYearType(yearType);
      setBudgetPeriod({ startDate, endDate, label });
      setHasLoadedSavedPeriod(true); // Mark as loaded so this doesn't run again
    }
  }, [budgetPlan?.budgetPeriodStart, budgetPlan?.budgetPeriodEnd, hasLoadedSavedPeriod]);

  // Calculate budget period based on year type - runs when user changes dropdown
  React.useEffect(() => {
    // Skip if we haven't loaded saved data yet (let the load effect run first)
    if (budgetPlan?.budgetPeriodStart && budgetPlan?.budgetPeriodEnd && !hasLoadedSavedPeriod) {
      return;
    }

    const today = new Date();
    let startDate, endDate, label;

    if (budgetYearType === 'calendar') {
      // Calendar year: Jan 1 - Dec 31 of current year
      const currentYear = today.getFullYear();
      startDate = new Date(currentYear, 0, 1); // Jan 1
      endDate = new Date(currentYear, 11, 31); // Dec 31
      label = `Calendar Year ${currentYear}`;
    } else if (budgetYearType === 'financial') {
      // Financial year: July 1 - June 30
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      if (currentMonth >= 6) {
        // After June (July-Dec): This FY is July current year to June next year
        startDate = new Date(currentYear, 6, 1); // July 1 this year
        endDate = new Date(currentYear + 1, 5, 30); // June 30 next year
        label = `FY ${currentYear}/${currentYear + 1}`;
      } else {
        // Before July (Jan-June): This FY is July last year to June this year
        startDate = new Date(currentYear - 1, 6, 1); // July 1 last year
        endDate = new Date(currentYear, 5, 30); // June 30 this year
        label = `FY ${currentYear - 1}/${currentYear}`;
      }
    } else if (budgetYearType === 'rolling') {
      // Rolling 12-month period from today
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1); // 365 days from today
      label = `12-Month Period`;
    }

    setBudgetPeriod({ startDate, endDate, label });
  }, [budgetYearType, hasLoadedSavedPeriod]);

  // Auto-select first client when clients load
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  // Load custom categories and deleted categories from budget plan
  React.useEffect(() => {
    // If no budget plan exists at all, keep existing custom categories (they're local-only)
    // but reset deleted categories
    if (budgetPlan === null || budgetPlan === undefined) {
      // Don't reset customCategories here - they're stored locally until saved
      setDeletedCategories([]);
      return;
    }

    // If budget plan exists but has no categories array yet, keep local custom categories
    if (!budgetPlan.categories || !Array.isArray(budgetPlan.categories)) {
      // Don't reset customCategories here either
      setDeletedCategories([]);
      return;
    }

    // Budget plan exists and has categories array (even if empty)
    // Extract custom categories from budget plan and merge with local ones
    const customCatsFromBackend = budgetPlan.categories.filter(cat => cat.isCustom);

    // IMPORTANT: Merge with existing customCategories to preserve locally-added categories
    // that haven't been saved to the backend yet
    setCustomCategories(prevCustom => {
      // Get IDs of categories from budget plan
      const budgetPlanCustomIds = new Set(customCatsFromBackend.map(cat => cat.id));

      // Keep local custom categories that aren't in the budget plan yet
      const localOnly = prevCustom.filter(cat => !budgetPlanCustomIds.has(cat.id));

      // Combine: budget plan custom categories take precedence, then add local-only ones
      return [...customCatsFromBackend, ...localOnly];
    });

    // Load deleted categories from the budget plan if they exist
    // Only categories that were explicitly marked as deleted in the backend should be hidden
    if (budgetPlan.deletedCategories && Array.isArray(budgetPlan.deletedCategories)) {
      setDeletedCategories(budgetPlan.deletedCategories);
    } else {
      // If no deletedCategories in budget plan, reset to empty (show all predefined categories)
      setDeletedCategories([]);
    }
  }, [budgetPlan]);

  // Track if user manually opened wizard
  // This prevents any automatic closing - ONLY the Finish Planning button should close wizard
  const userOpenedWizard = React.useRef(true);

  const handleSaveYearlyBudget = async () => {
    // Use tempYearlyBudget if user entered something, otherwise use existing budgetPlan.yearlyBudget
    const budgetToSave = tempYearlyBudget || budgetPlan?.yearlyBudget;

    if (!budgetToSave || isNaN(budgetToSave) || parseFloat(budgetToSave) <= 0) {
      alert("Please enter a valid yearly budget amount");
      return;
    }

    try {
      await saveBudgetPlan({
        yearlyBudget: parseFloat(budgetToSave),
        budgetPeriodStart: budgetPeriod?.startDate,
        budgetPeriodEnd: budgetPeriod?.endDate,
        categories: budgetPlan?.categories || [],
        deletedCategories: budgetPlan?.deletedCategories || [],
      });
      alert(`Yearly budget of $${parseFloat(budgetToSave).toLocaleString()} saved!`);
    } catch (error) {
      alert(`Error saving budget: ${error.message}`);
    }
  };

  const handleCategoryBudgetChange = (categoryId, amount) => {
    const updatedCategories = [...(budgetPlan?.categories || [])];
    const existingIndex = updatedCategories.findIndex(cat => cat.id === categoryId);

    if (existingIndex >= 0) {
      updatedCategories[existingIndex] = { ...updatedCategories[existingIndex], budget: parseFloat(amount) || 0 };
    } else {
      // Look in both predefined and custom categories
      const allAvailable = getAllAvailableCategories();
      const categoryData = allAvailable.find(cat => cat.id === categoryId);
      if (categoryData) {
        updatedCategories.push({ ...categoryData, budget: parseFloat(amount) || 0 });
      }
    }

    // Update the backend immediately
    saveBudgetPlan({
      yearlyBudget: budgetPlan?.yearlyBudget || 0,
      categories: updatedCategories,
      deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
    }).catch(error => {
      console.error('Error saving category budget:', error);
    });
  };

  const handleSaveCategories = () => {
    const categories = budgetPlan?.categories || [];
    const totalAllocated = getTotalAllocated();
    const yearlyAmount = budgetPlan?.yearlyBudget || 0;

    if (categories.length === 0) {
      alert("Please allocate budget to at least one category");
      return;
    }

    if (totalAllocated > yearlyAmount) {
      alert(`Total allocated budget ($${totalAllocated.toLocaleString()}) exceeds yearly budget ($${yearlyAmount.toLocaleString()})`);
      return;
    }

    // Enforce full allocation of yearly budget
    if (totalAllocated < yearlyAmount) {
      const remaining = yearlyAmount - totalAllocated;
      alert(
        `You must allocate your entire yearly budget.\n\n` +
        `Yearly Budget: $${yearlyAmount.toLocaleString()}\n` +
        `Allocated to Categories: $${totalAllocated.toLocaleString()}\n` +
        `Remaining: $${remaining.toLocaleString()}\n\n` +
        `Please allocate the remaining $${remaining.toLocaleString()} to categories before saving.`
      );
      return;
    }

    setCategoriesSaved(true);
    alert(`Budget categories saved! Allocated: $${totalAllocated.toLocaleString()} of $${yearlyAmount.toLocaleString()}`);
  };

  const getTotalAllocated = () => {
    return (budgetPlan?.categories || []).reduce((sum, cat) => sum + (parseFloat(cat.budget) || 0), 0);
  };

  const getRemainingBudget = () => {
    return (budgetPlan?.yearlyBudget || 0) - getTotalAllocated();
  };

  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    const newCategory = {
      id: `custom_${Date.now()}`,
      name: newCategoryName.trim(),
      emoji: '📋',
      description: newCategoryDescription.trim() || 'Custom category',
      isCustom: true
    };

    const updatedCustomCategories = [...customCategories, newCategory];
    setCustomCategories(updatedCustomCategories);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setShowAddCategory(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    // If it's a predefined category, add to deleted list IMMEDIATELY (before backend save)
    // This prevents the category from showing in the UI while we wait for the backend
    const predefinedCategory = predefinedCategories.find(cat => cat.id === categoryId);
    let updatedDeletedCategories = deletedCategories;

    if (predefinedCategory) {
      updatedDeletedCategories = [...deletedCategories, categoryId];
      setDeletedCategories(updatedDeletedCategories);
    } else {
      // If it's a custom category, remove from custom categories IMMEDIATELY
      setCustomCategories(prev => prev.filter(cat => cat.id !== categoryId));
    }

    // Remove from backend categories if it has budget allocated
    const updatedCategories = (budgetPlan?.categories || []).filter(cat => cat.id !== categoryId);

    try {
      await saveBudgetPlan({
        yearlyBudget: budgetPlan?.yearlyBudget || 0,
        categories: updatedCategories,
        deletedCategories: updatedDeletedCategories,
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      // Rollback the UI changes if backend save failed
      if (predefinedCategory) {
        setDeletedCategories(prev => prev.filter(id => id !== categoryId));
      } else {
        // Re-add the custom category if save failed
        const categoryToRestore = customCategories.find(cat => cat.id === categoryId);
        if (categoryToRestore) {
          setCustomCategories(prev => [...prev, categoryToRestore]);
        }
      }
    }
  };

  const getAllAvailableCategories = () => {
    const availablePredefined = predefinedCategories.filter(cat => !deletedCategories.includes(cat.id));
    return [...availablePredefined, ...customCategories];
  };

  const handleAddBudgetItem = async (categoryId, itemName, itemBudget, itemDescription = '') => {
    if (!itemName.trim()) {
      alert("Please enter an item name");
      return;
    }

    if (!itemBudget || isNaN(itemBudget) || parseFloat(itemBudget) <= 0) {
      alert("Please enter a valid budget amount");
      return;
    }

    // Check if adding this item would exceed the category budget
    const category = (budgetPlan?.categories || []).find(cat => cat.id === categoryId);
    if (category) {
      const currentItemsTotal = (category.items || []).reduce((sum, item) => sum + (item.budget || 0), 0);
      const newItemBudget = parseFloat(itemBudget);
      const newTotal = currentItemsTotal + newItemBudget;

      if (newTotal > category.budget) {
        alert(
          `Cannot add this item. Total items budget ($${newTotal.toLocaleString()}) would exceed category budget ($${category.budget.toLocaleString()}). ` +
          `Current items total: $${currentItemsTotal.toLocaleString()}, Remaining: $${(category.budget - currentItemsTotal).toLocaleString()}`
        );
        return;
      }
    }

    const newItem = {
      name: itemName.trim(),
      budget: parseFloat(itemBudget),
      description: itemDescription.trim()
    };

    // Update the category with the new item
    const updatedCategories = (budgetPlan?.categories || []).map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [...(cat.items || []), newItem]
        };
      }
      return cat;
    });

    // Set the flag to indicate user is actively working in the wizard
    // This prevents auto-close when adding items
    userOpenedWizard.current = true;

    try {
      await saveBudgetPlan({
        yearlyBudget: budgetPlan?.yearlyBudget || 0,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
      });

      // Clear the form
      setNewItemForms(prev => ({
        ...prev,
        [categoryId]: { name: '', budget: '', description: '' }
      }));
    } catch (error) {
      console.error('Error adding budget item:', error);
    }
  };

  const handleDeleteBudgetItem = async (categoryId, itemIndex) => {
    // Update the category by removing the item at the specified index
    const updatedCategories = (budgetPlan?.categories || []).map(cat => {
      if (cat.id === categoryId) {
        const updatedItems = [...(cat.items || [])];
        updatedItems.splice(itemIndex, 1);
        return {
          ...cat,
          items: updatedItems
        };
      }
      return cat;
    });

    try {
      await saveBudgetPlan({
        yearlyBudget: budgetPlan?.yearlyBudget || 0,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
      });
    } catch (error) {
      console.error('Error deleting budget item:', error);
    }
  };

  const getTotalItemsBudget = () => {
    return (budgetPlan?.categories || []).reduce((total, category) => {
      return total + (category.items || []).reduce((sum, item) => sum + (item.budget || 0), 0);
    }, 0);
  };

  const handleSaveBudgetItems = () => {
    const totalItems = getTotalItemsBudget();
    const totalCategories = getTotalAllocated();

    if (totalItems > totalCategories) {
      alert(`Total items budget ($${totalItems.toLocaleString()}) exceeds total categories budget ($${totalCategories.toLocaleString()})`);
      return;
    }

    // Check for unallocated budget in categories - now enforce full allocation
    const categoriesWithUnallocated = (budgetPlan?.categories || [])
      .filter(cat => cat.budget > 0)
      .map(cat => {
        const itemsTotal = (cat.items || []).reduce((sum, item) => sum + (item.budget || 0), 0);
        const remaining = cat.budget - itemsTotal;
        return { ...cat, remaining };
      })
      .filter(cat => cat.remaining > 0);

    if (categoriesWithUnallocated.length > 0) {
      const totalUnallocated = categoriesWithUnallocated.reduce((sum, cat) => sum + cat.remaining, 0);
      const categoryList = categoriesWithUnallocated
        .map(cat => `  • ${cat.emoji} ${cat.name}: $${cat.remaining.toLocaleString()} remaining`)
        .join('\n');

      alert(
        `You must allocate the entire budget for each category to specific items.\n\n` +
        `Unallocated budget in ${categoriesWithUnallocated.length} ${categoriesWithUnallocated.length === 1 ? 'category' : 'categories'} ($${totalUnallocated.toLocaleString()} total):\n\n` +
        `${categoryList}\n\n` +
        `Please add budget items to fully allocate the remaining amounts before saving.`
      );
      return;
    }

    alert(`Budget items saved! Total items budget: $${totalItems.toLocaleString()}. Your budget plan is complete!`);
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
          <a href="/clients" className="btn">Add Client</a>
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
            <h2>💰 Budget Report</h2>
          </div>

          {/* Client Selection */}
          <div className="client-selection">
            <div className="client-selection-row">
              <div className="client-select-wrapper">
                <label htmlFor="client-select">Showing budget report for:</label>
                <select
                  id="client-select"
                  value={selectedClient?._id || ""}
                  onChange={(e) => {
                    const client = clients.find(c => c._id === e.target.value);
                    setSelectedClient(client);
                    // Reset wizard state when switching clients
                    setShowWizard(false);
                    setCategoriesSaved(false);
                    // Don't reset customCategories and deletedCategories here
                    // They will be updated by the useEffect when budgetPlan changes
                    setNewCategoryName("");
                    setNewCategoryDescription("");
                    setShowAddCategory(false);
                    setBudgetItems({});
                    setExpandedCategory(null);
                    setNewItemForms({});
                    setTempYearlyBudget("");
                    setHasLoadedSavedPeriod(false); // Reset so saved period loads for new client
                  }}
                >
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const isBudgetPlanComplete =
                  budgetPlan?.yearlyBudget &&
                  budgetPlan?.categories?.length > 0 &&
                  budgetPlan?.categories?.some(cat => cat.items && cat.items.length > 0);
                const shouldShowOverview = isBudgetPlanComplete && !showWizard;

                return shouldShowOverview && (
                  <button className="reconfigure-btn" onClick={() => {
                    userOpenedWizard.current = true;
                    setShowWizard(true);
                  }}>
                    ✏️ Edit Budget Plan
                  </button>
                );
              })()}
            </div>
          </div>

          {selectedClient && (
            <>
              {/* Determine if budget plan is complete based on backend data */}
              {(() => {
                // A budget plan is complete if it has:
                // 1. A yearly budget set
                // 2. At least one category with budget allocated
                // 3. At least one category has items (meaning setup was completed)
                const isBudgetPlanComplete =
                  budgetPlan?.yearlyBudget &&
                  budgetPlan?.categories?.length > 0 &&
                  budgetPlan?.categories?.some(cat => cat.items && cat.items.length > 0);

                // Show overview if budget plan is complete AND user hasn't clicked Reconfigure
                const shouldShowOverview = isBudgetPlanComplete && !showWizard;

                return shouldShowOverview ? (
                  // Show comprehensive overview view
                  <BudgetOverviewView
                    budgetPlan={budgetPlan}
                    jwt={jwt}
                    budgetPeriod={budgetPeriod}
                    onReconfigure={() => {
                      userOpenedWizard.current = true;
                      setShowWizard(true);
                    }}
                  />
                ) : (
                // Show 3-step wizard
                <>
              {/* Step 1: Yearly Budget */}
              <div className="budget-step">
                <div className="step-header">
                  <h3>📅 Step 1: Set Yearly Budget</h3>
                  <p>How much do you plan to spend on {selectedClient.name}'s care this year?</p>
                </div>

                <div className="yearly-budget-form">
                  {/* Budget Year Type Selection */}
                  <div className="budget-input-group">
                    <label htmlFor="budget-year-type">Budget Period</label>
                    <select
                      id="budget-year-type"
                      value={budgetYearType}
                      onChange={(e) => setBudgetYearType(e.target.value)}
                      className="year-type-select"
                    >
                      <option value="calendar">Calendar Year (Jan - Dec)</option>
                      <option value="financial">Financial Year (Jul - Jun)</option>
                      <option value="rolling">12 Months Starting from today</option>
                    </select>
                    {budgetPeriod && (
                      <div className="budget-period-info">
                        📆 {budgetPeriod.label}: {budgetPeriod.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {budgetPeriod.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>

                  <div className="budget-input-group">
                    <label htmlFor="yearly-budget">Total Budget for {budgetPeriod?.label || 'Period'}</label>
                    <div className="input-with-currency">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        id="yearly-budget"
                        value={tempYearlyBudget || budgetPlan?.yearlyBudget || ''}
                        onChange={(e) => setTempYearlyBudget(e.target.value)}
                        placeholder="Enter amount (e.g., 25000)"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>

                  <button
                    className="save-budget-btn"
                    onClick={handleSaveYearlyBudget}
                  >
                    Save Yearly Budget
                  </button>

                  {budgetPlan?.yearlyBudget && (
                    <div className="budget-saved-indicator">
                      ✅ Yearly budget saved: ${budgetPlan.yearlyBudget.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Budget Categories */}
              {budgetPlan?.yearlyBudget && (
                <div className="budget-step">
                  <div className="step-header">
                    <h3>📂 Step 2: Budget Categories</h3>
                    <p>Allocate your yearly budget across different care categories for {selectedClient.name}</p>
                  </div>

                  <div className="categories-form">
                    {/* Two Column Layout: Summary + Categories */}
                    <div className="categories-layout">
                      {/* Left: Budget Summary */}
                      <div className="budget-summary-sidebar">
                        <div className="budget-summary">
                          <div className="summary-row">
                            <span>Total Yearly Budget:</span>
                            <span className="budget-amount">${(budgetPlan?.yearlyBudget || 0).toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span>Allocated:</span>
                            <span className="allocated-amount">${getTotalAllocated().toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span>Remaining:</span>
                            <span className={`remaining-amount ${getRemainingBudget() < 0 ? 'over-budget' : ''}`}>
                              ${getRemainingBudget().toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Categories Grid */}
                      <div className="categories-grid-container">
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
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  placeholder="Category name (e.g., Entertainment)"
                                  className="category-name-input"
                                />
                                <input
                                  type="text"
                                  value={newCategoryDescription}
                                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                                  placeholder="Description (optional)"
                                  className="category-description-input"
                                />
                              </div>
                              <div className="add-category-buttons">
                                <button className="save-custom-category-btn" onClick={handleAddCustomCategory}>
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

                        {/* Category Grid */}
                        <div className="categories-grid">
                      {getAllAvailableCategories().map((category) => {
                        const categoryBudget = (budgetPlan?.categories || []).find(cat => cat.id === category.id)?.budget || '';
                        return (
                          <div key={category.id} className="category-card">
                            <div className="category-header">
                              <span className="category-emoji">{category.emoji}</span>
                              <div className="category-info">
                                <h4 className="category-name">
                                  {category.name}
                                  {category.isCustom && <span className="custom-badge">Custom</span>}
                                </h4>
                                <p className="category-description">{category.description}</p>
                              </div>
                            </div>
                            <div className="category-budget-input">
                              <div className="budget-input-row">
                                <div className="input-with-currency">
                                  <span className="currency-symbol">$</span>
                                  <input
                                    type="number"
                                    value={categoryBudget}
                                    onChange={(e) => handleCategoryBudgetChange(category.id, e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="50"
                                  />
                                </div>
                                <button
                                  className="delete-category-btn"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  title="Delete category"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      </div>
                    </div>

                    {/* Save Categories Button */}
                    <div className="save-categories-section">
                      <button
                        className="save-categories-btn"
                        onClick={handleSaveCategories}
                        disabled={(budgetPlan?.categories || []).length === 0}
                      >
                        Save Budget Categories
                      </button>

                      {categoriesSaved && (
                        <div className="categories-saved-indicator">
                          ✅ Budget categories saved! You can now add specific items to each category.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Budget Items */}
              {(budgetPlan?.categories || []).some(cat => cat.budget > 0) && (
                <div className="budget-step">
                  <div className="step-header">
                    <h3>📝 Step 3: Budget Items</h3>
                    <p>Add specific items and their budgets within each category for {selectedClient.name}</p>
                  </div>

                  <div className="budget-items-form">
                    {/* Two Column Layout: Summary + Items */}
                    <div className="items-layout">
                      {/* Left: Items Summary */}
                      <div className="items-summary-sidebar">
                        <div className="items-summary">
                          <div className="summary-row">
                            <span>Total Categories Budget:</span>
                            <span className="budget-amount">${getTotalAllocated().toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span>Total Items Budget:</span>
                            <span className="allocated-amount">${getTotalItemsBudget().toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span>Remaining to Allocate:</span>
                            <span className={`remaining-amount ${(getTotalItemsBudget() - getTotalAllocated()) > 0 ? 'over-budget' : ''}`}>
                              ${(getTotalAllocated() - getTotalItemsBudget()).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Categories with Items */}
                      <div className="categories-items-container">
                        <div className="categories-items-list">
                      {(budgetPlan?.categories || []).filter(cat => cat.budget > 0).map((category) => {
                        const categoryItems = category.items || [];
                        const itemsTotal = categoryItems.reduce((sum, item) => sum + (item.budget || 0), 0);
                        const remaining = category.budget - itemsTotal;
                        const isExpanded = expandedCategory === category.id;
                        const newItemForm = newItemForms[category.id] || { name: '', budget: '', description: '' };

                        return (
                          <div key={category.id} className="category-items-card">
                            <div
                              className="category-items-header"
                              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                            >
                              <div className="category-items-info">
                                <span className="category-emoji">{category.emoji}</span>
                                <div className="category-items-details">
                                  <h4 className="category-items-name">{category.name}</h4>
                                  <div className="category-items-budget">
                                    Budget: ${category.budget.toLocaleString()} |
                                    Items: ${itemsTotal.toLocaleString()} |
                                    Remaining: <span className={remaining < 0 ? 'over-budget' : 'remaining-positive'}>${remaining.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                            </div>

                            {isExpanded && (
                              <div className="category-items-content">
                                {/* Existing Items */}
                                {categoryItems.length > 0 && (
                                  <div className="existing-items">
                                    {categoryItems.map((item, itemIndex) => (
                                      <div key={itemIndex} className="budget-item">
                                        <div className="budget-item-info">
                                          <div className="budget-item-name">{item.name}</div>
                                          <div className="budget-item-description">{item.description}</div>
                                        </div>
                                        <div className="budget-item-actions">
                                          <span className="budget-item-amount">${item.budget.toLocaleString()}</span>
                                          <button
                                            className="delete-item-btn"
                                            onClick={() => handleDeleteBudgetItem(category.id, itemIndex)}
                                            title="Delete item"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add New Item Form */}
                                <div className="add-item-form">
                                  <div className="add-item-inputs">
                                    <input
                                      type="text"
                                      value={newItemForm.name}
                                      onChange={(e) => setNewItemForms(prev => ({
                                        ...prev,
                                        [category.id]: { ...newItemForm, name: e.target.value }
                                      }))}
                                      placeholder="Item name (e.g., Toothpaste, Doctor visit)"
                                      className="item-name-input"
                                    />
                                    <input
                                      type="text"
                                      value={newItemForm.description}
                                      onChange={(e) => setNewItemForms(prev => ({
                                        ...prev,
                                        [category.id]: { ...newItemForm, description: e.target.value }
                                      }))}
                                      placeholder="Description (optional)"
                                      className="item-description-input"
                                    />
                                    <div className="item-budget-input">
                                      <span className="currency-symbol">$</span>
                                      <input
                                        type="number"
                                        value={newItemForm.budget}
                                        onChange={(e) => setNewItemForms(prev => ({
                                          ...prev,
                                          [category.id]: { ...newItemForm, budget: e.target.value }
                                        }))}
                                        placeholder="Budget amount"
                                        min="0"
                                        step="10"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    className="add-item-btn"
                                    onClick={() => handleAddBudgetItem(
                                      category.id,
                                      newItemForm.name,
                                      newItemForm.budget,
                                      newItemForm.description
                                    )}
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
                    </div>

                    {/* Save Budget Items Button */}
                    <div className="save-items-section">
                      <button
                        className="save-items-btn"
                        onClick={handleSaveBudgetItems}
                      >
                        Save Budget Items
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Finish Planning Button - Show after both steps are visible */}
              {budgetPlan?.yearlyBudget && (budgetPlan?.categories || []).some(cat => cat.budget > 0) && (
                <div className="finish-planning-section">
                  <button
                    className="finish-planning-btn"
                    onClick={() => {
                      // Reset the flag to allow auto-switch to overview mode
                      userOpenedWizard.current = false;
                      // Close the wizard to show overview
                      setShowWizard(false);
                      alert('Budget planning complete! You can now view your budget overview and track spending.');
                    }}
                  >
                    ✅ Finish Planning
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
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
        }

        .budget-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
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
        }

        .client-select-wrapper {
          flex: 0 0 auto;
          width: 400px;
          max-width: 100%;
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

        .yearly-budget-form {
          margin-top: 1.5rem;
          max-width: 600px;
        }

        .budget-input-group {
          margin-bottom: 1.5rem;
        }

        .budget-input-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .year-type-select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 1rem;
          transition: border-color 0.2s;
          cursor: pointer;
        }

        .year-type-select:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .budget-period-info {
          margin-top: 0.75rem;
          padding: 0.75rem 1rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          border-radius: 6px;
          color: #065f46;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .input-with-currency {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 1rem;
          color: #6b7280;
          font-weight: 600;
          z-index: 1;
        }

        .input-with-currency input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2rem;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .input-with-currency input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .save-budget-btn {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-budget-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .budget-saved-indicator {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          color: #065f46;
          font-weight: 500;
        }

        .categories-form {
          margin-top: 1.5rem;
        }

        .categories-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .categories-layout {
            grid-template-columns: 1fr;
          }
        }

        .budget-summary-sidebar {
          position: sticky;
          top: 2rem;
          align-self: start;
        }

        .budget-summary {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .summary-row:last-child {
          margin-bottom: 0;
          margin-top: 1rem;
          padding-top: 1.25rem;
          border-top: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 1.1rem;
        }

        @media (min-width: 768px) {
          .budget-summary .summary-row {
            padding: 0 1rem;
          }
        }

        .budget-amount {
          color: #374151;
          font-weight: 600;
        }

        .allocated-amount {
          color: #10b981;
          font-weight: 600;
        }

        .remaining-amount {
          color: #10b981;
          font-weight: 600;
        }

        .remaining-amount.over-budget {
          color: #dc2626;
        }

        .categories-grid-container {
          flex: 1;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }

        .category-card:hover {
          border-color: #10b981;
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
        }

        .category-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .category-budget-input {
          margin-top: 1rem;
        }

        .category-budget-input .input-with-currency {
          max-width: 150px;
        }

        .category-budget-input input {
          font-size: 0.9rem;
          padding: 0.5rem 0.75rem 0.5rem 1.75rem;
        }

        .save-categories-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .save-categories-btn {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-categories-btn:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }

        .save-categories-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .categories-saved-indicator {
          padding: 0.75rem 1.5rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          color: #065f46;
          font-weight: 500;
          text-align: center;
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
          border: 2px dashed #3b82f6;
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

        .add-category-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .category-name-input,
        .category-description-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .category-name-input:focus,
        .category-description-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .add-category-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .save-custom-category-btn,
        .cancel-custom-category-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-custom-category-btn {
          background: #10b981;
          color: white;
        }

        .save-custom-category-btn:hover {
          background: #059669;
        }

        .cancel-custom-category-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .cancel-custom-category-btn:hover {
          background: #e5e7eb;
        }

        .category-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          transition: border-color 0.2s;
        }

        .category-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .budget-input-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
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

        .custom-badge {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 12px;
          margin-left: 0.5rem;
          font-weight: 500;
        }

        .budget-items-form {
          margin-top: 1.5rem;
        }

        .items-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .items-layout {
            grid-template-columns: 1fr;
          }
        }

        .items-summary-sidebar {
          position: sticky;
          top: 2rem;
          align-self: start;
        }

        .items-summary {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 1.5rem;
        }

        @media (min-width: 768px) {
          .items-summary .summary-row {
            padding: 0 1rem;
          }
        }

        .categories-items-container {
          flex: 1;
        }

        .remaining-positive {
          color: #10b981;
          font-weight: 600;
        }

        .categories-items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .category-items-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 1rem;
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
        }

        .budget-item:last-child {
          margin-bottom: 0;
        }

        .budget-item-info {
          flex: 1;
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
          gap: 0.75rem;
        }

        .budget-item-amount {
          font-weight: 600;
          color: #059669;
          font-size: 0.9rem;
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

        .add-item-form {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
        }

        .add-item-inputs {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        @media (min-width: 1024px) {
          .add-item-inputs {
            grid-template-columns: 1.5fr 2fr 150px;
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
          align-self: start;
        }

        .add-item-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .save-items-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .save-items-btn {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-items-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .items-saved-indicator {
          padding: 0.75rem 1.5rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          color: #065f46;
          font-weight: 500;
          text-align: center;
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
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .finish-planning-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .finish-planning-btn:active {
          transform: translateY(0);
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

          .client-selection, .budget-step {
            padding: 1.5rem;
          }

          .categories-grid {
            grid-template-columns: 1fr;
          }

          .finish-planning-btn {
            padding: 0.875rem 2rem;
            font-size: 1rem;
          }

          .category-budget-input .input-with-currency {
            max-width: 120px;
          }

          .save-categories-btn {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }

          .add-category-form {
            padding: 0.75rem;
          }

          .add-category-btn {
            padding: 0.6rem 1.2rem;
            font-size: 0.85rem;
          }

          .budget-input-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }

          .delete-category-btn {
            padding: 0.4rem 0.6rem;
            font-size: 0.75rem;
          }

          .add-item-inputs {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .category-items-header {
            padding: 0.75rem;
          }

          .category-items-content {
            padding: 0.75rem;
          }

          .budget-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .budget-item-actions {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetPlanningPage;
