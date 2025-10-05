import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import CareTasks from "../CareTasks";
import { useClients } from "../hooks/useClients";

function TasksPage() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const { clients, loading, error } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <h2>Tasks</h2>

        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {jwt && me && <CareTasks jwt={jwt} clients={clients} />}
      </div>
    </div>
  );
}

export default TasksPage;
