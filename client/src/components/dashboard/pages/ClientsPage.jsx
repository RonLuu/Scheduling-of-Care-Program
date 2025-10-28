import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import ClientManagement from "../ClientManagement";
import { useClients } from "../hooks/useClients";

function ClientsPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error, refresh } = useClients(me, jwt);
  const [showAddClient, setShowAddClient] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");

  const canAddClient = me?.role === "Family" || me?.role === "PoA";
  const canViewClients =
    me?.role === "Admin" ||
    me?.role === "GeneralCareStaff" ||
    me?.role === "Family" ||
    me?.role === "PoA";

  // Handler for successful client addition
  const handleClientAdded = () => {
    refresh();
    setShowAddClient(false);
    setSuccessMessage("Client added successfully!");
    // Auto-hide message after 5 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  const getEmptyStateMessage = () => {
    if (me?.role === "Family" || me?.role === "PoA") {
      return (
        <div>
          <p>You don't have any clients yet.</p>
          <p style={{ marginTop: "1rem" }}>
            Click "Add New Client" above to create a new client profile. Once
            created, you can invite other family members, power of attorney, or
            care organizations to share access.
          </p>
          <p style={{ marginTop: "1rem" }}>
            Or, if another family member or power of attorney has already
            created a client profile, ask them to invite you to access it.
          </p>
        </div>
      );
    } else if (me?.role === "Admin") {
      if (!me?.organizationId) {
        return (
          <div>
            <p>You don't have access to any clients yet.</p>
            <p style={{ marginTop: "1rem" }}>
              To get started:
              <br />
              1. First, join or create an organization from the{" "}
              <a
                href="/organization"
                style={{ color: "#8189d2", textDecoration: "underline" }}
              >
                Organization page
              </a>
              <br />
              2. Then, wait for a family member to invite you to access their
              clients
            </p>
          </div>
        );
      } else {
        return (
          <div>
            <p>You don't have access to any clients yet.</p>
            <p style={{ marginTop: "1rem" }}>
              As an administrator, you'll gain access to clients when family
              members invite your organization. Family members can invite you by
              selecting their client and clicking "Invite User" to share access
              with you. For now, please wait for them to send an invitation.
            </p>
          </div>
        );
      }
    } else if (me?.role === "GeneralCareStaff") {
      if (!me?.organizationId) {
        return (
          <div>
            <p>You don't have access to any clients yet.</p>
            <p style={{ marginTop: "1rem" }}>
              To get started:
              <br />
              1. First, join an organization from the{" "}
              <a
                href="/organization"
                style={{ color: "#8189d2", textDecoration: "underline" }}
              >
                Organization page
              </a>
              <br />
              2. Then, your organization administrator will assign you to
              specific clients
            </p>
          </div>
        );
      } else {
        return (
          <div>
            <p>You don't have access to any clients yet.</p>
            <p style={{ marginTop: "1rem" }}>
              As a care staff member, you'll gain access to clients when your
              organization administrator assigns you to them. Please contact
              your administrator if you believe you should have access to
              specific clients. Or else, please wait for them to assign clients
              to you.
            </p>
          </div>
        );
      }
    }
  };

  return (
    <>
      <NavigationTab />
      <div className="clients-page">
        <div className="clients-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Clients</h1>
          </div>

          <div className="content-area">
            {/* Success Message */}
            {successMessage && (
              <div className="success-message">
                <div className="success-content">
                  <span className="success-icon">✓</span>
                  <div>
                    <p className="success-text">{successMessage}</p>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="return-dashboard-btn"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Client Button - For Family/PoA only */}
            {canAddClient && (
              <div className="action-buttons-container">
                <button
                  className="action-btn"
                  onClick={() => setShowAddClient(!showAddClient)}
                >
                  <span className="btn-icon">{showAddClient ? "−" : "+"}</span>
                  {showAddClient ? "Cancel" : "Add New Client"}
                </button>
              </div>
            )}

            {/* Add Client Form */}
            {showAddClient && (
              <div className="form-wrapper">
                <ClientManagement.AddClient
                  me={me}
                  jwt={jwt}
                  setClients={handleClientAdded}
                />
              </div>
            )}

            {/* Client Information Manager - Always shown after action buttons */}
            {canViewClients && clients.length > 0 && (
              <ClientManagement.ClientInfoManager
                me={me}
                jwt={jwt}
                clients={clients}
                onClientUpdate={refresh}
              />
            )}

            {/* Show message if no clients exist */}
            {clients.length === 0 && !loading && (
              <div className="empty-state-card">
                <h3>No Clients Yet</h3>
                {getEmptyStateMessage()}
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
            color: white;
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

          .success-message {
            background: #10b981 !important;
            color: white;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
            animation: slideIn 0.3s ease-out;
          }

          .success-content {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
          }

          .success-icon {
            font-size: 1.5rem;
            font-weight: bold;
            background: white;
            color: #10b981 !important;
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .success-text {
            margin: 0 0 0.75rem 0;
            font-size: 1rem;
            font-weight: 500;
            color: white;
          }

          .return-dashboard-btn {
            padding: 0.5rem 1rem;
            background: white;
            color: #10b981 !important;
            border: none;
            border-radius: 0.375rem;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .return-dashboard-btn:hover {
            background: #f0fdf4;
            transform: translateY(-1px);
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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
