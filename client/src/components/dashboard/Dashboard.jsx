// import React from "react";
// import useAuth from "./hooks/useAuth";
// import Profile from "./Profile";

// import AccessManagement from "./AccessManagement";
// import ClientManagement from "./ClientManagement";
// import ShiftScheduler from "./Shift/ShiftScheduler";
// import CareNeedItems from "./CareNeedItems";
// import CareTasks from "./CareTasks";
// import Budget from "./Budget";

// function Dashboard() {
//   const { me, setMe } = useAuth();
//   const jwt = localStorage.getItem("jwt");
//   const organizationId = me?.organizationId;
//   const [clients, setClients] = React.useState([]);

//   function logout() {
//     localStorage.removeItem("jwt");
//     setMe(null);
//   }

//   async function refreshMe() {
//     const jwt = localStorage.getItem("jwt");
//     if (!jwt) return setMe(null);
//     try {
//       const res = await fetch("/api/auth/me", {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       if (!res.ok) throw new Error();
//       const data = await res.json();
//       setMe(data.user ?? null);
//     } catch {
//       setMe(null);
//     }
//   }
//   // Fetch links + persons when dashboard loads
//   React.useEffect(() => {
//     // get links for this user
//     const token = localStorage.getItem("jwt");
//     if (!token || !me) return;
//     fetch(`/api/person-user-links?userId=${me.id}`, {
//       headers: { Authorization: "Bearer " + token },
//     })
//       .then((r) => r.json())
//       .then(async (links) => {
//         //  fetch each person
//         const persons = await Promise.all(
//           links.map((l) =>
//             fetch(`/api/person-with-needs/${l.personId}`, {
//               headers: { Authorization: "Bearer " + jwt },
//             })
//               .then((r) => r.json())
//               .then((p) => ({
//                 ...p,
//                 relationshipType: l.relationshipType,
//               }))
//           )
//         );
//         setClients(persons);
//       })
//       .catch((err) => console.error("Failed to load clients", err));
//   }, [jwt, me]);

//   return (
//     <>
//       <Profile.UserProfile
//         me={me}
//         setMe={setMe}
//         onLogout={logout}
//         refreshMe={refreshMe}
//         jwt={jwt}
//       />

//       {me && (me.role === "Family" || me.role === "PoA") && (
//         <Profile.OrganizationManagement
//           me={me}
//           jwt={jwt}
//           refreshMe={refreshMe}
//         />
//       )}

//       <AccessManagement.RequestAccess jwt={jwt} />

//       {me &&
//         (me.role === "Admin" || me.role === "Family" || me.role === "PoA") && (
//           <>
//             <AccessManagement.CreateToken
//               me={me}
//               jwt={jwt}
//               clients={clients}
//               organizationId={organizationId}
//             />
//             <AccessManagement.IncomingRequests jwt={jwt} />
//           </>
//         )}

//       {me && (me.role === "Family" || me.role === "PoA") && (
//         <ClientManagement.AddClient me={me} jwt={jwt} setClients={setClients} />
//       )}

//       <ClientManagement.ClientList clients={clients} />

//       {me &&
//         (me.role === "Family" || me.role === "PoA" || me.role === "Admin") && (
//           <ClientManagement.AccessControl me={me} jwt={jwt} clients={clients} />
//         )}

//       <ShiftScheduler jwt={jwt} me={me} clients={clients} />

//       <CareNeedItems.ReceiptBuckets jwt={jwt} clients={clients} />

//       {me &&
//         (me.role === "Family" || me.role === "PoA" || me.role === "Admin") && (
//           <CareNeedItems.Create jwt={jwt} clients={clients} />
//         )}

//       <CareNeedItems.List jwt={jwt} clients={clients} />

//       <CareTasks jwt={jwt} clients={clients} />

//       <Budget.BudgetReporting jwt={jwt} clients={clients} />
//     </>
//   );
// }

// export default Dashboard;
