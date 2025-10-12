import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import ClientManagement from "../ClientManagement";
import { useClients } from "../hooks/useClients";

function ClientsPage() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error, refresh } = useClients(me, jwt);
  const [showAddClient, setShowAddClient] = React.useState(false);
  const [showEnterToken, setShowEnterToken] = React.useState(false);

  const canAddClient = me?.role === "Family" || me?.role === "PoA";
  const canEnterToken = me?.role === "Admin" || me?.role === "GeneralCareStaff" || me?.role === "Family" || me?.role === "PoA";
  const canViewClients =
    me?.role === "Admin" || me?.role === "GeneralCareStaff" || me?.role === "Family" || me?.role === "PoA";
  const canManageAccess =
    me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";

  return (
    <>
      <NavigationTab />
      <div className="clients-page">
        <div className="clients-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Clients</h1>
            <p>View client information and add new clients</p>
          </div>

          <div className="content-area">
        {/* Action Buttons Section */}
        <div className="action-buttons-container">
          {/* Add Client Button - For Family/PoA only */}
          {canAddClient && (
            <button
              className="action-btn"
              onClick={() => {
                setShowAddClient(!showAddClient);
                setShowEnterToken(false);
              }}
            >
              <span className="btn-icon">{showAddClient ? "−" : "+"}</span>
              {showAddClient ? "Cancel" : "Add New Client"}
            </button>
          )}

          {/* Enter Token Button - For all roles */}
          <button
            className="action-btn"
            onClick={() => {
              setShowEnterToken(!showEnterToken);
              setShowAddClient(false);
            }}
          >
            <span className="btn-icon">{showEnterToken ? "−" : "+"}</span>
            {showEnterToken ? "Cancel" : canAddClient ? "Join Existing Client" : "Add New Client"}
          </button>
        </div>

        {/* Add Client Form */}
        {showAddClient && (
          <div className="form-wrapper">
            <ClientManagement.AddClient
              me={me}
              jwt={jwt}
              setClients={refresh}
            />
          </div>
        )}

        {/* Enter Token Form */}
        {showEnterToken && (
          <div className="form-wrapper">
            <ClientManagement.EnterToken
              me={me}
              jwt={jwt}
              onSuccess={() => {
                refresh();
                setShowEnterToken(false);
              }}
            />
          </div>
        )}

        {/* Client Information Manager - Always shown after action buttons */}
        {canViewClients && clients.length > 0 && (
          <ClientManagement.ClientInfoManager
            me={me}
            jwt={jwt}
            clients={clients}
          />
        )}

        {/* Show message if no clients exist */}
        {clients.length === 0 && !loading && (
          <div className="empty-state-card">
            <h3>No Clients Yet</h3>
            {canAddClient ? (
              <div>
                <p>
                  You don't have access to any clients yet.
                </p>
                <p style={{ marginTop: "1rem" }}>
                  You can either:<br />
                  • Click "Add New Client" to create a completely new client, or<br />
                  • Click "Join Existing Client" to enter an invite token and access an existing client
                </p>
              </div>
            ) : (
              <div>
                <p>
                  You don't have access to any clients yet.
                </p>
                <p style={{ marginTop: "1rem" }}>
                  To gain access to a client, enter an invite token that was shared with you by a Family/Power of Attorney.<br />
                  Click the button above to get started.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="loading-card">
            <p>Loading clients…</p>
          </div>
        )}

        {error && (
          <div className="error-card">
            <p>Error: {error}</p>
          </div>
        )}
          </div>
        </div>

        <style jsx>{`
        .clients-page {
          min-height: 100vh;
          background: #f5f7fa;
          padding: 2rem 1rem;
        }

        .clients-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .page-header {
          background: #8189d2;
          color: white;
          padding: 2.5rem 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
        }

        .page-header p {
          margin: 0;
          font-size: 1rem;
          opacity: 0.9;
        }

        .content-area {
          padding: 2rem;
        }

        .content-area :global(.client-info-manager) {
          width: 100%;
          margin-left: 0;
          margin-right: 0;
        }

        .content-area :global(.client-info-manager .card) {
          width: 100%;
          margin-left: 0;
          margin-right: 0;
        }

        .action-buttons-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          width: 100%;
        }

        .action-btn {
          flex: 1;
          padding: 1rem 1.5rem;
          background: white;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          min-width: 0;
        }

        .action-btn:hover {
          background: #f9fafb;
          border-color: #8189d2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .action-btn .btn-icon {
          display: inline-flex;
          width: 1.5rem;
          height: 1.5rem;
          align-items: center;
          justify-content: center;
          background: #8189d2;
          color: white;
          border-radius: 4px;
          font-size: 1.2rem;
          font-weight: bold;
          line-height: 1;
        }

        .form-wrapper {
          margin-bottom: 1.5rem;
          width: 100%;
        }

        .form-wrapper :global(.card) {
          width: 100% !important;
        }

        .empty-state-card,
        .loading-card,
        .error-card {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          text-align: left;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
          margin-left: 0;
          margin-right: 0;
          border: 1px solid #e5e7eb;
        }

        .empty-state-card h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
          text-align: left;
        }

        .empty-state-card p {
          color: #666;
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
          text-align: left;
        }

        .loading-card {
          background: #f0f9ff;
          border-color: #bae6fd;
        }

        .loading-card p {
          color: #0369a1;
          margin: 0;
          font-size: 1rem;
        }

        .error-card {
          background: #fee2e2;
          border-color: #fecaca;
        }

        .error-card p {
          color: #991b1b;
          margin: 0;
          font-weight: 500;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .clients-page {
            padding: 1rem 0.5rem;
          }

          .page-header {
            padding: 1.5rem;
          }

          .page-header h1 {
            font-size: 1.5rem;
          }

          .content-area {
            padding: 1rem;
          }

          .action-buttons-container {
            flex-direction: column;
          }
        }
        `}</style>
      </div>
    </>
  );
}

export default ClientsPage;
