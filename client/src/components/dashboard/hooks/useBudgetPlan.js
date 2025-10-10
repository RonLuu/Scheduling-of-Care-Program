import React from "react";

// Hook for managing budget plans
export function useBudgetPlan(clientId, year, jwt) {
  const [budgetPlan, setBudgetPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadBudgetPlan = React.useCallback(
    async (signal) => {
      if (!clientId || !year || !jwt) {
        setBudgetPlan(null);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/budget-plans?personId=${encodeURIComponent(clientId)}&year=${encodeURIComponent(year)}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
            signal,
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load budget plan");
        }
        setBudgetPlan(data.budgetPlan || null);
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(e.message || String(e));
          setBudgetPlan(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [clientId, year, jwt]
  );

  const saveBudgetPlan = async (planData) => {
    console.log("saveBudgetPlan called with:", { clientId, year, jwt: !!jwt, planData, budgetPlan });

    if (!clientId || !year || !jwt) {
      const error = `Missing required parameters: clientId=${!!clientId}, year=${!!year}, jwt=${!!jwt}`;
      console.error(error);
      throw new Error(error);
    }

    const requestData = {
      personId: clientId,
      year: year,
      ...planData,
    };

    console.log("Making request:", {
      method: budgetPlan ? "PUT" : "POST",
      url: "/api/budget-plans",
      data: requestData
    });

    const response = await fetch("/api/budget-plans", {
      method: budgetPlan ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestData),
    });

    console.log("Response status:", response.status, response.statusText);

    const data = await response.json();
    console.log("Response data:", data);

    if (!response.ok) {
      const error = data.error || `Failed to save budget plan (${response.status})`;
      console.error("API Error:", error, data);
      throw new Error(error);
    }

    setBudgetPlan(data.budgetPlan);
    return data.budgetPlan;
  };

  React.useEffect(() => {
    const controller = new AbortController();
    loadBudgetPlan(controller.signal);
    return () => controller.abort();
  }, [loadBudgetPlan]);

  return {
    budgetPlan,
    loading,
    error,
    saveBudgetPlan,
    refresh: () => loadBudgetPlan(),
  };
}