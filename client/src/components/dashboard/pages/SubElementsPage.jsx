import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab/NavigationTab";
import CareNeedItems from "../CareNeedItems";
import { useClients } from "../hooks/useClients";

function SubElementsPage() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const { clients, loading, error } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />

      <div className="page-main">
        <h2>Sub-elements</h2>

        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        <CareNeedItems.ReceiptBuckets jwt={jwt} clients={clients} />

        {(me.role === "Family" || me.role === "PoA" || me.role === "Admin") && (
          <CareNeedItems.Create jwt={jwt} clients={clients} />
        )}

        {/* 3) List */}
        <CareNeedItems.List jwt={jwt} clients={clients} />
      </div>
    </div>
  );
}

export default SubElementsPage;
