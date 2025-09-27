import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab/NavigationTab";
import ClientManagement from "../ClientManagement";
import { useClients } from "../hooks/useClients";

function ClientsPage() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error, refresh } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        {(me?.role === "Family" || me?.role === "PoA") && (
          <ClientManagement.AddClient me={me} jwt={jwt} setClients={refresh} />
        )}
        <ClientManagement.ClientList clients={clients} />
        {(me?.role === "Admin" ||
          me?.role === "Family" ||
          me?.role === "PoA") && (
          <ClientManagement.AccessControl me={me} jwt={jwt} clients={clients} />
        )}
        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      </div>
    </div>
  );
}

export default ClientsPage;
