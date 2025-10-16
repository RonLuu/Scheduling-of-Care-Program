import React from "react";
import { useNavigate } from "react-router-dom";
import { BiCalendar, BiDollarCircle } from "react-icons/bi";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import { useClients } from "../hooks/useClients";
import CareTasks from "../CareTasks";

function Dashboard() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error, refresh } = useClients(me, jwt);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [showOrganizationModal, setShowOrganizationModal] =
    React.useState(false);
  const [organizationData, setOrganizationData] = React.useState(null);

  // Check if user has joined an organization
  const hasJoinedOrganization = Boolean(me?.organizationId);

  // Check if user has completed onboarding (Step 2) - use state for reactivity
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState(() => {
    return localStorage.getItem(`onboarding_completed_${me?.id}`) === 'true';
  });

  // Mark onboarding as completed
  const completeOnboarding = () => {
    if (me?.id) {
      localStorage.setItem(`onboarding_completed_${me.id}`, 'true');
      setHasCompletedOnboarding(true);
    }
  };

  // Auto-select first client when clients load
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  // Auto-complete onboarding when user joins an organization
  React.useEffect(() => {
    if (hasJoinedOrganization && clients.length > 0 && !hasCompletedOnboarding) {
      completeOnboarding();
    }
  }, [hasJoinedOrganization, clients.length, hasCompletedOnboarding]);

  // Fetch organization data
  React.useEffect(() => {
    if (!me?.organizationId || !jwt) return;

    const fetchOrganizationData = async () => {
      try {
        const response = await fetch(
          `/api/organizations/${me.organizationId}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (response.ok) {
          const orgData = await response.json();
          setOrganizationData(orgData);
        }
      } catch (error) {
        console.error("Failed to fetch organization data:", error);
      }
    };

    fetchOrganizationData();
  }, [me?.organizationId, jwt]);

  if (loading) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <div className="loading-state">
            <h2>Loading your dashboard...</h2>
            <p>Fetching client information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <div className="error-state">
            <h2>Unable to load dashboard</h2>
            <p>Error: {error}</p>
            <button onClick={refresh} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding if user hasn't completed it yet
  const shouldShowOnboarding = !hasCompletedOnboarding;

  if (shouldShowOnboarding) {
    // Check if Step 1 is completed (has at least one client)
    const hasCompletedStep1 = clients.length > 0;

    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <div className="onboarding-guide">
            {/* Header Section */}
            <div className="onboarding-header">
              <h2>Welcome to Schedule of Care</h2>
              <p>To get started, you'll need to follow these steps:</p>
            </div>

            {/* Content Section */}
            <div className="onboarding-content">
              <div className="onboarding-steps">
                <div className={`step ${hasCompletedStep1 ? "completed" : ""}`}>
                  <div className="step-number">{hasCompletedStep1 ? "✓" : "1"}</div>
                  <div className="step-content">
                    <h3>Add Your First Client</h3>
                    <p>
                      {hasCompletedStep1
                        ? "You've successfully added your first client. "
                        : "Start by adding a client (Person With Special Needs) to begin managing their care."}
                    </p>
                    {!hasCompletedStep1 && (
                      <a href="/clients" className="step-button">
                        Add Client
                      </a>
                    )}
                    {hasCompletedStep1 && (
                      <a href="/clients" className="step-button secondary">
                        View Clients
                      </a>
                    )}
                  </div>
                </div>

                <div
                  className={`step ${hasJoinedOrganization ? "completed" : ""}`}
                >
                  <div className="step-number">
                    {hasJoinedOrganization ? "✓" : "2"}
                  </div>
                  <div className="step-content">
                    <h3>Join an Organization</h3>
                    <p>
                      {hasJoinedOrganization
                        ? "You have successfully joined an organization. "
                        : "Join an organization to let other carers access your client's information, or continue without joining. You can always join later."}
                    </p>
                    {!hasJoinedOrganization && (
                      <div className="step-buttons">
                        {hasCompletedStep1 ? (
                          <>
                            <a href="/organization" className="step-button">
                              Join Organization
                            </a>
                            <button
                              className="step-text-button"
                              onClick={completeOnboarding}
                            >
                              Skip for Now
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="step-button disabled" disabled>
                              Join Organization
                            </button>
                            <button className="step-text-button disabled" disabled>
                              Skip for Now
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {hasJoinedOrganization && (
                      <a href="/organization" className="step-button secondary">
                        View Organization
                      </a>
                    )}
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Start Managing Care</h3>
                    <p>
                      Once you've added clients, you'll be able to manage tasks,
                      schedules, and budgets from this dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="help-note">
                <p>
                  <strong>Need help?</strong> You can start by adding a client directly, or contact a care organization representative if you'd like to join an organization.
                </p>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #f8fafc;
          }

          .page-main {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 1rem;
          }

          .onboarding-guide {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            overflow: hidden;
            max-width: 1000px;
            margin: 0 auto;
          }

          .onboarding-header {
            background: #8189d2;
            color: white;
            padding: 3rem 2rem;
            text-align: left;
          }

          .onboarding-header h2 {
            margin: 0 0 1rem 0;
            font-size: 2.5rem;
            font-weight: 700;
            color: white;
            text-align: left;
          }

          .onboarding-header p {
            margin: 0;
            opacity: 0.95;
            font-size: 1.25rem;
            line-height: 1.6;
            color: white;
          }

          .onboarding-content {
            padding: 3rem 2rem;
          }

          .onboarding-steps {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-bottom: 2rem;
          }

          .step {
            display: flex;
            align-items: flex-start;
            text-align: left;
            background: white;
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            position: relative;
            transition: all 0.3s ease;
          }

          .step:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
          }

          .step.completed {
            background: #f0f9ff;
            border-color: #22c55e;
          }


          .step-number {
            width: 4rem;
            height: 4rem;
            background: #8189d2;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.5rem;
            margin-right: 2rem;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
            position: relative;
          }

          .step-number::after {
            content: "";
            position: absolute;
            inset: -2px;
            padding: 2px;
            background: #8189d2;
            border-radius: 50%;
            mask: linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            mask-composite: exclude;
          }

          .step.completed .step-number {
            background: #22c55e;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
          }

          .step-content {
            flex: 1;
          }

          .step-content h3 {
            color: #1e293b;
            margin: 0 0 0.75rem 0;
            font-size: 1.5rem;
            font-weight: 600;
            text-align: left;
          }

          .step-content p {
            color: #64748b;
            margin: 0 0 2rem 0;
            line-height: 1.7;
            font-size: 1.1rem;
          }

          .step-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: #8189d2;
            color: white;
            border: none;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1rem;
            line-height: 1.5;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            box-sizing: border-box;
            min-height: 3.5rem;
          }

          .step-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          }

          .step-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
          }

          .step-button.disabled:hover {
            transform: none;
          }

          .step-button::after {
            content: "→";
            font-size: 1.2rem;
            transition: transform 0.3s ease;
          }

          .step-button:hover::after {
            transform: translateX(2px);
          }

          .step-button.secondary {
            background: #6b7280;
            box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
          }

          .step-button.secondary:hover {
            box-shadow: 0 8px 20px rgba(107, 114, 128, 0.4);
          }

          .step-text-button {
            background: transparent;
            border: none;
            color: #1a202c !important;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            padding: 1rem;
            text-decoration: underline;
            transition: color 0.2s ease;
            display: inline-flex;
            align-items: center;
            min-height: 3.5rem;
            box-sizing: border-box;
          }

          .step-text-button:hover {
            color: #4b5563 !important;
          }

          .step-text-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
          }

          .step-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: nowrap;
            align-items: center;
            margin: 0;
            padding: 0;
          }

          .step-buttons .step-button {
            flex: 0 0 auto;
            width: auto;
            margin: 0;
          }

          .help-note {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 2rem;
            margin-top: 3rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            position: relative;
          }

          .help-note::before {
            content: "💡";
            font-size: 1.5rem;
            position: absolute;
            top: -0.75rem;
            left: 2rem;
            background: white;
            padding: 0 0.5rem;
          }

          .help-note p {
            margin: 0;
            color: #475569;
            font-size: 1rem;
            text-align: left;
          }

          .help-note strong {
            color: #1e293b;
            font-weight: 600;
          }

          @media (max-width: 768px) {
            .page-main {
              padding: 1rem 0.5rem;
            }

            .onboarding-header {
              padding: 2rem 1rem;
            }

            .onboarding-header h2 {
              font-size: 2rem;
            }

            .onboarding-header p {
              font-size: 1.125rem;
            }

            .onboarding-content {
              padding: 2rem 1rem;
            }

            .step {
              flex-direction: column;
              text-align: center;
              padding: 2rem 1.5rem;
              border-radius: 12px;
            }

            .step-number {
              margin-right: 0;
              margin-bottom: 1.5rem;
              width: 3.5rem;
              height: 3.5rem;
              font-size: 1.25rem;
            }

            .step-content h3 {
              font-size: 1.25rem;
            }

            .step-content p {
              font-size: 1rem;
              margin-bottom: 1.5rem;
            }

            .step-button {
              padding: 0.75rem 1.5rem;
              font-size: 0.9rem;
            }

            .help-note {
              padding: 1.5rem;
              border-radius: 12px;
            }

            .help-note::before {
              left: 1.5rem;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="dashboard-container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="header-content">
              <div className="header-title">
                <h1>Schedule of Care</h1>
              </div>

              {organizationData && (
                <div className="organization-status">
                  <div className="org-info">
                    <span className="org-label">Organization:</span>
                    <span className="org-name">{organizationData.name}</span>
                  </div>
                  <button
                    className="manage-org-btn"
                    onClick={() => setShowOrganizationModal(true)}
                    title="Manage organization settings"
                  >
                    View Organization
                  </button>
                </div>
              )}
              {!organizationData && (
                <div className="organization-status">
                  <a
                    href="/organization"
                    className="manage-org-btn"
                    title="Add organization"
                  >
                    Join Organization
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Client Selection */}
          <div className="client-selector">
            <div className="client-selector-left">
              <label htmlFor="client-select">
                {me?.role === "Admin"
                  ? "Viewing client:"
                  : me?.role === "GeneralCareStaff"
                  ? "Providing care for:"
                  : "Managing care for:"}
              </label>
              <select
                id="client-select"
                value={selectedClient?._id || ""}
                onChange={(e) => {
                  const client = clients.find((c) => c._id === e.target.value);
                  setSelectedClient(client);
                }}
                className="client-dropdown"
              >
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="access-buttons">
              <button
                className="access-btn admin-btn"
                onClick={() => (window.location.href = "/clients")}
                title="View and manage all clients"
              >
                Manage Clients
              </button>
            </div>
          </div>

          {selectedClient && (
            <div className="dashboard-widgets">
              <DashboardContent client={selectedClient} jwt={jwt} me={me} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showOrganizationModal && (
        <OrganizationManagementModal
          isOpen={showOrganizationModal}
          onClose={() => setShowOrganizationModal(false)}
          organizationData={organizationData}
          user={me}
          jwt={jwt}
          onSuccess={() => {
            // Refresh organization data
            setShowOrganizationModal(false);
            window.location.reload(); // For now, reload to refresh all data
          }}
        />
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .page-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .dashboard-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }

        .dashboard-header {
          background: #8189d2;
          color: white;
          padding: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .header-title {
          text-align: left;
          flex: 1;
        }

        .header-title h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
        }

        .header-title p {
          margin: 0;
          opacity: 0.9;
        }

        .organization-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .org-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .org-label {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .org-name {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .manage-org-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .manage-org-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
        }

        .client-selector {
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
        }

        .client-selector-left {
          flex: 1;
        }

        .client-selector label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .client-dropdown {
          width: 100%;
          max-width: 400px;
          padding: 0.75rem;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .client-dropdown:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .access-buttons {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .access-btn {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .create-token-btn {
          background: #10b981;
          color: white;
        }

        .create-token-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .enter-token-btn {
          background: #3b82f6;
          color: white;
        }

        .enter-token-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .client-context-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }

        .client-info h2 {
          margin: 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .client-id {
          font-size: 0.875rem;
          color: #64748b;
          font-family: monospace;
        }

        .refresh-button {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .refresh-button:hover {
          background: #5a67d8;
        }

        .dashboard-widgets {
          padding: 2rem;
          background: #f8fafc;
        }

        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .loading-state h2,
        .error-state h2,
        .empty-state h2 {
          color: #374151;
          margin-bottom: 1rem;
        }

        .loading-state p,
        .error-state p,
        .empty-state p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .retry-button,
        .cta-button {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .retry-button:hover,
        .cta-button:hover {
          background: #5a67d8;
        }

        .onboarding-guide {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
          max-width: 1000px;
          margin: 0 auto;
        }

        .onboarding-header {
          background: #8189d2;
          color: white;
          padding: 3rem 2rem;
          text-align: center;
        }

        .onboarding-header h2 {
          margin: 0 0 1rem 0;
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
        }

        .onboarding-header p {
          margin: 0;
          opacity: 0.95;
          font-size: 1.25rem;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .onboarding-content {
          padding: 3rem 2rem;
        }

        .onboarding-steps {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .step {
          display: flex;
          align-items: flex-start;
          text-align: left;
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          position: relative;
          transition: all 0.3s ease;
        }

        .step:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }

        .step::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #8189d2;
          border-radius: 16px 16px 0 0;
        }

        .step-number {
          width: 4rem;
          height: 4rem;
          background: #8189d2;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.5rem;
          margin-right: 2rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
          position: relative;
        }

        .step-number::after {
          content: "";
          position: absolute;
          inset: -2px;
          padding: 2px;
          background: #8189d2;
          border-radius: 50%;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }

        .step-content {
          flex: 1;
        }

        .step-content h3 {
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .step-content p {
          color: #64748b;
          margin: 0 0 2rem 0;
          line-height: 1.7;
          font-size: 1.1rem;
        }

        .step-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
        }

        .step-button:hover {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(129, 137, 210, 0.4);
        }

        .step-button.disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          pointer-events: none;
          box-shadow: none;
          transform: none;
        }

        .step-button::after {
          content: "→";
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }

        .step-button:hover::after {
          transform: translateX(2px);
        }

        .help-note {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 2rem;
          margin-top: 3rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          position: relative;
        }

        .help-note::before {
          content: "💡";
          font-size: 1.5rem;
          position: absolute;
          top: -0.75rem;
          left: 2rem;
          background: white;
          padding: 0 0.5rem;
        }

        .help-note p {
          margin: 0;
          color: #475569;
          font-size: 1rem;
          text-align: center;
        }

        .help-note strong {
          color: #1e293b;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }

          .dashboard-header {
            padding: 1.5rem;
          }

          .client-context-bar {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .onboarding-header {
            padding: 2rem 1rem;
          }

          .onboarding-header h2 {
            font-size: 2rem;
          }

          .onboarding-header p {
            font-size: 1.125rem;
          }

          .onboarding-content {
            padding: 2rem 1rem;
          }

          .step {
            flex-direction: column;
            text-align: center;
            padding: 2rem 1.5rem;
            border-radius: 12px;
          }

          .step-number {
            margin-right: 0;
            margin-bottom: 1.5rem;
            width: 3.5rem;
            height: 3.5rem;
            font-size: 1.25rem;
          }

          .step-content h3 {
            font-size: 1.25rem;
          }

          .step-content p {
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }

          .step-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }

          .help-note {
            padding: 1.5rem;
            border-radius: 12px;
          }

          .help-note::before {
            left: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

// Main Dashboard Content with Widget Layout
function DashboardContent({ client, jwt, me }) {
  const [overviewData, setOverviewData] = React.useState({
    tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
    supplies: { total: 0, needsPurchase: 0, lowStock: 0 },
    budget: { spent: 0, allocated: 0, remaining: 0 },
    recentActivity: [],
    accessRequests: [],
    loading: true,
    error: null,
  });

  // Fetch overview data for the selected client
  React.useEffect(() => {
    if (!client?._id || !jwt) return;

    const fetchOverviewData = async () => {
      setOverviewData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const currentYear = new Date().getFullYear();

        // Fetch multiple endpoints in parallel
        const [tasksRes, suppliesRes, budgetRes, accessRequestsRes] =
          await Promise.all([
            fetch(`/api/care-tasks/client/${client._id}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }),
            fetch(`/api/care-need-items?personId=${client._id}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }),
            fetch(
              `/api/budget-plans?personId=${client._id}&year=${currentYear}`,
              {
                headers: { Authorization: `Bearer ${jwt}` },
              }
            ).catch(() => ({ ok: false })),
            fetch(`/api/access-requests/incoming`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }).catch(() => ({ ok: false })),
          ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const supplies = suppliesRes.ok ? await suppliesRes.json() : [];
        const budget = budgetRes?.ok ? await budgetRes.json() : null;
        const accessRequests = accessRequestsRes?.ok
          ? await accessRequestsRes.json()
          : [];

        // Fetch spending data if budget exists
        let spendingData = null;
        if (budget?.budgetPlan) {
          const spendingRes = await fetch(
            `/api/budget-plans/${client._id}/spending?year=${currentYear}`,
            {
              headers: { Authorization: `Bearer ${jwt}` },
            }
          ).catch(() => ({ ok: false }));

          if (spendingRes?.ok) {
            spendingData = await spendingRes.json();
          }
        }

        // Process tasks data
        const taskStats = {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "Complete").length,
          pending: tasks.filter((t) => t.status === "Scheduled").length,
          overdue: tasks.filter((t) => t.status === "Missed").length,
        };

        // Process supplies data
        const supplyStats = {
          total: supplies.length,
          needsPurchase: supplies.filter((s) => s.status === "pending").length,
          lowStock: supplies.filter((s) => s.priority === "high").length,
        };

        // Process budget data
        const budgetPlan = budget?.budgetPlan;

        // Calculate total spending from API data
        let totalSpent = 0;
        const itemSpending = {};

        console.log('[Dashboard] spendingData:', spendingData);

        if (spendingData?.spending) {
          // Calculate total net spending (gross - returned)
          Object.keys(spendingData.spending).forEach((categoryId) => {
            const catSpending = spendingData.spending[categoryId];
            const catReturned = spendingData.returned?.[categoryId] || {};

            Object.keys(catSpending.items || {}).forEach((itemId) => {
              const grossSpent = catSpending.items[itemId] || 0;
              const returned = catReturned.items?.[itemId] || 0;
              const netSpent = grossSpent - returned;

              totalSpent += netSpent;
              itemSpending[itemId] = netSpent;
            });
          });
        }

        console.log('[Dashboard] itemSpending:', itemSpending);
        console.log('[Dashboard] totalSpent:', totalSpent);

        // Find budget items that need warnings
        const itemWarnings = [];
        if (budgetPlan) {
          // Calculate time remaining if budget period dates are available
          let hasSignificantTimeRemaining = false;
          if (budgetPlan.budgetPeriodStart && budgetPlan.budgetPeriodEnd) {
            const now = new Date();
            const start = new Date(budgetPlan.budgetPeriodStart);
            const end = new Date(budgetPlan.budgetPeriodEnd);
            const totalDuration = end - start;
            const timeRemaining = end - now;
            const percentTimeRemaining = (timeRemaining / totalDuration) * 100;
            hasSignificantTimeRemaining = percentTimeRemaining >= 50;

            console.log('[Dashboard] Budget period:', {
              start: start.toISOString(),
              end: end.toISOString(),
              now: now.toISOString(),
              totalDuration: totalDuration / (1000 * 60 * 60 * 24), // days
              timeRemaining: timeRemaining / (1000 * 60 * 60 * 24), // days
              percentTimeRemaining: percentTimeRemaining.toFixed(1) + '%'
            });
          }

          console.log('[Dashboard] hasSignificantTimeRemaining:', hasSignificantTimeRemaining);
          console.log('[Dashboard] budgetPlan.categories:', budgetPlan.categories);

          // Load dismissed warnings from localStorage
          const dismissedWarnings = (() => {
            try {
              const saved = localStorage.getItem(`dismissedWarnings-${client._id}-${currentYear}`);
              return saved ? JSON.parse(saved) : [];
            } catch (e) {
              console.error('Error loading dismissed warnings:', e);
              return [];
            }
          })();

          (budgetPlan.categories || []).forEach((category) => {
            (category.items || []).forEach((item) => {
              const itemId = String(item._id);
              const spent = itemSpending[itemId] || 0;
              const allocated = item.budget || 0;

              if (allocated > 0) {
                const percentSpent = (spent / allocated) * 100;
                console.log(`[Dashboard] Item ${item.name} (${itemId}): spent=${spent}, allocated=${allocated}, percent=${percentSpent.toFixed(1)}%`);

                // Check if warning is dismissed
                const warningKey = `${category.id}-${item._id}`;
                const isDismissed = dismissedWarnings.includes(warningKey);

                // Warn if item is at 80% or more of budget and not dismissed
                if (percentSpent >= 80 && !isDismissed) {
                  console.log(`[Dashboard] ⚠️ WARNING for item ${item.name}`);
                  itemWarnings.push({
                    categoryName: category.name,
                    itemName: item.name,
                    spent,
                    allocated,
                    percentSpent,
                    isOver: spent > allocated,
                  });
                } else if (percentSpent >= 80 && isDismissed) {
                  console.log(`[Dashboard] Warning dismissed for item ${item.name}`);
                }
              }
            });
          });
        }

        console.log('[Dashboard] itemWarnings:', itemWarnings);

        // Calculate total expected/reserved budget
        let totalExpected = 0;
        if (spendingData?.expected) {
          Object.keys(spendingData.expected).forEach((categoryId) => {
            const catExpected = spendingData.expected[categoryId];
            Object.values(catExpected.items || {}).forEach((itemExpected) => {
              totalExpected += itemExpected || 0;
            });
          });
        }

        console.log('[Dashboard] totalExpected:', totalExpected);

        // Available = Total Budget - Spent - Reserved
        const totalAvailable = (budgetPlan?.yearlyBudget || 0) - totalSpent - totalExpected;

        const budgetStats = budgetPlan
          ? {
              allocated: budgetPlan.yearlyBudget || 0,
              spent: totalSpent,
              reserved: totalExpected,
              available: totalAvailable,
              remaining: (budgetPlan.yearlyBudget || 0) - totalSpent,
              categories: budgetPlan.categories || [],
              categoryCount: (budgetPlan.categories || []).length,
              itemsCount: (budgetPlan.categories || []).reduce(
                (total, cat) => total + (cat.items || []).length,
                0
              ),
              itemWarnings: itemWarnings,
            }
          : {
              allocated: 0,
              spent: 0,
              reserved: 0,
              available: 0,
              remaining: 0,
              categories: [],
              categoryCount: 0,
              itemsCount: 0,
              itemWarnings: [],
            };

        // Generate recent activity
        const recentActivity = [
          ...tasks.slice(0, 3).map((t) => ({
            type: "task",
            message: `Task "${t.title}" ${
              t.status === "Complete" ? "completed" : "updated"
            }`,
            time: new Date(t.updatedAt || t.createdAt).toLocaleString(),
          })),
          ...supplies.slice(0, 2).map((s) => ({
            type: "supply",
            message: `Supply "${s.name}" needs attention`,
            time: new Date(s.updatedAt || s.createdAt).toLocaleString(),
          })),
        ]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5);

        setOverviewData({
          tasks: taskStats,
          supplies: supplyStats,
          budget: budgetStats,
          recentActivity,
          accessRequests,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching overview data:", error);
        setOverviewData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load overview data",
        }));
      }
    };

    fetchOverviewData();
  }, [client?._id, jwt]);

  if (overviewData.loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (overviewData.error) {
    return (
      <div className="dashboard-error">
        <p>Error: {overviewData.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const { tasks, supplies, budget, recentActivity, accessRequests } =
    overviewData;

  return (
    <div className="widgets-container">
      {/* Access Requests - Full Width Alert */}
      {accessRequests.length > 0 && (
        <AccessRequestsWidget
          requests={accessRequests}
          jwt={jwt}
          onUpdate={() => window.location.reload()}
        />
      )}

      {/* Horizontal Layout for Main Content */}
      <div className="dashboard-content">
        {/* Left: Getting Started / Schedule */}
        <div className="content-left">
          <GettingStartedOrSchedule
            client={client}
            jwt={jwt}
            hasBudget={budget.allocated > 0}
            hasTasks={tasks.total > 0}
          />
        </div>

        {/* Right: Budget Widget for Family/PoA/Admin OR Tip Box for Staff */}
        <div className="content-right">
          {(me?.role === "Family" ||
            me?.role === "PoA" ||
            me?.role === "Admin") && (
            <BudgetWidget budget={budget} client={client} />
          )}

          {me?.role === "GeneralCareStaff" && (
            <div className="staff-tip-box">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <strong>Quick Guide</strong>
                <p>
                  Check today's schedule on the left to see your assigned tasks.
                  Visit the <a href="/clients">Clients page</a> to review
                  medical information, allergies, and emergency contacts for
                  this client.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .widgets-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .staff-tip-box {
          background: #eff6ff;
          border: 2px solid #bfdbfe;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .tip-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .tip-content {
          flex: 1;
        }

        .tip-content strong {
          display: block;
          color: #1e40af;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .tip-content p {
          margin: 0;
          color: #1e40af;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .tip-content a {
          color: #1e40af;
          text-decoration: underline;
          font-weight: 600;
        }

        .tip-content a:hover {
          color: #1e3a8a;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .content-left {
          min-width: 0;
        }

        .content-right {
          min-width: 0;
        }

        .dashboard-loading,
        .dashboard-error {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .dashboard-error button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 1024px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .staff-tip-box {
            padding: 1rem;
          }

          .tip-icon {
            font-size: 1.25rem;
          }

          .tip-content strong {
            font-size: 0.9375rem;
          }

          .tip-content p {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

// Enhanced Overview Section with real data (DEPRECATED - kept for reference)
function OverviewSection_OLD({ client, jwt }) {
  const [overviewData, setOverviewData] = React.useState({
    tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
    supplies: { total: 0, needsPurchase: 0, lowStock: 0 },
    budget: { spent: 0, allocated: 0, remaining: 0 },
    recentActivity: [],
    accessRequests: [],
    loading: true,
    error: null,
  });

  // Fetch overview data for the selected client
  React.useEffect(() => {
    if (!client?._id || !jwt) return;

    const fetchOverviewData = async () => {
      setOverviewData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Fetch multiple endpoints in parallel
        const [tasksRes, suppliesRes, budgetRes, accessRequestsRes] =
          await Promise.all([
            fetch(`/api/care-tasks/client/${client._id}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }),
            fetch(`/api/care-need-items?personId=${client._id}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }),
            fetch(
              `/api/budget-plans?personId=${
                client._id
              }&year=${new Date().getFullYear()}`,
              {
                headers: { Authorization: `Bearer ${jwt}` },
              }
            ).catch(() => ({ ok: false })), // Budget planning endpoint
            fetch(`/api/access-requests/incoming`, {
              headers: { Authorization: `Bearer ${jwt}` },
            }).catch(() => ({ ok: false })), // Access requests might fail
          ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const supplies = suppliesRes.ok ? await suppliesRes.json() : [];
        const budget = budgetRes?.ok ? await budgetRes.json() : null;
        const accessRequests = accessRequestsRes?.ok
          ? await accessRequestsRes.json()
          : [];

        // Process tasks data
        const taskStats = {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "Complete").length,
          pending: tasks.filter((t) => t.status === "Scheduled").length,
          overdue: tasks.filter((t) => t.status === "Missed").length,
        };

        // Process supplies data
        const supplyStats = {
          total: supplies.length,
          needsPurchase: supplies.filter((s) => s.status === "pending").length,
          lowStock: supplies.filter((s) => s.priority === "high").length,
        };

        // Process budget data from budget planning
        const budgetPlan = budget?.budgetPlan;

        // Calculate actual spending from completed tasks (only current year)
        const currentYear = new Date().getFullYear();
        const completedTasks = tasks.filter((t) => {
          if (t.status !== "Completed" || !t.cost) return false;
          const taskDate = t.completedAt
            ? new Date(t.completedAt)
            : new Date(t.dueDate);
          return taskDate.getFullYear() === currentYear;
        });

        const totalSpent = completedTasks.reduce(
          (sum, t) => sum + (t.cost || 0),
          0
        );

        // Calculate spending per budget item
        const itemSpending = {};
        completedTasks.forEach((task) => {
          if (task.budgetItemId) {
            const itemId = String(task.budgetItemId);
            itemSpending[itemId] =
              (itemSpending[itemId] || 0) + (task.cost || 0);
          }
        });

        // Find budget items that need warnings
        const itemWarnings = [];
        if (budgetPlan) {
          // Calculate time remaining if budget period dates are available
          let hasSignificantTimeRemaining = false;
          if (budgetPlan.budgetPeriodStart && budgetPlan.budgetPeriodEnd) {
            const now = new Date();
            const start = new Date(budgetPlan.budgetPeriodStart);
            const end = new Date(budgetPlan.budgetPeriodEnd);
            const totalDuration = end - start;
            const timeRemaining = end - now;
            const percentTimeRemaining = (timeRemaining / totalDuration) * 100;
            hasSignificantTimeRemaining = percentTimeRemaining >= 50;
          }

          (budgetPlan.categories || []).forEach((category) => {
            (category.items || []).forEach((item) => {
              const itemId = String(item._id);
              const spent = itemSpending[itemId] || 0;
              const allocated = item.budget || 0;

              if (allocated > 0 && spent > 0) {
                const percentSpent = (spent / allocated) * 100;
                // Warn if: (100%+ spent) OR (80%+ spent AND 50%+ time remaining)
                const isOverBudget = percentSpent >= 100;
                const isHighSpendingWithTimeLeft =
                  percentSpent >= 80 &&
                  (hasSignificantTimeRemaining ||
                    !budgetPlan.budgetPeriodStart);

                if (isOverBudget || isHighSpendingWithTimeLeft) {
                  itemWarnings.push({
                    categoryName: category.name,
                    itemName: item.name,
                    spent,
                    allocated,
                    percentSpent,
                    isOver: spent > allocated,
                  });
                }
              }
            });
          });
        }

        const budgetStats = budgetPlan
          ? {
              allocated: budgetPlan.yearlyBudget || 0,
              spent: totalSpent,
              remaining: (budgetPlan.yearlyBudget || 0) - totalSpent,
              categories: budgetPlan.categories || [],
              categoryCount: (budgetPlan.categories || []).length,
              itemsCount: (budgetPlan.categories || []).reduce(
                (total, cat) => total + (cat.items || []).length,
                0
              ),
              itemWarnings: itemWarnings,
            }
          : {
              allocated: 0,
              spent: 0,
              remaining: 0,
              categories: [],
              categoryCount: 0,
              itemsCount: 0,
              itemWarnings: [],
            };

        // Generate recent activity
        const recentActivity = [
          ...tasks.slice(0, 3).map((t) => ({
            type: "task",
            message: `Task "${t.title}" ${
              t.status === "Complete" ? "completed" : "updated"
            }`,
            time: new Date(t.updatedAt || t.createdAt).toLocaleString(),
          })),
          ...supplies.slice(0, 2).map((s) => ({
            type: "supply",
            message: `Supply "${s.name}" needs attention`,
            time: new Date(s.updatedAt || s.createdAt).toLocaleString(),
          })),
        ]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5);

        setOverviewData({
          tasks: taskStats,
          supplies: supplyStats,
          budget: budgetStats,
          recentActivity,
          accessRequests,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching overview data:", error);
        setOverviewData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load overview data",
        }));
      }
    };

    fetchOverviewData();
  }, [client?._id, jwt]);

  if (overviewData.loading) {
    return (
      <div className="overview-loading">
        <h3>Overview for {client.name}</h3>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (overviewData.error) {
    return (
      <div className="overview-error">
        <h3>Care Overview for {client.name}</h3>
        <p>Error: {overviewData.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const { tasks, supplies, budget, recentActivity, accessRequests } =
    overviewData;

  return (
    <div className="overview-section">
      <h3>Care Overview for {client.name}</h3>

      {/* Access Requests Widget - Only show if there are pending requests */}
      {accessRequests.length > 0 && (
        <AccessRequestsWidget
          requests={accessRequests}
          jwt={jwt}
          onUpdate={() => window.location.reload()}
        />
      )}

      {/* Today's Schedule or Task Creation Guidance */}
      <TodaysScheduleOrGuidance client={client} jwt={jwt} />

      {/* Budget Overview */}
      <div className="budget-overview">
        <div className="budget-card">
          <div className="budget-header">
            <h4>💰 Budget Planning</h4>
            {budget.allocated > 0 ? (
              <span className="budget-total">
                ${budget.allocated.toLocaleString()}
              </span>
            ) : (
              <a href="/budget-and-reports" className="create-budget-link">
                Create Budget →
              </a>
            )}
          </div>

          {budget.allocated > 0 ? (
            <div className="budget-breakdown">
              <div className="budget-item">
                <span className="budget-label">Yearly Budget</span>
                <span className="budget-value">
                  ${budget.allocated.toLocaleString()}
                </span>
              </div>
              <div className="budget-item">
                <span className="budget-label">Categories</span>
                <span className="budget-value">{budget.categoryCount}</span>
              </div>
              <div className="budget-item">
                <span className="budget-label">Budget Items</span>
                <span className="budget-value">{budget.itemsCount}</span>
              </div>
              <div className="budget-actions">
                <a href="/budget-and-reports" className="manage-budget-btn">
                  Manage Budget →
                </a>
              </div>
            </div>
          ) : (
            <div className="no-budget">
              <p>No budget plan created yet</p>
              <p className="budget-description">
                Create a yearly budget plan with categories and specific items
                to better manage {client.name}'s care expenses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="activity-section">
          <h4>⏱️ Recent Activity</h4>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-icon">
                  {activity.type === "task" ? "📋" : "🛒"}
                </span>
                <div className="activity-content">
                  <span className="activity-message">{activity.message}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .overview-section {
          padding: 0;
        }

        .overview-section h3 {
          color: #374151;
          margin-bottom: 2rem;
          font-size: 1.5rem;
        }

        .overview-section h4 {
          color: #374151;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }

        .overview-loading,
        .overview-error {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .budget-overview {
          margin-bottom: 2rem;
        }

        .budget-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        }

        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .budget-header h4 {
          margin: 0;
          font-size: 1rem;
          color: #374151;
        }

        .budget-total {
          font-size: 1.75rem;
          font-weight: 700;
          color: #667eea;
        }

        .budget-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .budget-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .budget-label {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .budget-value {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .budget-value.success {
          color: #10b981;
        }
        .budget-value.error {
          color: #ef4444;
        }

        .create-budget-link {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
        }

        .create-budget-link:hover {
          text-decoration: underline;
        }

        .no-budget {
          text-align: center;
          padding: 1rem 0;
        }

        .no-budget p {
          margin: 0 0 0.5rem 0;
          color: #6b7280;
        }

        .budget-description {
          font-size: 0.875rem !important;
          line-height: 1.4;
        }

        .budget-actions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
          text-align: center;
        }

        .manage-budget-btn {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .manage-budget-btn:hover {
          background-color: rgba(102, 126, 234, 0.1);
          text-decoration: none;
        }

        .activity-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .activity-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .activity-message {
          color: #374151;
          font-size: 0.875rem;
        }

        .activity-time {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .budget-card {
            max-width: none;
          }

          .budget-breakdown {
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

// Getting Started Guidance or Today's Schedule Component
function GettingStartedOrSchedule({ client, jwt, hasBudget, hasTasks }) {
  const [scheduleData, setScheduleData] = React.useState({
    todaysTasks: [],
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    if (!client?._id || !jwt) return;

    const fetchScheduleData = async () => {
      try {
        const today = new Date();
        // Get today's date in local timezone (YYYY-MM-DD)
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        const tasksRes = await fetch(`/api/care-tasks/client/${client._id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const allTasks = tasksRes.ok ? await tasksRes.json() : [];

        const todaysTasks = allTasks
          .filter((task) => {
            if (!task.dueDate && !task.scheduledDate) return false;
            const taskDateObj = task.scheduledDate
              ? new Date(task.scheduledDate)
              : new Date(task.dueDate);

            // Get task date in local timezone
            const taskYear = taskDateObj.getFullYear();
            const taskMonth = String(taskDateObj.getMonth() + 1).padStart(
              2,
              "0"
            );
            const taskDay = String(taskDateObj.getDate()).padStart(2, "0");
            const taskDate = `${taskYear}-${taskMonth}-${taskDay}`;

            return taskDate === todayStr;
          })
          .slice(0, 5);

        setScheduleData({
          todaysTasks,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching schedule data:", error);
        setScheduleData({
          todaysTasks: [],
          loading: false,
          error: "Failed to load schedule",
        });
      }
    };

    fetchScheduleData();
  }, [client?._id, jwt]);

  // Priority 1: No budget plan - Guide user to create budget first
  if (!hasBudget) {
    return (
      <div className="guidance-banner budget-guidance">
        <div className="guidance-header">
          <h4>💡 Tip to Get Started: Create Your Budget Plan</h4>
        </div>
        <div className="guidance-content">
          <div className="guidance-message">
            <p className="guidance-description">
              Start by creating a yearly budget plan for {client.name}. <br />
              Once your budget is set up, you can then create care tasks and
              track spending.
            </p>
            <div className="guidance-steps">
              <div className="step-indicator">
                <span className="step-number current">1</span>
                <span className="step-text">Create Budget Plan</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-indicator">
                <span className="step-number">2</span>
                <span className="step-text">Set Up Care Tasks</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-indicator">
                <span className="step-number">3</span>
                <span className="step-text">Manage Daily Care</span>
              </div>
            </div>
          </div>
          <a href="/budget-and-reports" className="guidance-cta-btn">
            Create Budget Plan →
          </a>
        </div>

        <style jsx>{`
          .guidance-banner {
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          }

          .budget-guidance {
            background: #eff6ff;
          }

          .guidance-header h4 {
            margin: 0 0 1rem 0;
            color: #1e40af;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .guidance-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .guidance-message {
            flex: 1;
          }

          .guidance-title {
            margin: 0 0 0.75rem 0;
            color: #1e3a8a;
            font-size: 1.05rem;
            font-weight: 600;
          }

          .guidance-description {
            margin: 0 0 1.5rem 0;
            color: #1e40af;
            font-size: 0.95rem;
            line-height: 1.6;
          }

          .guidance-steps {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            border: 1px solid #93c5fd;
          }

          .step-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
          }

          .step-number {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #e5e7eb;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.875rem;
          }

          .step-number.current {
            background: #3b82f6;
            color: white;
          }

          .step-text {
            font-size: 0.75rem;
            color: #374151;
            text-align: center;
            font-weight: 500;
          }

          .step-arrow {
            color: #93c5fd;
            font-size: 1.25rem;
            font-weight: 700;
          }

          .guidance-cta-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.875rem 1.75rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            align-self: flex-start;
          }

          .guidance-cta-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }

          @media (max-width: 768px) {
            .guidance-steps {
              flex-direction: column;
              gap: 0.5rem;
            }

            .step-arrow {
              transform: rotate(90deg);
            }

            .guidance-cta-btn {
              align-self: stretch;
            }
          }
        `}</style>
      </div>
    );
  }

  // Priority 2: Has budget but no tasks - Guide user to create care tasks
  if (!hasTasks) {
    return (
      <div className="guidance-banner tasks-guidance">
        <div className="guidance-header">
          <h4>💡 Next Step: Create Care Tasks</h4>
        </div>
        <div className="guidance-content">
          <div className="guidance-message">
            <p className="guidance-description">
              Budget planning is complete! Now create specific care tasks for{" "}
              {client.name} such as medication reminders, appointments, daily
              activities, or supply purchases.
            </p>
            <div className="guidance-steps">
              <div className="step-indicator">
                <span className="step-number completed">✓</span>
                <span className="step-text">Budget Plan</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-indicator">
                <span className="step-number current">2</span>
                <span className="step-text">Set Up Care Tasks</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-indicator">
                <span className="step-number">3</span>
                <span className="step-text">Manage Daily Care</span>
              </div>
            </div>
          </div>
          <a href="/tasks-new" className="guidance-cta-btn">
            Create Care Tasks →
          </a>
        </div>

        <style jsx>{`
          .guidance-banner {
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          }

          .tasks-guidance {
            background: #eff6ff;
          }

          .guidance-header h4 {
            margin: 0 0 1rem 0;
            color: #1e40af;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .guidance-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .guidance-message {
            flex: 1;
          }

          .guidance-title {
            margin: 0 0 0.75rem 0;
            color: #1e3a8a;
            font-size: 1.05rem;
            font-weight: 600;
          }

          .guidance-description {
            margin: 0 0 1.5rem 0;
            color: #1e40af;
            font-size: 0.95rem;
            line-height: 1.6;
          }

          .guidance-steps {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            border: 1px solid #93c5fd;
          }

          .step-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
          }

          .step-number {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #e5e7eb;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.875rem;
          }

          .step-number.completed {
            background: #10b981;
            color: white;
          }

          .step-number.current {
            background: #3b82f6;
            color: white;
          }

          .step-text {
            font-size: 0.75rem;
            color: #374151;
            text-align: center;
            font-weight: 500;
          }

          .step-arrow {
            color: #93c5fd;
            font-size: 1.25rem;
            font-weight: 700;
          }

          .guidance-cta-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.875rem 1.75rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            align-self: flex-start;
          }

          .guidance-cta-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }

          @media (max-width: 768px) {
            .guidance-steps {
              flex-direction: column;
              gap: 0.5rem;
            }

            .step-arrow {
              transform: rotate(90deg);
            }

            .guidance-cta-btn {
              align-self: stretch;
            }
          }
        `}</style>
      </div>
    );
  }

  // Priority 3: Has both budget and tasks - Show today's schedule
  return <TodaysScheduleWidget scheduleData={scheduleData} client={client} />;
}

// Today's Schedule Widget (when user has budget and tasks)
function TodaysScheduleWidget({ scheduleData, client }) {
  const navigate = useNavigate();
  const { todaysTasks, loading, error } = scheduleData;

  if (loading) {
    return (
      <div className="todays-schedule">
        <h4>Today's Schedule</h4>
        <p>Loading today's schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="todays-schedule">
        <h4>Today's Schedule</h4>
        <p>Error loading schedule</p>
      </div>
    );
  }

  return (
    <div className="todays-schedule">
      <div className="schedule-header">
        <h4>
          <BiCalendar className="schedule-icon" /> Today's Schedule
        </h4>
        <a href="/tasks-new" className="view-more-btn">
          View Full Schedule →
        </a>
      </div>

      {todaysTasks.length === 0 ? (
        <div className="no-schedule">
          <p>No scheduled tasks for today</p>
        </div>
      ) : (
        <div className="schedule-list">
          {todaysTasks.map((task, index) => (
            <div key={task._id || index} className="schedule-item">
              <div className="schedule-time">
                {task.scheduledTime || "All day"}
              </div>
              <div className="schedule-content">
                <div className="schedule-title">{task.title}</div>
                <div className="schedule-details">
                  {task.assignedTo && (
                    <span className="assigned-to">👤 {task.assignedTo}</span>
                  )}
                  <span
                    className={`status-badge ${task.status?.toLowerCase()}`}
                  >
                    {task.status || "Scheduled"}
                  </span>
                </div>
              </div>
              {task.status === "Scheduled" && (
                <div className="schedule-actions">
                  <button
                    className="complete-task-btn"
                    onClick={() => navigate(`/tasks/${task._id}/complete`)}
                  >
                    Complete Task
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .todays-schedule {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .schedule-header h4 {
          margin: 0;
          color: #374151;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .schedule-icon {
          font-size: 1.4rem;
          color: #667eea;
        }

        .view-more-btn {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .view-more-btn:hover {
          background-color: rgba(102, 126, 234, 0.1);
          text-decoration: none;
        }

        .no-schedule {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .schedule-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          align-items: center;
        }

        .schedule-time {
          color: #667eea;
          font-weight: 600;
          font-size: 0.875rem;
          min-width: 80px;
          flex-shrink: 0;
        }

        .schedule-content {
          flex: 1;
        }

        .schedule-actions {
          flex-shrink: 0;
        }

        .complete-task-btn {
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .complete-task-btn:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }

        .complete-task-btn:active {
          transform: translateY(0);
        }

        .schedule-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .schedule-details {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .assigned-to {
          color: #6b7280;
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.scheduled {
          background: #e0f2fe;
          color: #0369a1;
        }

        .status-badge.complete,
        .status-badge.completed {
          background: #ecfdf5;
          color: #059669;
        }

        .status-badge.missed {
          background: #fef2f2;
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .schedule-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .schedule-item {
            flex-direction: column;
            gap: 0.5rem;
            align-items: stretch;
          }

          .schedule-time {
            min-width: auto;
          }

          .complete-task-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// OLD COMPONENT - Kept for reference, can be removed later
function TodaysScheduleOrGuidance_OLD({ client, jwt }) {
  const [scheduleData, setScheduleData] = React.useState({
    shifts: [],
    todaysTasks: [],
    allTasks: [],
    hasAnyTasks: false,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    if (!client?._id || !jwt) return;

    const fetchScheduleData = async () => {
      try {
        // Get today's date in local timezone
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        // Fetch all tasks for this client
        const tasksRes = await fetch(`/api/care-tasks/client/${client._id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const allTasks = tasksRes.ok ? await tasksRes.json() : [];

        // Filter for today's tasks
        const todaysTasks = allTasks
          .filter((task) => {
            if (!task.dueDate && !task.scheduledDate) return false;
            const taskDateObj = task.scheduledDate
              ? new Date(task.scheduledDate)
              : new Date(task.dueDate);

            // Get task date in local timezone
            const taskYear = taskDateObj.getFullYear();
            const taskMonth = String(taskDateObj.getMonth() + 1).padStart(
              2,
              "0"
            );
            const taskDay = String(taskDateObj.getDate()).padStart(2, "0");
            const taskDate = `${taskYear}-${taskMonth}-${taskDay}`;

            return taskDate === todayStr;
          })
          .slice(0, 5); // Limit to 5 tasks

        setScheduleData({
          todaysTasks,
          allTasks,
          hasAnyTasks: allTasks.length > 0,
          shifts: [], // We can add shifts later
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching schedule data:", error);
        setScheduleData({
          todaysTasks: [],
          allTasks: [],
          hasAnyTasks: false,
          shifts: [],
          loading: false,
          error: "Failed to load schedule",
        });
      }
    };

    fetchScheduleData();
  }, [client?._id, jwt]);

  if (scheduleData.loading) {
    return (
      <div className="todays-schedule">
        <h4>Today's Schedule</h4>
        <p>Loading today's schedule...</p>
      </div>
    );
  }

  if (scheduleData.error) {
    return (
      <div className="todays-schedule">
        <h4>Today's Schedule</h4>
        <p>Error loading schedule</p>
      </div>
    );
  }

  const { todaysTasks, hasAnyTasks } = scheduleData;

  // Show task creation guidance if no tasks exist for this client
  if (!hasAnyTasks) {
    return (
      <div className="task-guidance">
        <div className="guidance-header">
          <h4>Get Started with Care Tasks</h4>
        </div>
        <div className="guidance-content">
          <div className="guidance-message">
            <p>
              Start creating care tasks for <strong>{client.name}</strong>
            </p>
            <p className="guidance-description">
              Care tasks are automatically generated from your care need items.
              <br />
              Set up recurring needs like medications, hygiene products, or
              daily activities.
            </p>
          </div>
          <a href="/sub-elements" className="guidance-btn">
            Create Care Items →
          </a>
        </div>

        <style jsx>{`
          .task-guidance {
            background: #f0f9ff;
            border: 2px solid #38bdf8;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .guidance-header h4 {
            margin: 0 0 1rem 0;
            color: #0369a1;
            font-size: 1.2rem;
          }

          .guidance-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
          }

          .guidance-message {
            flex: 1;
          }

          .guidance-message p {
            margin: 0 0 0.5rem 0;
            color: #0c4a6e;
            font-size: 1rem;
          }

          .guidance-message p:first-child {
            font-size: 1.1rem;
            font-weight: 600;
          }

          .guidance-description {
            font-size: 0.9rem !important;
            color: #075985 !important;
            opacity: 0.8;
          }

          .guidance-btn {
            background: #0ea5e9;
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .guidance-btn:hover {
            background: #0284c7;
            transform: translateY(-1px);
            text-decoration: none;
          }

          @media (max-width: 768px) {
            .guidance-content {
              flex-direction: column;
              gap: 1rem;
              text-align: center;
            }

            .guidance-btn {
              align-self: center;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="todays-schedule">
      <div className="schedule-header">
        <h4>Today's Schedule</h4>
        <a href="/tasks-new" className="view-more-btn">
          View Full Schedule →
        </a>
      </div>

      {todaysTasks.length === 0 ? (
        <div className="no-schedule">
          <p>No scheduled tasks for today</p>
        </div>
      ) : (
        <div className="schedule-list">
          {todaysTasks.map((task, index) => (
            <div key={task._id || index} className="schedule-item">
              <div className="schedule-time">
                {task.scheduledTime || "All day"}
              </div>
              <div className="schedule-content">
                <div className="schedule-title">{task.title}</div>
                <div className="schedule-details">
                  {task.assignedTo && (
                    <span className="assigned-to">👤 {task.assignedTo}</span>
                  )}
                  <span
                    className={`status-badge ${task.status?.toLowerCase()}`}
                  >
                    {task.status || "Scheduled"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .todays-schedule {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .schedule-header h4 {
          margin: 0;
          color: #374151;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .schedule-icon {
          font-size: 1.4rem;
          color: #667eea;
        }

        .view-more-btn {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .view-more-btn:hover {
          background-color: rgba(102, 126, 234, 0.1);
          text-decoration: none;
        }

        .no-schedule {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .schedule-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .schedule-time {
          color: #667eea;
          font-weight: 600;
          font-size: 0.875rem;
          min-width: 80px;
          flex-shrink: 0;
        }

        .schedule-content {
          flex: 1;
        }

        .schedule-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .schedule-details {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .assigned-to {
          color: #6b7280;
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.scheduled {
          background: #e0f2fe;
          color: #0369a1;
        }

        .status-badge.complete,
        .status-badge.completed {
          background: #ecfdf5;
          color: #059669;
        }

        .status-badge.missed {
          background: #fef2f2;
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .schedule-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .schedule-item {
            flex-direction: column;
            gap: 0.5rem;
          }

          .schedule-time {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

// Task Summary Widget
function TaskSummaryWidget({ tasks, client }) {
  return (
    <div className="widget task-summary-widget">
      <div className="widget-header">
        <h4>📋 Care Tasks</h4>
        <a href="/tasks-new" className="widget-link">
          View All →
        </a>
      </div>

      <div className="task-stats">
        <div className="stat-item">
          <div className="stat-value">{tasks.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-item success">
          <div className="stat-value">{tasks.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-item warning">
          <div className="stat-value">{tasks.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-item error">
          <div className="stat-value">{tasks.overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {tasks.total === 0 && (
        <div className="widget-empty">
          <p>No care tasks yet</p>
          <a href="/tasks-new" className="widget-action-btn">
            Create Care Tasks →
          </a>
        </div>
      )}

      <style jsx>{`
        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .widget-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #374151;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .widget-icon {
          font-size: 1.3rem;
          color: #667eea;
        }

        .widget-link {
          color: #667eea;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .widget-link:hover {
          text-decoration: underline;
        }

        .task-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .stat-item.success {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .stat-item.warning {
          background: #fefce8;
          border-color: #fde047;
        }

        .stat-item.error {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-item.success .stat-value {
          color: #16a34a;
        }

        .stat-item.warning .stat-value {
          color: #ca8a04;
        }

        .stat-item.error .stat-value {
          color: #dc2626;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .widget-empty {
          text-align: center;
          padding: 2rem 1rem;
          color: #9ca3af;
        }

        .widget-empty p {
          margin: 0 0 1rem 0;
        }

        .widget-action-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .widget-action-btn:hover {
          background: #5a67d8;
        }

        @media (max-width: 640px) {
          .task-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Supplies Widget
function SuppliesWidget({ supplies, client }) {
  return (
    <div className="widget supplies-widget">
      <div className="widget-header">
        <h4>🛒 Supplies & Purchases</h4>
        <a href="/tasks-new" className="widget-link">
          Manage →
        </a>
      </div>

      <div className="supplies-summary">
        <div className="summary-row">
          <span className="summary-label">Total Items</span>
          <span className="summary-value">{supplies.total}</span>
        </div>
        <div className="summary-row warning">
          <span className="summary-label">Needs Purchase</span>
          <span className="summary-value">{supplies.needsPurchase}</span>
        </div>
        <div className="summary-row alert">
          <span className="summary-label">Low Stock / High Priority</span>
          <span className="summary-value">{supplies.lowStock}</span>
        </div>
      </div>

      {supplies.total === 0 && (
        <div className="widget-empty">
          <p>No supplies tracked yet</p>
          <a href="/tasks-new" className="widget-action-btn">
            Add Supplies →
          </a>
        </div>
      )}

      <style jsx>{`
        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .widget-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #374151;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .widget-icon {
          font-size: 1.3rem;
          color: #667eea;
        }

        .widget-link {
          color: #667eea;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .widget-link:hover {
          text-decoration: underline;
        }

        .supplies-summary {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #e5e7eb;
        }

        .summary-row.warning {
          background: #fefce8;
          border-left-color: #eab308;
        }

        .summary-row.alert {
          background: #fef2f2;
          border-left-color: #ef4444;
        }

        .summary-label {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        .summary-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .summary-row.warning .summary-value {
          color: #ca8a04;
        }

        .summary-row.alert .summary-value {
          color: #dc2626;
        }

        .widget-empty {
          text-align: center;
          padding: 2rem 1rem;
          color: #9ca3af;
        }

        .widget-empty p {
          margin: 0 0 1rem 0;
        }

        .widget-action-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .widget-action-btn:hover {
          background: #5a67d8;
        }
      `}</style>
    </div>
  );
}

// Budget Widget
function BudgetWidget({ budget, client }) {
  const percentSpent =
    budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;
  const percentCommitted =
    budget.allocated > 0 ? ((budget.spent + budget.reserved) / budget.allocated) * 100 : 0;
  const isOverBudget = budget.spent > budget.allocated;
  const isNearLimit = percentSpent >= 80 && !isOverBudget;

  // Get status
  const getStatus = () => {
    if (isOverBudget) return { text: "Over Budget", color: "#ef4444" };
    if (isNearLimit) return { text: "Near Limit", color: "#f59e0b" };
    return { text: "On Track", color: "#10b981" };
  };

  const status = getStatus();

  // Check for budget items that are at warning levels (80%+)
  // This would need actual spending data per category/item from backend
  // For now, we'll check if categories exist and show a placeholder
  const hasCategories = (budget.categories || []).length > 0;

  return (
    <div className="widget budget-widget">
      <div className="widget-header">
        <h4>
          <BiDollarCircle className="widget-icon" /> Budget Overview
        </h4>
        <a href="/budget-and-reports" className="widget-link">
          {budget.allocated > 0 ? "Manage →" : "Create →"}
        </a>
      </div>

      {budget.allocated > 0 ? (
        <div className="budget-info">
          {/* Status Badge */}
          <div
            className="budget-status"
            style={{ backgroundColor: status.color }}
          >
            {status.text}
          </div>

          {/* Main Budget Summary */}
          <div className="budget-summary">
            <div className="summary-row">
              <div className="summary-item">
                <div className="summary-label">Total Budget</div>
                <div className="summary-value">
                  ${budget.allocated.toLocaleString()}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Spent</div>
                <div
                  className={`summary-value spent ${
                    percentSpent >= 80 ? "high-spending" : "normal-spending"
                  }`}
                >
                  ${budget.spent.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-item">
                <div className="summary-label">Reserved</div>
                <div className="summary-value reserved">
                  ${budget.reserved.toLocaleString()}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Available</div>
                <div className="summary-value" style={{ color: budget.available < 0 ? '#dc2626' : '#047857' }}>
                  ${budget.available.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="budget-progress">
            <div className="progress-header">
              <span className="progress-label">Budget Used</span>
              <span className="progress-percentage">
                {percentSpent.toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(percentSpent, 100)}%`,
                  backgroundColor: status.color,
                }}
              />
              {budget.reserved > 0 && (
                <div
                  className="expected-marker"
                  style={{ left: `${Math.min(percentCommitted, 100)}%` }}
                  title={`Total Commitment: ${percentCommitted.toFixed(1)}% (Spent + Reserved)`}
                />
              )}
            </div>
          </div>

          {/* Budget Warnings - Show when approaching or over budget */}
          {(isNearLimit || isOverBudget) && (
            <div
              className={`budget-warning ${
                isOverBudget ? "over-budget" : "near-limit"
              }`}
            >
              <div className="warning-icon">{isOverBudget ? "🚨" : "⚠️"}</div>
              <div className="warning-content">
                <div className="warning-title">
                  {isOverBudget ? "Budget Exceeded!" : "Budget Alert"}
                </div>
                <div className="warning-message">
                  {isOverBudget
                    ? `You've exceeded your budget by $${(
                        budget.spent - budget.allocated
                      ).toLocaleString()}. Review your spending in `
                    : `You've used ${percentSpent.toFixed(
                        1
                      )}% of your budget. Monitor your spending in `}
                  <a href="/budget-and-reports">Budget Planning</a>
                </div>
              </div>
            </div>
          )}

          {/* Item-Level Budget Warnings - Show individual items at 80%+ */}
          {budget.itemWarnings && budget.itemWarnings.length > 0 && (
            <div className="item-warnings-container">
              <div className="item-warnings-header">
                <span className="warning-icon">⚠️</span>
                <span className="item-warnings-title">
                  Budget Items Need Attention
                </span>
              </div>
              <div className="item-warnings-list">
                {budget.itemWarnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`item-warning ${
                      warning.isOver ? "item-over" : "item-near"
                    }`}
                  >
                    <div className="item-warning-header">
                      <span className="item-warning-name">
                        {warning.itemName}
                        <span className="item-warning-category">
                          {" "}
                          ({warning.categoryName})
                        </span>
                      </span>
                      <span className="item-warning-percent">
                        {warning.percentSpent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="item-warning-details">
                      <span className="item-warning-spent">
                        ${warning.spent.toFixed(2)}
                      </span>
                      <span className="item-warning-separator"> / </span>
                      <span className="item-warning-allocated">
                        ${warning.allocated.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="item-warnings-footer">
                Review and adjust in{" "}
                <a href="/budget-and-reports">Budget Planning</a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="widget-empty">
          <p>No budget plan yet</p>
          <p className="empty-description">
            Create a yearly budget to track care expenses
          </p>
          <a href="/budget-and-reports" className="widget-action-btn">
            Create Budget →
          </a>
        </div>
      )}

      <style jsx>{`
        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .widget-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #374151;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .widget-icon {
          font-size: 1.3rem;
          color: #667eea;
        }

        .widget-link {
          color: #667eea;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .widget-link:hover {
          text-decoration: underline;
        }

        .budget-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .budget-status {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: fit-content;
        }

        .budget-summary {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1.25rem;
        }

        .summary-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .summary-row:last-child {
          margin-bottom: 0;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .summary-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .summary-value.reserved {
          color: #eab308;
        }

        .summary-value.spent.high-spending {
          color: #ef4444;
        }

        .summary-value.spent.normal-spending {
          color: #3b82f6;
        }

        .summary-value.remaining {
          color: #10b981;
        }

        .budget-progress {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .progress-percentage {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1f2937;
        }

        .progress-bar {
          height: 12px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: visible;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 6px;
        }

        .progress-bar .expected-marker {
          position: absolute;
          top: -4px;
          bottom: -4px;
          width: 3px;
          background: #eab308;
          transform: translateX(-50%);
          z-index: 5;
          box-shadow: 0 0 4px rgba(234, 179, 8, 0.6);
          border-radius: 2px;
        }

        .budget-quick-stats {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .budget-breakdown {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: #f9fafb;
          border-radius: 8px;
          padding: 1rem;
        }

        .breakdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .breakdown-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }

        .breakdown-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2c3f70;
        }

        .breakdown-value.reserved {
          color: #eab308;
        }

        .breakdown-divider {
          width: 1px;
          height: 2.5rem;
          background: #d1d5db;
        }

        .top-categories {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .categories-header {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .category-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .category-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-name {
          font-size: 0.875rem;
          color: #1f2937;
          font-weight: 600;
        }

        .category-amount {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
        }

        .category-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .category-fill {
          height: 100%;
          background: #667eea;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .category-bar-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .category-legend {
          display: flex;
          justify-content: flex-end;
        }

        .legend-text {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .budget-warning {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          border: 2px solid;
          animation: slideIn 0.3s ease-out;
        }

        .budget-warning.near-limit {
          background: #fef3c7;
          border-color: #f59e0b;
        }

        .budget-warning.over-budget {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          line-height: 1;
        }

        .warning-content {
          flex: 1;
          min-width: 0;
        }

        .warning-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .budget-warning.near-limit .warning-title {
          color: #92400e;
        }

        .budget-warning.over-budget .warning-title {
          color: #991b1b;
        }

        .warning-message {
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .budget-warning.near-limit .warning-message {
          color: #78350f;
        }

        .budget-warning.over-budget .warning-message {
          color: #7f1d1d;
        }

        .warning-message a {
          font-weight: 600;
          text-decoration: underline;
        }

        .budget-warning.near-limit .warning-message a {
          color: #78350f;
        }

        .budget-warning.over-budget .warning-message a {
          color: #7f1d1d;
        }

        .warning-message a:hover {
          opacity: 0.8;
        }

        .item-warnings-container {
          border: 2px solid #d97706;
          background: #fef3c7;
          border-radius: 8px;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        }

        .item-warnings-header {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .item-warnings-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #78350f;
        }

        .item-warnings-list {
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .item-warning {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          border: 1px solid #fde68a;
        }

        .item-warning.item-over {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .item-warning-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .item-warning-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }

        .item-warning-category {
          font-size: 0.75rem;
          font-weight: 400;
          color: #6b7280;
        }

        .item-warning-percent {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .item-warning.item-near .item-warning-percent {
          color: #d97706;
        }

        .item-warning.item-over .item-warning-percent {
          color: #dc2626;
        }

        .item-warning-details {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .item-warning-spent {
          font-weight: 600;
          color: #ef4444;
        }

        .item-warning-separator {
          color: #9ca3af;
        }

        .item-warning-allocated {
          color: #6b7280;
        }

        .item-warnings-footer {
          padding: 0.75rem 1rem;
          background: #fef3c7;
          font-size: 0.75rem;
          color: #78350f;
          border-top: 1px solid #fbbf24;
        }

        .item-warnings-footer a {
          font-weight: 600;
          color: #78350f;
          text-decoration: underline;
        }

        .item-warnings-footer a:hover {
          opacity: 0.8;
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

        .widget-empty {
          text-align: center;
          padding: 2rem 1rem;
          color: #9ca3af;
        }

        .widget-empty p {
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          font-size: 0.875rem;
          margin-bottom: 1rem !important;
        }

        .widget-action-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .widget-action-btn:hover {
          background: #5a67d8;
        }

        @media (max-width: 640px) {
          .summary-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .summary-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

// Recent Activity Widget
function RecentActivityWidget({ activity }) {
  return (
    <div className="widget activity-widget">
      <div className="widget-header">
        <h4>⏱️ Recent Activity</h4>
      </div>

      <div className="activity-list">
        {activity.map((item, index) => (
          <div key={index} className="activity-item">
            <span className="activity-icon">
              {item.type === "task" ? "📋" : "🛒"}
            </span>
            <div className="activity-content">
              <div className="activity-message">{item.message}</div>
              <div className="activity-time">{item.time}</div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .widget-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #374151;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .widget-icon {
          font-size: 1.3rem;
          color: #667eea;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .activity-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-message {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        .activity-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

// Access Requests Widget Component
function AccessRequestsWidget({ requests, jwt, onUpdate }) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleDecision = async (requestId, approve) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/access-requests/${requestId}/decision`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ approve }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to process request");
        return;
      }

      // Refresh the data
      onUpdate();
    } catch (error) {
      alert("Failed to process request: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="access-requests-widget">
      <div className="widget-header">
        <h4>
          {requests.length} Access Request{requests.length !== 1 ? "s" : ""}{" "}
          Awaiting Your Review
        </h4>
      </div>

      <div className="requests-list">
        {requests.slice(0, 3).map((request) => (
          <div key={request._id} className="request-item">
            <div className="request-info">
              <div className="requester">
                <span className="name">
                  {request.requesterName ||
                    request.requesterEmail
                      .split("@")[0]
                      .replace(/[._]/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <span className="role-badge">{request.requesterRole}</span>
              </div>
              <div className="request-details">
                <span className="email">{request.requesterEmail}</span>
                {request.organizationName && (
                  <span className="organization">
                    from {request.organizationName}
                  </span>
                )}
                {request.message && (
                  <span className="message">"{request.message}"</span>
                )}
              </div>
            </div>

            <div className="request-actions">
              <button
                className="approve-btn"
                onClick={() => handleDecision(request._id, true)}
                disabled={isProcessing}
              >
                Approve
              </button>
              <button
                className="reject-btn"
                onClick={() => handleDecision(request._id, false)}
                disabled={isProcessing}
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {requests.length > 3 && (
          <div className="more-requests">
            <a href="/access" className="view-all-link">
              View all {requests.length} requests →
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .access-requests-widget {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .widget-header {
          margin-bottom: 1rem;
        }

        .widget-header h4 {
          margin: 0;
          color: #92400e;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .request-item {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #fbbf24;
        }

        .request-info {
          flex: 1;
        }

        .requester {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .name {
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }

        .role-badge {
          background: #3b82f6;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .request-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
          flex-wrap: wrap;
        }

        .email {
          color: #6b7280;
          font-size: 0.8rem;
        }

        .organization {
          color: #6b7280;
          font-size: 0.8rem;
          font-style: italic;
        }

        .message {
          font-style: italic;
        }

        .request-actions {
          display: flex;
          gap: 0.5rem;
        }

        .approve-btn,
        .reject-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .approve-btn {
          background: #10b981;
          color: white;
        }

        .approve-btn:hover {
          background: #059669;
        }

        .reject-btn {
          background: #ef4444;
          color: white;
        }

        .reject-btn:hover {
          background: #dc2626;
        }

        .approve-btn:disabled,
        .reject-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .more-requests {
          text-align: center;
          padding: 0.5rem;
        }

        .view-all-link {
          color: #92400e;
          text-decoration: none;
          font-weight: 600;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .request-item {
            flex-direction: column;
            gap: 1rem;
          }

          .request-actions {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function TasksSection({ client, jwt }) {
  // Create a single-client array for the CareTasks component
  const clientsArray = [client];

  return (
    <div className="tasks-section">
      <CareTasks jwt={jwt} clients={clientsArray} />

      <style jsx>{`
        .tasks-section {
          padding: 2rem;
        }

        /* Override CareTasks styles to fit dashboard better */
        .tasks-section :global(.card) {
          border-radius: 0;
          box-shadow: none;
          border: none;
          background: transparent;
          padding: 0;
          width: 100% !important;
          max-width: none !important;
        }

        .tasks-section :global(.card h3) {
          color: #374151;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }

        /* Ensure buttons use consistent styling */
        .tasks-section :global(button) {
          font-family: "Inria Serif", serif;
        }
      `}</style>
    </div>
  );
}

function SuppliesSection({ client, jwt }) {
  return (
    <div className="section-placeholder">
      <h3>🛒 Supplies & Purchases for {client.name}</h3>
      <p>Care supplies and purchase planning will be integrated here.</p>
      <a href="/sub-elements" className="legacy-link">
        → View in current Sub-elements page
      </a>

      <style jsx>{`
        .section-placeholder {
          text-align: center;
          padding: 2rem;
        }

        .section-placeholder h3 {
          color: #374151;
          margin-bottom: 1rem;
        }

        .legacy-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .legacy-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function ScheduleSection({ client, jwt }) {
  return (
    <div className="section-placeholder">
      <h3>📅 Schedule & Shifts for {client.name}</h3>
      <p>Shift scheduling and care calendar will be integrated here.</p>
      <a href="/shift-allocation" className="legacy-link">
        → View in current Shift Allocation page
      </a>

      <style jsx>{`
        .section-placeholder {
          text-align: center;
          padding: 2rem;
        }

        .section-placeholder h3 {
          color: #374151;
          margin-bottom: 1rem;
        }

        .legacy-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .legacy-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function BudgetSection({ client, jwt }) {
  return (
    <div className="section-placeholder">
      <h3>💰 Budget & Reports for {client.name}</h3>
      <p>Financial tracking and budget reports will be integrated here.</p>
      <a href="/budget-reports" className="legacy-link">
        → View in current Budget Reports page
      </a>

      <style jsx>{`
        .section-placeholder {
          text-align: center;
          padding: 2rem;
        }

        .section-placeholder h3 {
          color: #374151;
          margin-bottom: 1rem;
        }

        .legacy-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .legacy-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// Organization Management Modal Component
function OrganizationManagementModal({
  isOpen,
  onClose,
  organizationData,
  user,
  jwt,
  onSuccess,
}) {
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showChangeOrg, setShowChangeOrg] = React.useState(false);
  const [newOrgId, setNewOrgId] = React.useState("");
  const [isChanging, setIsChanging] = React.useState(false);
  const [organizations, setOrganizations] = React.useState([]);
  const [loadingOrgs, setLoadingOrgs] = React.useState(false);
  const [orgError, setOrgError] = React.useState("");

  // Fetch organizations when user clicks "Change Organization"
  React.useEffect(() => {
    if (!showChangeOrg) return;

    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      setOrgError("");
      try {
        const response = await fetch("/api/organizations");
        if (!response.ok) {
          throw new Error("Failed to load organizations");
        }
        const data = await response.json();
        setOrganizations(data);
      } catch (error) {
        setOrgError(error.message || "Failed to load organizations");
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, [showChangeOrg]);

  const handleLeaveOrganization = async () => {
    if (!user?.organizationId) {
      alert("You are not currently in an organization");
      return;
    }

    // Role-specific confirmation messages
    let confirmMessage;

    if (user.role === "Family" || user.role === "PoA") {
      confirmMessage =
        "Leave this organization?\n\n" +
        "Your clients and their data will leave with you.\n" +
        "• Your clients will no longer be in any organization\n" +
        "• Budget plans and tasks will remain with your clients\n" +
        "• Staff and admin access to your clients will be revoked\n" +
        "• Other family/PoA members of your clients will also leave\n\n" +
        "Click OK to proceed.";
    } else if (user.role === "Admin" || user.role === "GeneralCareStaff") {
      confirmMessage =
        "Leave this organization?\n\n" +
        "You will lose access to all clients in this organization.\n" +
        "• Your access to current clients will be revoked\n" +
        "• Clients will remain in the organization\n\n" +
        "Click OK to proceed.";
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLeaving(true);
    try {
      const response = await fetch("/api/users/me/leave-organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to leave organization");
      }

      const data = await response.json();

      // Show success message based on user type
      let successMessage;

      if (data.userType === "family_poa" && data.cascade) {
        const c = data.cascade;
        successMessage =
          "Successfully left organization.\n\n" +
          `Moved ${c.personsMoved} client${
            c.personsMoved !== 1 ? "s" : ""
          } out of organization.\n` +
          `• ${c.budgetPlansMoved} budget plan${
            c.budgetPlansMoved !== 1 ? "s" : ""
          }\n` +
          `• ${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}\n` +
          (c.familyMoved > 0
            ? `• ${c.familyMoved} family/PoA member${
                c.familyMoved !== 1 ? "s" : ""
              } also left\n`
            : "") +
          (c.staffRevoked > 0
            ? `• ${c.staffRevoked} staff/admin access${
                c.staffRevoked !== 1 ? "es" : ""
              } revoked`
            : "");
      } else if (data.userType === "admin_staff" && data.cascade) {
        const c = data.cascade;
        successMessage =
          "Successfully left organization.\n\n" +
          `Your access to ${c.linksRevoked} client${
            c.linksRevoked !== 1 ? "s" : ""
          } has been revoked.`;
      } else {
        successMessage = "Successfully left organization.";
      }

      alert(successMessage);
      onSuccess();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleChangeOrganization = async () => {
    if (!newOrgId) {
      alert("Please select an organization");
      return;
    }

    // Check if same organization
    if (newOrgId === String(user.organizationId)) {
      alert("You're already in this organization. No changes made.");
      return;
    }

    const isFirstTimeJoining = !user?.organizationId;
    const isSwitchingOrgs =
      user?.organizationId && user.organizationId !== newOrgId;
    const selectedOrgName =
      organizations.find((o) => o._id === newOrgId)?.name ||
      "the selected organization";

    let migrateClients = false;

    // Role-specific confirmation messages
    if (user.role === "Family" || user.role === "PoA") {
      let confirmMessage;

      if (isFirstTimeJoining) {
        confirmMessage =
          `Join "${selectedOrgName}"?\n\n` +
          `Your clients and their budget plans will be moved to this organization.\n\n` +
          `Click OK to proceed.`;
      } else if (isSwitchingOrgs) {
        confirmMessage =
          `Switch to "${selectedOrgName}"?\n\n` +
          `Your clients and their budget plans will be moved to the new organization.\n` +
          `Staff and admin access from your current organization will be revoked.\n\n` +
          `Click OK to proceed.`;
      }

      if (!window.confirm(confirmMessage)) {
        return;
      }
      migrateClients = true;
    } else if (user.role === "Admin" || user.role === "GeneralCareStaff") {
      let confirmMessage;

      if (isSwitchingOrgs) {
        confirmMessage =
          `Switch to "${selectedOrgName}"?\n\n` +
          `You will leave your current organization.\n` +
          `Your access to clients in the current organization will be revoked.\n\n` +
          `Click OK to proceed.`;
      } else {
        confirmMessage =
          `Join "${selectedOrgName}"?\n\n` + `Click OK to proceed.`;
      }

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsChanging(true);
    try {
      const response = await fetch("/api/users/me/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          organizationId: newOrgId,
          migrateClients,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change organization");
      }

      const data = await response.json();

      // Show success message with cascade info if available
      if (data.cascade) {
        const c = data.cascade;
        let successMessage;

        if (isFirstTimeJoining) {
          successMessage =
            `Successfully joined "${selectedOrgName}".\n\n` +
            `Moved: ${c.personsMoved} client${
              c.personsMoved !== 1 ? "s" : ""
            }, ` +
            `${c.budgetPlansMoved} budget plan${
              c.budgetPlansMoved !== 1 ? "s" : ""
            }, ` +
            `${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}.\n` +
            (c.familyMoved > 0
              ? `${c.familyMoved} family/PoA member${
                  c.familyMoved !== 1 ? "s" : ""
                } also joined.`
              : "");
        } else {
          successMessage =
            `Successfully switched to "${selectedOrgName}".\n\n` +
            `Moved: ${c.personsMoved} client${
              c.personsMoved !== 1 ? "s" : ""
            }, ` +
            `${c.budgetPlansMoved} budget plan${
              c.budgetPlansMoved !== 1 ? "s" : ""
            }, ` +
            `${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}.\n` +
            (c.familyMoved > 0 ? `${c.familyMoved} family/PoA moved. ` : "") +
            (c.staffRevoked > 0
              ? `${c.staffRevoked} staff/admin access${
                  c.staffRevoked !== 1 ? "es" : ""
                } revoked.`
              : "");
        }

        alert(successMessage);
      } else {
        alert(
          isFirstTimeJoining
            ? `Successfully joined "${selectedOrgName}".`
            : `Successfully switched to "${selectedOrgName}".`
        );
      }

      onSuccess();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsChanging(false);
      setShowChangeOrg(false);
      setNewOrgId("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>View Organization</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Organization Details */}
          <div className="org-details">
            <h4>Current Organization</h4>
            <div className="org-detail-item">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{organizationData?.name}</span>
            </div>
            <div className="org-detail-item">
              <span className="detail-label">Organization ID:</span>
              <span className="detail-value">{organizationData?._id}</span>
            </div>
            <div className="org-detail-item">
              <span className="detail-label">Your Role:</span>
              <span className="detail-value">{user?.role}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="org-actions">
            <div className="action-section">
              <h4>Actions</h4>
              {(user.role === "Family" || user.role === "PoA") && (
                <p className="action-description">
                  You can change to a different organization, or leave your
                  current organization.
                </p>
              )}

              {(user.role === "Admin" || user.role === "GeneralCareStaff") && (
                <p className="action-description">
                  You can leave your current organization.
                </p>
              )}

              <div className="action-buttons">
                {/* Change Organization */}
                {(user.role === "Family" || user.role === "PoA") && (
                  <>
                    {!showChangeOrg ? (
                      <button
                        className="change-org-btn"
                        onClick={() => setShowChangeOrg(true)}
                      >
                        Change Organization
                      </button>
                    ) : (
                      <div className="change-org-form">
                        <h5>Change Organization</h5>
                        <p className="form-description">
                          Select the organization you want to join:
                        </p>

                        {loadingOrgs ? (
                          <div className="loading-orgs">
                            Loading organizations...
                          </div>
                        ) : orgError ? (
                          <div className="org-error">Error: {orgError}</div>
                        ) : (
                          <>
                            <select
                              value={newOrgId}
                              onChange={(e) => setNewOrgId(e.target.value)}
                              className="org-select"
                              disabled={isChanging}
                            >
                              <option value="">— Select organization —</option>
                              {organizations.map((org) => (
                                <option key={org._id} value={org._id}>
                                  {org.name}
                                </option>
                              ))}
                            </select>

                            {newOrgId &&
                              newOrgId !== String(user.organizationId) && (
                                <div className="migration-warning">
                                  <strong>Important:</strong> Changing
                                  organizations will:
                                  <ul>
                                    <li>
                                      Move all your clients to the new
                                      organization
                                    </li>
                                    <li>
                                      Transfer associated family/PoA members
                                    </li>
                                    <li>
                                      Revoke all staff/admin access to your
                                      clients
                                    </li>
                                  </ul>
                                </div>
                              )}
                          </>
                        )}

                        <div className="form-actions">
                          <button
                            className="confirm-change-btn"
                            onClick={handleChangeOrganization}
                            disabled={isChanging || !newOrgId || loadingOrgs}
                          >
                            {isChanging ? "Changing..." : "Change Organization"}
                          </button>
                          <button
                            className="cancel-change-btn"
                            onClick={() => {
                              setShowChangeOrg(false);
                              setNewOrgId("");
                            }}
                            disabled={isChanging}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Leave Organization */}
                {!showLeaveConfirm ? (
                  <button
                    className="leave-org-btn"
                    onClick={() => setShowLeaveConfirm(true)}
                  >
                    Leave Organization
                  </button>
                ) : (
                  <div className="leave-confirm">
                    {(user.role === "Family" || user.role === "PoA") && (
                      <p className="warning-text">
                        ⚠️ Are you sure you want to leave "
                        {organizationData?.name}"? This will remove all access
                        to the workers and shift allocations in this
                        organization.
                      </p>
                    )}

                    {(user.role === "Admin" ||
                      user.role === "GeneralCareStaff") && (
                      <p className="warning-text">
                        ⚠️ Are you sure you want to leave "
                        {organizationData?.name}"? This will lost all access to
                        data in this organization.
                      </p>
                    )}

                    <div className="confirm-actions">
                      <button
                        className="confirm-leave-btn"
                        onClick={handleLeaveOrganization}
                        disabled={isLeaving}
                      >
                        {isLeaving ? "Leaving..." : "Yes, Leave Organization"}
                      </button>
                      <button
                        className="cancel-leave-btn"
                        onClick={() => setShowLeaveConfirm(false)}
                        disabled={isLeaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .modal-header h3 {
            margin: 0;
            color: #374151;
          }

          .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .org-details {
            margin-bottom: 2rem;
          }

          .org-details h4 {
            margin: 0 0 1rem 0;
            color: #374151;
            font-size: 1.1rem;
          }

          .org-detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .detail-label {
            font-weight: 600;
            color: #374151;
          }

          .detail-value {
            color: #6b7280;
            font-family: monospace;
          }

          .org-actions h4 {
            margin: 0 0 1rem 0;
            color: #374151;
            font-size: 1.1rem;
          }

          .action-description {
            color: #6b7280;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
          }

          .action-buttons {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .change-org-btn {
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .change-org-btn:hover {
            background: #2563eb;
          }

          .change-org-form {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 1rem;
          }

          .change-org-form h5 {
            margin: 0 0 0.5rem 0;
            color: #1e40af;
            font-size: 1rem;
          }

          .form-description {
            color: #6b7280;
            margin: 0 0 1rem 0;
            font-size: 0.875rem;
          }

          .org-select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            margin-bottom: 1rem;
            box-sizing: border-box;
            background: white;
          }

          .org-select:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .loading-orgs {
            padding: 1rem;
            text-align: center;
            color: #6b7280;
            font-style: italic;
          }

          .org-error {
            padding: 1rem;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #dc2626;
            margin-bottom: 1rem;
          }

          .migration-warning {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 1rem;
            color: #92400e;
            font-size: 0.875rem;
          }

          .migration-warning strong {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
          }

          .migration-warning ul {
            margin: 0.5rem 0 0 1.5rem;
            padding: 0;
          }

          .migration-warning li {
            margin-bottom: 0.25rem;
          }

          .form-actions {
            display: flex;
            gap: 1rem;
          }

          .confirm-change-btn {
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .confirm-change-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .cancel-change-btn {
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .cancel-change-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .leave-org-btn {
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .leave-org-btn:hover {
            background: #b91c1c;
          }

          .leave-confirm {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 1rem;
          }

          .warning-text {
            color: #dc2626;
            margin: 0 0 1rem 0;
            font-weight: 500;
          }

          .confirm-actions {
            display: flex;
            gap: 1rem;
          }

          .confirm-leave-btn {
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .confirm-leave-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .cancel-leave-btn {
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .cancel-leave-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

export default Dashboard;
