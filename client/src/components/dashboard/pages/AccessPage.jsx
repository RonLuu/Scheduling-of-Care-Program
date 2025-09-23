import React from "react";
import useAuth from "../hooks/useAuth";
import AccessManagement from "../AccessManagement";
import NavigationTab from "../../NavigationTab";
import { useClients } from "../hooks/useClients";

function AccessPage() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients } = useClients(me, jwt);

  return (
    <div className="page">
      <NavigationTab />

      <div className="page-main">
        <AccessManagement.RequestAccess jwt={jwt} />

        {(me?.role === "Admin" ||
          me?.role === "Family" ||
          me?.role === "PoA") && (
          <>
            <AccessManagement.CreateToken
              me={me}
              jwt={jwt}
              clients={clients}
              organizationId={me.organizationId}
            />
            <AccessManagement.IncomingRequests jwt={jwt} />
          </>
        )}
      </div>
    </div>
  );
}

export default AccessPage;
