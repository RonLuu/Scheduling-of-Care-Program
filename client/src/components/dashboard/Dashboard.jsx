import React from "react";
import { useAuth } from "../../AuthContext";
import UserProfile from "./UserProfile";
import OrganizationManagement from "./OrganizationManagement";
import AccessManagement from "./AccessManagement";
import ClientManagement from "./ClientManagement";
import CareNeedItems from "./CareNeedItems";
import TasksPanel from "./TasksPanel";
import BudgetReporting from "./BudgetReporting";


function Dashboard() {
  const {me, setMe} = useAuth();
  const jwt = localStorage.getItem("jwt");
  const organizationId = me?.organizationId;
  const [clients, setClients] = React.useState([]);

  function logout() {
    localStorage.removeItem("jwt");
    setMe(null);
  }

  async function refreshMe() {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return setMe(null);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
  }
  // Fetch links + persons when dashboard loads
  React.useEffect(() => {
    // get links for this user
    const token = localStorage.getItem("jwt");
    if (!token || !me) return;
    fetch(`/api/person-user-links?userId=${me.id}`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then(async (links) => {
        //  fetch each person
        const persons = await Promise.all(
          links.map((l) =>
            fetch(`/api/person-with-needs/${l.personId}`, {
              headers: { Authorization: "Bearer " + jwt },
            })
              .then((r) => r.json())
              .then((p) => ({
                ...p,
                relationshipType: l.relationshipType,
              }))
          )
        );
        setClients(persons);
      })
      .catch((err) => console.error("Failed to load clients", err));
  }, [jwt, me]);

  return (
    <>
      <UserProfile
        me={me}
        onLogout={logout}
        refreshMe={refreshMe}
        jwt={jwt}
      />

      {me && (me.role === "Family" || me.role === "PoA") && (
        <OrganizationManagement me={me} jwt={jwt} refreshMe={refreshMe} />
      )}

      <AccessManagement.RequestAccess jwt={jwt} />

      {me &&
        (me.role === "Admin" || me.role === "Family" || me.role === "PoA") && (
          <>
            <AccessManagement.CreateToken
              me={me}
              jwt={jwt}
              clients={clients}
              organizationId={organizationId}
            />
            <AccessManagement.IncomingRequests jwt={jwt} />
          </>
        )}

      {me && me.role === "Family" && (
        <ClientManagement.AddClient me={me} jwt={jwt} setClients={setClients} />
      )}

      <ClientManagement.ClientList clients={clients} />

      {me &&
        (me.role === "Family" || me.role === "PoA" || me.role === "Admin") && (
          <ClientManagement.AccessControl me={me} jwt={jwt} clients={clients} />
        )}

      {me &&
        (me.role === "Family" || me.role === "PoA" || me.role === "Admin") && (
          <CareNeedItems.Create jwt={jwt} clients={clients} />
        )}

      <CareNeedItems.List jwt={jwt} clients={clients} />

      <TasksPanel jwt={jwt} clients={clients} />

      <BudgetReporting jwt={jwt} clients={clients} />
    </>
  );
}

export default Dashboard;