import React from "react";
import useAuth from "../hooks/useAuth";
import AccessManagement from "../AccessManagement";
import Header from "../../Header";
import { useClients } from "../hooks/useClients";
import "../../../css/access_token.css";

function AccessPage() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients } = useClients(me, jwt);
  // const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGRhMmUwNzI2NTUzZjMyYTU2MDJiNzgiLCJyb2xlIjoiQWRtaW4iLCJvcmciOiI2OGM1NzZiYWMzY2RiOGMzNDhjYmFhM2QiLCJpYXQiOjE3NTkxMzE2MDUsImV4cCI6MTc1OTEzNTIwNX0.obEPteHBLKQrj014I8e6VDjpxNbva - RodLKjX0RzXR0"
  // const me = {
  //   "id": "68da2e0726553f32a5602b78",
  //   "_id": "68da2e0726553f32a5602b78",
  //   "name": "admin",
  //   "email": "admin@test.com",
  //   "role": "Admin",
  //   "organizationId": "68c576bac3cdb8c348cbaa3d",
  //   "mobile": null,
  //   "address": null
  // }
  // const clients = [
  //   {
  //     "_id": "68d60838c48640c618d1fc41",
  //     "organizationId": "68c576bac3cdb8c348cbaa3d",
  //     "name": "client1",
  //     "dateOfBirth": "1111-11-11T00:00:00.000Z",
  //     "medicalInfo": "1",
  //     "status": "Active",
  //     "currentAnnualBudget": 1111,
  //     "customCategories": [],
  //     "createdAt": "2025-09-26T03:27:52.627Z",
  //     "updatedAt": "2025-09-26T03:27:52.627Z",
  //     "__v": 0,
  //     "relationshipType": "Admin"
  //   }
  // ]

  return (
    <div className="access-page" >
      <Header />
      <div className="container">
        <AccessManagement.RequestAccess jwt={jwt} />

        {(me?.role === "Admin" ||
          me?.role === "Family" ||
          me?.role === "PoA") && (
          <>
            <AccessManagement.CreateToken me={me} jwt={jwt} clients={clients} />
            <AccessManagement.IncomingRequests jwt={jwt} />
          </>
        )}
      </div>
    </div>
  );
}

export default AccessPage;
