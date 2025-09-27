import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab/NavigationTab";
import Budget from "../Budget";
import { useClients } from "../hooks/useClients";

function BudgetPage() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const { clients, loading, error /*, refresh */ } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <h2>Budget Reports</h2>

        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {jwt && me && <Budget.BudgetReporting jwt={jwt} clients={clients} />}
      </div>
    </div>
  );
}

export default BudgetPage;
