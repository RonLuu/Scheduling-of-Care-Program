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

  const canAddClient = me?.role === "Family" || me?.role === "PoA";
  const canManageAccess =
    me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
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

        {/* Show message if no clients exist */}
        {clients.length === 0 && !loading && (
          <div className="empty-state-card">
            <h3>No Clients Yet</h3>
            <p>
              {canAddClient
                ? "Get started by adding your first client using the button above."
                : "No clients have been added to the system yet."}
            </p>
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

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f3f4f6;
        }

        .page-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .add-client-section {
          margin-bottom: 1.5rem;
        }

        .toggle-add-client-btn {
          width: 100%;
          padding: 1rem;
          background: white;
          color: #111827 !important;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .toggle-add-client-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .toggle-add-client-btn .btn-icon {
          display: inline-flex;
          width: 1.5rem;
          height: 1.5rem;
          align-items: center;
          justify-content: center;
          background: #10b981;
          color: white;
          border-radius: 50%;
          font-size: 1.25rem;
          font-weight: bold;
        }

        .add-client-wrapper {
          margin-top: 1rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .empty-state-card,
        .loading-card,
        .error-card {
          background: white;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
        }

        .empty-state-card h3 {
          margin: 0 0 1rem 0;
          color: #111827;
          font-size: 1.25rem;
        }

        .empty-state-card p {
          color: #6b7280;
          margin: 0;
        }

        .loading-card p {
          color: #6b7280;
          font-style: italic;
          margin: 0;
        }

        .error-card p {
          color: #991b1b;
          margin: 0;
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ClientsPage;
