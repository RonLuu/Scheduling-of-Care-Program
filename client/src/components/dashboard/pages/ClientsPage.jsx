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
  const canEnterToken = me?.role === "Admin" || me?.role === "GeneralCareStaff";
  const canManageAccess =
    me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";

  return (
    <>
      <NavigationTab />
      <div className="clients-page">
        <div className="clients-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Client Management</h1>
            <p>Manage and view client information</p>
          </div>

          <div className="content-area">
        {/* Client Information Manager - Always shown first if user has permission */}
        {canManageAccess && clients.length > 0 && (
          <ClientManagement.ClientInfoManager
            me={me}
            jwt={jwt}
            clients={clients}
          />
        )}

        {/* Add Client Section - Collapsible */}
        {canAddClient && (
          <div className="add-client-section">
            <button
              className="toggle-add-client-btn"
              onClick={() => setShowAddClient(!showAddClient)}
            >
              <span className="btn-icon">{showAddClient ? "−" : "+"}</span>
              {showAddClient ? "Hide Add Client Form" : "Add New Client"}
            </button>

            {showAddClient && (
              <div className="add-client-wrapper">
                <ClientManagement.AddClient
                  me={me}
                  jwt={jwt}
                  setClients={refresh}
                />
              </div>
            )}
          </div>
        )}

        {/* Enter Token Section - For Admin and Staff */}
        {canEnterToken && (
          <div className="enter-token-section">
            <button
              className="toggle-enter-token-btn"
              onClick={() => setShowEnterToken(!showEnterToken)}
            >
              <span className="btn-icon">{showEnterToken ? "−" : "+"}</span>
              {showEnterToken ? "Hide Enter Token Form" : "Enter Invite Token"}
            </button>

            {showEnterToken && (
              <div className="enter-token-wrapper">
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
          </div>
        )}

        {/* Show message if no clients exist */}
        {clients.length === 0 && !loading && (
          <div className="empty-state-card">
            <h3>No Clients Yet</h3>
            {canEnterToken ? (
              <div>
                <p>
                  You don't have access to any clients yet.
                </p>
                <p style={{ marginTop: "1rem" }}>
                  To gain access to a client, enter an invite token that was shared with you by a Family user.
                  Use the "Enter Invite Token" button above to get started.
                </p>
              </div>
            ) : (
              <p>
                {canAddClient
                  ? "Get started by adding your first client using the button above."
                  : "No clients have been added to the system yet."}
              </p>
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

        .add-client-section,
        .enter-token-section {
          margin-bottom: 1.5rem;
        }

        .toggle-add-client-btn,
        .toggle-enter-token-btn {
          width: 100%;
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
        }

        .toggle-add-client-btn:hover,
        .toggle-enter-token-btn:hover {
          background: #f9fafb;
          border-color: #8189d2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .toggle-add-client-btn .btn-icon,
        .toggle-enter-token-btn .btn-icon {
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

        .add-client-wrapper,
        .enter-token-wrapper {
          margin-top: 1rem;
        }

        .empty-state-card,
        .loading-card,
        .error-card {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .empty-state-card h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .empty-state-card p {
          color: #666;
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
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
        }
        `}</style>
      </div>
    </>
  );
}

export default ClientsPage;
