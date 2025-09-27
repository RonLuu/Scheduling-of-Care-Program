import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab/NavigationTab";
import ShiftScheduler from "../Shift/ShiftScheduler";
import { useClients } from "../hooks/useClients";

function ShiftPage() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  // Load all clients linked to the current user (with relationshipType merged in)
  const { clients, loading, error } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />

      <div className="page-main">
        <h2>Shift Allocation</h2>

        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {jwt && me && <ShiftScheduler jwt={jwt} me={me} clients={clients} />}
      </div>
    </div>
  );
}

export default ShiftPage;
