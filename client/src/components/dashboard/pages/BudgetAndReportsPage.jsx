import React from "react";
import { useNavigate } from "react-router-dom";
import NavigationTab from "../../NavigationTab";
import useAuth from "../hooks/useAuth";
import { useClients } from "../hooks/useClients";
import { useBudgetPlan } from "../hooks/useBudgetPlan";
import BudgetOverviewView from "./BudgetOverviewView";
import {
  BiDollarCircle,
  BiPlusCircle,
  BiFirstAid,
  BiSpa,
  BiCloset,
  BiDish,
  BiAccessibility,
  BiPalette,
  BiCar,
  BiHome,
  BiClipboard,
  BiPencil,
  BiCopy,
  BiBulb,
  BiFolder,
  BiPlus,
  BiCheck,
  BiX,
  BiEdit,
  BiDotsVerticalRounded,
  BiTrash,
  BiCheckCircle,
  BiCalendarPlus,
} from "react-icons/bi";

function BudgetPlanningPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
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
  const [editingItem, setEditingItem] = React.useState(null);
  const [editItemData, setEditItemData] = React.useState({
    name: "",
    budget: "",
    description: "",
  });
  const [openActionMenu, setOpenActionMenu] = React.useState(null);

  const nextYearDefault = selectedYear + 1;
  const [planCopyYear, setPlanCopyYear] = React.useState(nextYearDefault);
  const [categoryCopyYears, setCategoryCopyYears] = React.useState({});
  const [itemCopyYears, setItemCopyYears] = React.useState({});

  const {
    budgetPlan,
    loading: budgetLoading,
    error: budgetError,
    saveBudgetPlan,
    refresh,
  } = useBudgetPlan(selectedClient?._id, selectedYear, jwt);

  // Check if budget plan is complete
  const isBudgetPlanComplete = React.useMemo(() => {
    return (
      budgetPlan?.yearlyBudget &&
      budgetPlan?.categories?.length > 0 &&
      budgetPlan?.categories?.some((cat) => cat.items && cat.items.length > 0)
    );
  }, [budgetPlan]);

  // Initialize showWizard - only set on first load
  const [showWizard, setShowWizard] = React.useState(true);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Only auto-switch to overview on initial load if budget is complete
  React.useEffect(() => {
    if (budgetPlan !== null && budgetPlan !== undefined && !hasInitialized) {
      setShowWizard(!isBudgetPlanComplete);
      setHasInitialized(true);
    }
  }, [budgetPlan, isBudgetPlanComplete, hasInitialized]);

  React.useEffect(() => {
    setPlanCopyYear(selectedYear + 1);
    setCategoryCopyYears({});
    setItemCopyYears({});
    setHasInitialized(false); // Reset initialization when year changes
  }, [selectedYear]);

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

  const budgetPeriod = React.useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const label = `Calendar Year ${selectedYear}`;
    return { startDate, endDate, label };
  }, [selectedYear]);

  React.useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  React.useEffect(() => {
    if (budgetPlan === null || budgetPlan === undefined) {
      setDeletedCategories([]);
      return;
    }
    if (!budgetPlan.categories || !Array.isArray(budgetPlan.categories)) {
      setDeletedCategories([]);
      return;
    }
    const customCatsFromBackend = budgetPlan.categories
      .filter((cat) => cat.isCustom)
      .map((cat) => ({
        ...cat,
        // Ensure emoji is always the BiClipboard component, not a string
        emoji: BiClipboard,
      }));
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
      emoji: BiClipboard,
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
    // Get the item being deleted
    const category = (budgetPlan?.categories || []).find(
      (cat) => cat.id === categoryId
    );
    const itemToDelete = category?.items?.[itemIndex];

    if (!itemToDelete) {
      alert("Item not found");
      return;
    }

    const itemId = itemToDelete._id;
    const itemName = itemToDelete.name;

    try {
      // Find all tasks associated with this budget item in the current year
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      // Get all tasks for this person in the selected year
      const tasksResponse = await fetch(
        `/api/care-tasks/client/${selectedClient._id}`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      let taskCount = 0;
      if (tasksResponse.ok) {
        const allTasks = await tasksResponse.json();

        // Filter tasks that match this budget item and are in the selected year
        const tasksToDelete = allTasks.filter((task) => {
          const taskDate = new Date(task.dueDate);
          return (
            task.budgetCategoryId === categoryId &&
            String(task.budgetItemId) === String(itemId) &&
            taskDate >= yearStart &&
            taskDate <= yearEnd
          );
        });
        console.log("Task to delete: ", tasksToDelete);

        taskCount = tasksToDelete.length;

        // Show confirmation with task count
        const confirmMessage =
          taskCount > 0
            ? `Delete "${itemName}"?\n\nThis will also delete ${taskCount} associated task${
                taskCount !== 1 ? "s" : ""
              } in ${selectedYear}.`
            : `Delete "${itemName}"?`;

        if (!confirm(confirmMessage)) {
          return;
        }

        // Delete each task
        if (tasksToDelete.length > 0) {
          const deleteResults = await Promise.allSettled(
            tasksToDelete.map((task) =>
              fetch(`/api/care-tasks/${task._id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwt}` },
              })
            )
          );

          // Check if any deletions failed
          const failedDeletions = deleteResults.filter(
            (result) =>
              result.status === "rejected" ||
              (result.status === "fulfilled" && !result.value.ok)
          );

          if (failedDeletions.length > 0) {
            console.error("Some task deletions failed:", failedDeletions);
            throw new Error(
              `Failed to delete ${failedDeletions.length} task(s)`
            );
          }

          console.log(`Deleted ${tasksToDelete.length} associated task(s)`);
        }
      }

      // Now delete the budget item
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

      await saveBudgetPlan({
        yearlyBudget,
        categories: updatedCategories,
        deletedCategories: budgetPlan?.deletedCategories || deletedCategories,
        budgetPeriodStart: budgetPeriod.startDate,
        budgetPeriodEnd: budgetPeriod.endDate,
      });

      // Success message with task count
      if (taskCount > 0) {
        alert(
          `Successfully deleted "${itemName}" and ${taskCount} associated task${
            taskCount !== 1 ? "s" : ""
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting budget item:", error);
      alert(
        `Failed to delete item: ${
          error.message || "Unknown error"
        }. Please try again.`
      );
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

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  const getFutureYears = () => {
    const years = [];
    for (let y = selectedYear + 1; y <= selectedYear + 10; y++) years.push(y);
    return years;
  };

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
        `Copied "${item.name}" to ${targetYear} in "${srcCategoryMeta.name}".`
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
        `Copied category "${src.name}" (${src.items.length} item${
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

  const shouldShowOverview = isBudgetPlanComplete && !showWizard;

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="budget-planning-container">
          <div className="budget-header">
            <h2>Budget Planning</h2>
          </div>

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
                    setHasInitialized(false); // Reset initialization when client changes
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
                <label htmlFor="year-select">Year:</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {getYearOptions().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shouldShowOverview && (
              <div className="action-buttons-group">
                <button
                  className="reconfigure-btn"
                  onClick={() => setShowWizard(true)}
                >
                  <BiPencil /> Edit Budget
                </button>
                <button
                  className="plan-future-btn"
                  onClick={() => {
                    console.log('Plan for Future Years clicked');
                    console.log('selectedClient:', selectedClient);
                    console.log('selectedYear:', selectedYear);
                    console.log('budgetPlan:', budgetPlan);

                    if (!selectedClient?._id || !budgetPlan) {
                      alert('Missing required data. Please try again.');
                      return;
                    }

                    navigate('/budget-planning/plan-future', {
                      state: {
                        clientId: selectedClient._id,
                        sourceYear: selectedYear,
                        budgetPlan
                      }
                    });
                  }}
                >
                  <BiCalendarPlus /> Plan for Future Years
                </button>
              </div>
            )}
          </div>

          {selectedClient && (
            <>
              {shouldShowOverview ? (
                <BudgetOverviewView
                  budgetPlan={budgetPlan}
                  jwt={jwt}
                  budgetPeriod={budgetPeriod}
                  onReconfigure={() => setShowWizard(true)}
                />
              ) : (
                <>
                  <div className="instructions-section">
                    <h2>Set Up Your Budget Plan</h2>
                    <ol>
                      <li>Select budget categories (or add custom ones)</li>
                      <li>Add items with budgets to each category</li>
                      <li>Use copy controls to plan for future years</li>
                    </ol>
                  </div>

                  <div className="budget-summary-card">
                    <h3>Budget Summary for {selectedYear}</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Total Budget:</span>
                        <span className="summary-value">
                          ${getTotalYearlyBudget().toLocaleString()}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Period:</span>
                        <span className="summary-value">
                          {budgetPeriod.startDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
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

                  <div className="budget-step">
                    <div className="step-header">
                      <h3>Step 1: Select Categories</h3>
                    </div>

                    <div className="categories-section">
                      <div className="add-category-section">
                        {!showAddCategory ? (
                          <button
                            className="add-category-btn"
                            onClick={() => setShowAddCategory(true)}
                          >
                            <BiPlus /> Add Custom Category
                          </button>
                        ) : (
                          <div className="add-category-form">
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              placeholder="Category name"
                              className="category-input"
                            />
                            <input
                              type="text"
                              value={newCategoryDescription}
                              onChange={(e) =>
                                setNewCategoryDescription(e.target.value)
                              }
                              placeholder="Description (optional)"
                              className="category-input"
                            />
                            <div className="form-actions">
                              <button
                                className="btn-save"
                                onClick={handleAddCustomCategory}
                              >
                                <BiCheck />
                              </button>
                              <button
                                className="btn-cancel"
                                onClick={() => {
                                  setShowAddCategory(false);
                                  setNewCategoryName("");
                                  setNewCategoryDescription("");
                                }}
                              >
                                <BiX />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="categories-grid">
                        {getAllAvailableCategories().map((category) => {
                          const categoryBudget = getCategoryBudget(category.id);
                          const categoryData = (
                            budgetPlan?.categories || []
                          ).find((cat) => cat.id === category.id);
                          const itemCount = categoryData?.items?.length || 0;
                          const targetYearForCat =
                            categoryCopyYears[category.id] || selectedYear + 1;

                          return (
                            <div key={category.id} className="category-card">
                              <div className="category-header">
                                <span className="category-emoji">
                                  {typeof category.emoji === 'string' ? category.emoji : <category.emoji />}
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
                                  <span className="budget-amount">
                                    ${categoryBudget.toLocaleString()}
                                  </span>
                                  {itemCount > 0 && (
                                    <span className="item-count">
                                      {itemCount} item
                                      {itemCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>

                                <div className="category-actions">
                                  {itemCount > 0 && (
                                    <div className="copy-controls">
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
                                        className="year-copy-select-sm"
                                      >
                                        {getFutureYears().map((y) => (
                                          <option key={y} value={y}>
                                            {y}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="copy-btn-sm"
                                        onClick={() =>
                                          copyWholeCategory(
                                            category.id,
                                            targetYearForCat
                                          )
                                        }
                                        title="Copy all items to selected year"
                                      >
                                        <BiCopy />
                                      </button>
                                    </div>
                                  )}
                                  {itemCount === 0 && (
                                    <button
                                      className="delete-category-btn"
                                      onClick={() =>
                                        handleDeleteCategory(category.id)
                                      }
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="budget-step">
                    <div className="step-header">
                      <h3>Step 2: Add Budget Items</h3>
                      <p className="step-description">
                        Add items with budgets. Use the three-dot menu for
                        copy/edit/delete actions.
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
                                  {typeof category.emoji === 'string' ? category.emoji : <category.emoji />}
                                </span>
                                <div>
                                  <h4>{category.name}</h4>
                                  <div className="category-meta">
                                    ${categoryBudget.toLocaleString()}
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
                                {categoryItems.length > 0 && (
                                  <div className="existing-items">
                                    {categoryItems.map((item, itemIndex) => {
                                      const isEditing =
                                        editingItem?.categoryId ===
                                          category.id &&
                                        editingItem?.itemIndex === itemIndex;
                                      const key = `${category.id}:${itemIndex}`;
                                      const itemTargetYear =
                                        itemCopyYears[key] || selectedYear + 1;
                                      const isMenuOpen = openActionMenu === key;

                                      return (
                                        <div
                                          key={itemIndex}
                                          className="budget-item"
                                        >
                                          {isEditing ? (
                                            <>
                                              <div className="edit-form">
                                                <input
                                                  type="text"
                                                  value={editItemData.name}
                                                  onChange={(e) =>
                                                    setEditItemData((prev) => ({
                                                      ...prev,
                                                      name: e.target.value,
                                                    }))
                                                  }
                                                  placeholder="Item name"
                                                  className="edit-input"
                                                />
                                                <input
                                                  type="text"
                                                  value={
                                                    editItemData.description
                                                  }
                                                  onChange={(e) =>
                                                    setEditItemData((prev) => ({
                                                      ...prev,
                                                      description:
                                                        e.target.value,
                                                    }))
                                                  }
                                                  placeholder="Description"
                                                  className="edit-input"
                                                />
                                                <div className="budget-input-wrapper">
                                                  <span>$</span>
                                                  <input
                                                    type="number"
                                                    value={editItemData.budget}
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
                                                    className="edit-input"
                                                  />
                                                </div>
                                              </div>
                                              <div className="edit-actions">
                                                <button
                                                  className="btn-save"
                                                  onClick={() =>
                                                    handleSaveEditItem(
                                                      category.id,
                                                      itemIndex
                                                    )
                                                  }
                                                >
                                                  <BiCheck /> Save
                                                </button>
                                                <button
                                                  className="btn-cancel"
                                                  onClick={handleCancelEditItem}
                                                >
                                                  <BiX /> Cancel
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <div className="item-info">
                                                <div className="item-name">
                                                  {item.name}
                                                </div>
                                                {item.description && (
                                                  <div className="item-description">
                                                    {item.description}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="item-actions">
                                                <span className="item-budget">
                                                  $
                                                  {item.budget.toLocaleString()}
                                                </span>
                                                <div className="action-menu-container">
                                                  <button
                                                    className="action-menu-btn"
                                                    onClick={() =>
                                                      setOpenActionMenu(
                                                        isMenuOpen ? null : key
                                                      )
                                                    }
                                                  >
                                                    <BiDotsVerticalRounded />
                                                  </button>
                                                  {isMenuOpen && (
                                                    <div className="action-menu">
                                                      <div className="copy-section">
                                                        <label>Copy to:</label>
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
                                                          className="year-select-menu"
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
                                                        <button
                                                          className="menu-item copy"
                                                          onClick={() => {
                                                            copySingleItem(
                                                              category.id,
                                                              item,
                                                              itemTargetYear
                                                            );
                                                            setOpenActionMenu(
                                                              null
                                                            );
                                                          }}
                                                        >
                                                          <BiCopy /> Copy
                                                        </button>
                                                      </div>
                                                      <button
                                                        className="menu-item edit"
                                                        onClick={() => {
                                                          handleStartEditItem(
                                                            category.id,
                                                            itemIndex,
                                                            item
                                                          );
                                                          setOpenActionMenu(
                                                            null
                                                          );
                                                        }}
                                                      >
                                                        <BiPencil /> Edit
                                                      </button>
                                                      <button
                                                        className="menu-item delete"
                                                        onClick={() => {
                                                          if (
                                                            confirm(
                                                              `Delete "${item.name}"?`
                                                            )
                                                          ) {
                                                            handleDeleteBudgetItem(
                                                              category.id,
                                                              itemIndex
                                                            );
                                                          }
                                                          setOpenActionMenu(
                                                            null
                                                          );
                                                        }}
                                                      >
                                                        <BiTrash /> Delete
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="add-item-form">
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
                                    placeholder="Item name"
                                    className="item-input"
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
                                    className="item-input"
                                  />
                                  <div className="budget-input-wrapper">
                                    <span>$</span>
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
                                      className="item-input"
                                    />
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
                                    <BiPlus /> Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {getTotalYearlyBudget() > 0 && (
                    <div className="finish-section">
                      <button
                        className="finish-btn"
                        onClick={() => {
                          setShowWizard(false);
                          alert("Budget plan complete! View your overview.");
                        }}
                      >
                        <BiCheckCircle /> Finish & View Overview
                      </button>
                    </div>
                  )}
                </>
              )}
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
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .budget-planning-container {
          background: white;
          width: 1000px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }
        .budget-header {
          background: #8189d2;
          color: white;
          padding: 2rem 2.5rem;
          text-align: left;
        }
        .budget-header h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 600;
          color: white;
          text-align: left;
          font-family: "Inter", sans-serif;
        }

        .client-selection {
          padding: 2rem 2.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .client-selection-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .client-select-wrapper,
        .year-select-wrapper {
          min-width: 180px;
        }
        .client-selection label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .client-selection select {
          width: 100%;
          padding: 0.625rem;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.95rem;
        }
        .client-selection select:focus {
          outline: none;
          border-color: #10b981;
        }
        .action-buttons-group {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-top: 1rem;
        }
        .reconfigure-btn {
          padding: 0.625rem 1rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .reconfigure-btn:hover {
          background: #4b5563;
        }
        .plan-future-btn {
          padding: 0.625rem 1rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .plan-future-btn:hover {
          background: #6b73c1;
        }

        .copy-plan-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .year-copy-select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
        }
        .copy-btn {
          padding: 0.5rem 0.75rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.5rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .copy-btn:hover {
          background: #1d4ed8;
        }
        .copy-hint {
          margin: 0.75rem 0 0 0;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .instructions-section {
          padding: 2rem 2.5rem;
          background: #eff6ff;
          border-bottom: 1px solid #dbeafe;
        }
        .instructions-section h3 {
          margin: 0 0 0.75rem 0;
          color: #1e40af;
          font-size: 1.1rem;
        }
        .instructions-section ol {
          margin: 0;
          padding-left: 1.5rem;
          color: #1e3a8a;
        }
        .instructions-section li {
          margin-bottom: 0.375rem;
        }

        .budget-summary-card {
          padding: 2rem 2.5rem;
          background: #f0fdf4;
          border-bottom: 1px solid #d1fae5;
        }
        .budget-summary-card h3 {
          margin: 0 0 1rem 0;
          color: #065f46;
          font-size: 1.1rem;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
          font-size: 0.875rem;
        }
        .summary-value {
          color: #065f46;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .budget-step {
          padding: 2.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .step-header h3 {
          margin: 0 0 0.25rem 0;
          color: #374151;
          font-size: 1.25rem;
        }
        .step-description {
          margin: 0.25rem 0 0 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .header-icon {
          margin-right: 0.5rem;
          vertical-align: middle;
        }

        .category-emoji svg {
          width: 1.5em;
          height: 1.5em;
          color: #667eea;
        }

        .categories-section {
          margin-top: 1.5rem;
        }
        .add-category-section {
          margin-bottom: 1.25rem;
        }
        .add-category-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .add-category-btn:hover {
          background: #2563eb;
        }
        .add-category-form {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .category-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          flex: 1;
          min-width: 150px;
        }
        .form-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-save {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-save:hover {
          background: #059669;
        }
        .btn-cancel {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .category-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
        }
        .category-card:hover {
          border-color: #10b981;
        }
        .category-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .category-emoji {
          font-size: 1.5rem;
        }
        .category-info {
          flex: 1;
        }
        .category-name {
          margin: 0 0 0.25rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .category-description {
          margin: 0;
          font-size: 0.8rem;
          color: #6b7280;
        }
        .custom-badge {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 10px;
        }
        .category-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
          gap: 0.5rem;
        }
        .category-budget-display {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .budget-amount {
          font-size: 1rem;
          font-weight: 700;
          color: #10b981;
        }
        .item-count {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .category-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .copy-controls {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .year-copy-select-sm {
          padding: 0.25rem 0.375rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.75rem;
          background: white;
        }
        .copy-btn-sm {
          padding: 0.25rem 0.5rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.7rem !important;
          cursor: pointer;
        }
        .copy-btn-sm:hover {
          background: #1d4ed8;
        }
        .delete-category-btn {
          background: #fca5a5;
          color: #991b1b !important;
          border: 1px solid #f87171;
          border-radius: 4px;
          padding: 0.375rem 0.625rem;
          font-size: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }
        .delete-category-btn:hover {
          background: #f87171;
        }

        .budget-items-section {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow: visible;
        }
        .category-items-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: visible;
        }
        .category-items-header {
          padding: 1.125rem 1.25rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }
        .category-items-header:hover {
          background: #f3f4f6;
        }
        .category-items-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .category-items-info h4 {
          margin: 0 0 0.125rem 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .category-meta {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .expand-icon {
          font-size: 1.2rem;
          font-weight: bold;
          color: #6b7280;
        }
        .category-items-content {
          padding: 1.25rem;
          overflow: visible;
        }
        .existing-items {
          margin-bottom: 1.25rem;
          overflow: visible;
        }
        .budget-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          margin-bottom: 0.75rem;
          gap: 1rem;
        }
        .item-info {
          flex: 1;
        }
        .item-name {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }
        .item-description {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }
        .item-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .item-budget {
          font-weight: 600;
          color: #059669;
          font-size: 0.9rem;
        }
        .action-menu-container {
          position: relative;
        }
        .action-menu-btn {
          background: #e5e7eb;
          color: #374151 !important;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px 25px 10px !important;
        }
        .action-menu-btn:hover {
          background: #d1d5db;
        }
        .action-menu {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 0.375rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          min-width: 200px;
          padding: 0.5rem;
          max-height: 320px;
          overflow-y: auto;
        }
        .copy-section {
          padding: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 0.25rem;
        }
        .copy-section label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.375rem;
        }
        .year-select-menu {
          width: 100%;
          padding: 0.375rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.8rem;
          margin-bottom: 0.375rem;
        }
        .menu-item {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 4px;
        }
        .menu-item:hover {
          background: #f3f4f6;
        }
        .menu-item.copy {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .menu-item.copy:hover {
          background: #dbeafe;
        }
        .menu-item.edit {
          color: #374151;
        }
        .menu-item.delete {
          color: #dc2626;
        }
        .menu-item.delete:hover {
          background: #fef2f2;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .edit-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .budget-input-wrapper {
          position: relative;
        }
        .budget-input-wrapper span {
          position: absolute;
          left: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          font-weight: 600;
        }
        .budget-input-wrapper input {
          padding-left: 1.5rem;
        }
        .edit-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .add-item-form {
          background: #f8fafc;
          max-width: 1000px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 1rem;
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr;
          gap: 0.75rem;
          align-items: center;
        }
        .item-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .add-item-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .add-item-btn:hover {
          background: #2563eb;
        }

        .finish-section {
          padding: 2rem;
          display: flex;
          justify-content: center;
          background: #f8fafc;
        }
        .finish-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .finish-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        @media (max-width: 1024px) {
          .add-item-form {
            grid-template-columns: 1fr 1fr;
          }
          .add-item-form .item-input:first-child {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 768px) {
          .client-selection-row {
            flex-direction: column;
            align-items: stretch;
          }
          .categories-grid {
            grid-template-columns: 1fr;
          }
          .add-item-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetPlanningPage;
