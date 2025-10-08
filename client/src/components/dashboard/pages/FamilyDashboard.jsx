import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import { useClients } from "../hooks/useClients";
import CareTasks from "../CareTasks";

function FamilyDashboard() {
  const { me } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const { clients, loading, error, refresh } = useClients(me, jwt);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [activeSection, setActiveSection] = React.useState("overview");
  const [showCreateTokenModal, setShowCreateTokenModal] = React.useState(false);
  const [showEnterTokenModal, setShowEnterTokenModal] = React.useState(false);
  const [showOrganizationModal, setShowOrganizationModal] = React.useState(false);
  const [organizationData, setOrganizationData] = React.useState(null);

  // Check if user has joined an organization
  const hasJoinedOrganization = Boolean(me?.organizationId);

  // Auto-select first client when clients load
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  // Fetch organization data
  React.useEffect(() => {
    if (!me?.organizationId || !jwt) return;

    const fetchOrganizationData = async () => {
      try {
        const response = await fetch(`/api/organizations/${me.organizationId}`, {
          headers: { Authorization: `Bearer ${jwt}` }
        });

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

  if (clients.length === 0) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="page-main">
          <div className="onboarding-guide">
            {/* Header Section */}
            <div className="onboarding-header">
              <h2>Welcome to your care dashboard</h2>
              <p>To get started with managing care, you'll need to follow these steps:</p>
            </div>

            {/* Content Section */}
            <div className="onboarding-content">

            <div className="onboarding-steps">
              <div className={`step ${hasJoinedOrganization ? 'completed' : ''}`}>
                <div className="step-number">{hasJoinedOrganization ? '✓' : '1'}</div>
                <div className="step-content">
                  <h3>Join an Organization</h3>
                  <p>
                    {hasJoinedOrganization
                      ? 'Great! You have successfully joined an organization and can now proceed to add clients.'
                      : 'First, you need to join a care organization that manages clients. This is required before you can add or access any clients.'
                    }
                  </p>
                  {!hasJoinedOrganization && (
                    <a href="/organization" className="step-button">
                      Join Organization
                    </a>
                  )}
                  {hasJoinedOrganization && (
                    <a href="/organization" className="step-button secondary">
                      Manage Organization
                    </a>
                  )}
                </div>
              </div>

              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Add Your First Client</h3>
                  <p>Once you've joined an organization, you can add clients to start managing their care.</p>
                  <a href="/clients" className={`step-button ${!hasJoinedOrganization ? 'disabled' : ''}`}>
                    Add Client
                  </a>
                </div>
              </div>

              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Start Managing Care</h3>
                  <p>With clients added, you'll be able to manage tasks, supplies, schedules, and budgets all from this dashboard.</p>
                </div>
              </div>
            </div>

            <div className="help-note">
              <p><strong>Need help?</strong> Contact your care organization administrator if you're unsure about the joining process.</p>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

          .step.completed {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-color: #22c55e;
          }

          .step.completed::before {
            background: linear-gradient(90deg, #22c55e, #16a34a);
          }

          .step::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 16px 16px 0 0;
          }

          .step-number {
            width: 4rem;
            height: 4rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.5rem;
            margin-right: 2rem;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            position: relative;
          }

          .step-number::after {
            content: '';
            position: absolute;
            inset: -2px;
            padding: 2px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
          }

          .step.completed .step-number {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .step-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          }

          .step-button.disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            pointer-events: none;
            box-shadow: none;
            transform: none;
          }

          .step-button::after {
            content: '→';
            font-size: 1.2rem;
            transition: transform 0.3s ease;
          }

          .step-button:hover::after {
            transform: translateX(2px);
          }

          .step-button.secondary {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
          }

          .step-button.secondary:hover {
            box-shadow: 0 8px 20px rgba(107, 114, 128, 0.4);
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
            content: '💡';
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
                <h1>Care Dashboard</h1>
                <p>Manage all aspects of care for your loved ones</p>
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
                    Manage Organization
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Client Selection */}
          <div className="client-selector">
            <div className="client-selector-left">
              <label htmlFor="client-select">Managing care for:</label>
              <select
                id="client-select"
                value={selectedClient?._id || ""}
                onChange={(e) => {
                  const client = clients.find(c => c._id === e.target.value);
                  setSelectedClient(client);
                  setActiveSection("overview"); // Reset to overview when switching clients
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
                className="access-btn create-token-btn"
                onClick={() => setShowCreateTokenModal(true)}
                title="Create an invite token for others to join"
              >
                Create Invite Token
              </button>
              <button
                className="access-btn enter-token-btn"
                onClick={() => setShowEnterTokenModal(true)}
                title="Enter a token to join someone's care network"
              >
                Enter Invite Token
              </button>
            </div>
          </div>

          {selectedClient && (
            <>

              {/* Section Navigation */}
              <div className="section-nav">
                <button
                  className={activeSection === "overview" ? "active" : ""}
                  onClick={() => setActiveSection("overview")}
                >
                  📊 Overview
                </button>
                <button
                  className={activeSection === "tasks" ? "active" : ""}
                  onClick={() => setActiveSection("tasks")}
                >
                  ✓ Care Tasks
                </button>
                <button
                  className={activeSection === "supplies" ? "active" : ""}
                  onClick={() => setActiveSection("supplies")}
                >
                  🛒 Supplies & Purchases
                </button>
                <button
                  className={activeSection === "schedule" ? "active" : ""}
                  onClick={() => setActiveSection("schedule")}
                >
                  📅 Schedule & Shifts
                </button>
                <button
                  className={activeSection === "budget" ? "active" : ""}
                  onClick={() => setActiveSection("budget")}
                >
                  💰 Budget & Reports
                </button>
              </div>

              {/* Section Content */}
              <div className="section-content">
                {activeSection === "overview" && (
                  <OverviewSection client={selectedClient} jwt={jwt} />
                )}
                {activeSection === "tasks" && (
                  <TasksSection client={selectedClient} jwt={jwt} />
                )}
                {activeSection === "supplies" && (
                  <SuppliesSection client={selectedClient} jwt={jwt} />
                )}
                {activeSection === "schedule" && (
                  <ScheduleSection client={selectedClient} jwt={jwt} />
                )}
                {activeSection === "budget" && (
                  <BudgetSection client={selectedClient} jwt={jwt} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateTokenModal && (
        <CreateTokenModal
          isOpen={showCreateTokenModal}
          onClose={() => setShowCreateTokenModal(false)}
          selectedClient={selectedClient}
          jwt={jwt}
          user={me}
        />
      )}

      {showEnterTokenModal && (
        <EnterTokenModal
          isOpen={showEnterTokenModal}
          onClose={() => setShowEnterTokenModal(false)}
          jwt={jwt}
          onSuccess={() => {
            refresh(); // Refresh client list
            setShowEnterTokenModal(false);
          }}
        />
      )}

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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          text-align: center;
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

        .section-nav {
          display: flex;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
        }

        .section-nav button {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          color: #64748b;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .section-nav button:hover {
          background: #f8fafc;
          color: #374151;
        }

        .section-nav button.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: #f8fafc;
        }

        .section-content {
          padding: 2rem;
          min-height: 400px;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 16px 16px 0 0;
        }

        .step-number {
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.5rem;
          margin-right: 2rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          position: relative;
        }

        .step-number::after {
          content: '';
          position: absolute;
          inset: -2px;
          padding: 2px;
          background: linear-gradient(135deg, #667eea, #764ba2);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .step-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .step-button.disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          pointer-events: none;
          box-shadow: none;
          transform: none;
        }

        .step-button::after {
          content: '→';
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
          content: '💡';
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

          .section-nav {
            flex-direction: column;
          }

          .section-nav button {
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            border-right: none;
          }

          .section-nav button.active {
            border-bottom-color: #e2e8f0;
            border-left: 3px solid #667eea;
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

// Enhanced Overview Section with real data
function OverviewSection({ client, jwt }) {
  const [overviewData, setOverviewData] = React.useState({
    tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
    supplies: { total: 0, needsPurchase: 0, lowStock: 0 },
    budget: { spent: 0, allocated: 0, remaining: 0 },
    recentActivity: [],
    alerts: [],
    accessRequests: [],
    loading: true,
    error: null
  });

  // Fetch overview data for the selected client
  React.useEffect(() => {
    if (!client?._id || !jwt) return;

    const fetchOverviewData = async () => {
      setOverviewData(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Fetch multiple endpoints in parallel
        const [tasksRes, suppliesRes, budgetRes, accessRequestsRes] = await Promise.all([
          fetch(`/api/care-tasks/client/${client._id}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          }),
          fetch(`/api/care-need-items/client/${client._id}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          }),
          fetch(`/api/budget/client/${client._id}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          }).catch(() => ({ ok: false })), // Budget endpoint might not exist
          fetch(`/api/access-requests/incoming`, {
            headers: { Authorization: `Bearer ${jwt}` }
          }).catch(() => ({ ok: false })) // Access requests might fail
        ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const supplies = suppliesRes.ok ? await suppliesRes.json() : [];
        const budget = budgetRes?.ok ? await budgetRes.json() : null;
        const accessRequests = accessRequestsRes?.ok ? await accessRequestsRes.json() : [];

        // Process tasks data
        const taskStats = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'Complete').length,
          pending: tasks.filter(t => t.status === 'Scheduled').length,
          overdue: tasks.filter(t => t.status === 'Missed').length
        };

        // Process supplies data
        const supplyStats = {
          total: supplies.length,
          needsPurchase: supplies.filter(s => s.status === 'pending').length,
          lowStock: supplies.filter(s => s.priority === 'high').length
        };

        // Process budget data
        const budgetStats = budget ? {
          spent: budget.totalSpent || 0,
          allocated: budget.totalBudget || 0,
          remaining: (budget.totalBudget || 0) - (budget.totalSpent || 0)
        } : { spent: 0, allocated: 0, remaining: 0 };

        // Generate recent activity
        const recentActivity = [
          ...tasks.slice(0, 3).map(t => ({
            type: 'task',
            message: `Task "${t.title}" ${t.status === 'Complete' ? 'completed' : 'updated'}`,
            time: new Date(t.updatedAt || t.createdAt).toLocaleString()
          })),
          ...supplies.slice(0, 2).map(s => ({
            type: 'supply',
            message: `Supply "${s.name}" needs attention`,
            time: new Date(s.updatedAt || s.createdAt).toLocaleString()
          }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

        // Generate alerts
        const alerts = [];
        if (accessRequests.length > 0) {
          alerts.push({ type: 'urgent', message: `${accessRequests.length} access request(s) pending approval` });
        }
        if (taskStats.overdue > 0) {
          alerts.push({ type: 'warning', message: `${taskStats.overdue} task(s) overdue` });
        }
        if (supplyStats.lowStock > 0) {
          alerts.push({ type: 'warning', message: `${supplyStats.lowStock} supply item(s) running low` });
        }
        if (budgetStats.remaining < 0) {
          alerts.push({ type: 'error', message: `Budget exceeded by $${Math.abs(budgetStats.remaining).toFixed(2)}` });
        }
        if (alerts.length === 0) {
          alerts.push({ type: 'success', message: 'All systems running smoothly' });
        }

        setOverviewData({
          tasks: taskStats,
          supplies: supplyStats,
          budget: budgetStats,
          recentActivity,
          alerts,
          accessRequests,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching overview data:', error);
        setOverviewData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load overview data'
        }));
      }
    };

    fetchOverviewData();
  }, [client?._id, jwt]);

  if (overviewData.loading) {
    return (
      <div className="overview-loading">
        <h3>📊 Care Overview for {client.name}</h3>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (overviewData.error) {
    return (
      <div className="overview-error">
        <h3>📊 Care Overview for {client.name}</h3>
        <p>Error: {overviewData.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const { tasks, supplies, budget, recentActivity, alerts, accessRequests } = overviewData;

  return (
    <div className="overview-section">
      <h3>📊 Care Overview for {client.name}</h3>

      {/* Access Requests Widget - Only show if there are pending requests */}
      {accessRequests.length > 0 && (
        <AccessRequestsWidget requests={accessRequests} jwt={jwt} onUpdate={() => window.location.reload()} />
      )}

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <h4>📋 Care Tasks</h4>
            <span className="metric-total">{tasks.total}</span>
          </div>
          <div className="metric-breakdown">
            <div className="metric-item">
              <span className="metric-label">Completed</span>
              <span className="metric-value success">{tasks.completed}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Pending</span>
              <span className="metric-value pending">{tasks.pending}</span>
            </div>
            {tasks.overdue > 0 && (
              <div className="metric-item">
                <span className="metric-label">Overdue</span>
                <span className="metric-value error">{tasks.overdue}</span>
              </div>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h4>🛒 Supplies</h4>
            <span className="metric-total">{supplies.total}</span>
          </div>
          <div className="metric-breakdown">
            <div className="metric-item">
              <span className="metric-label">Need Purchase</span>
              <span className="metric-value warning">{supplies.needsPurchase}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Low Stock</span>
              <span className="metric-value error">{supplies.lowStock}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h4>💰 Budget</h4>
            <span className="metric-total">${budget.allocated.toFixed(0)}</span>
          </div>
          <div className="metric-breakdown">
            <div className="metric-item">
              <span className="metric-label">Spent</span>
              <span className="metric-value">${budget.spent.toFixed(0)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Remaining</span>
              <span className={`metric-value ${budget.remaining < 0 ? 'error' : 'success'}`}>
                ${budget.remaining.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h4>🚨 Alerts & Notifications</h4>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert alert-${alert.type}`}>
                <span className="alert-icon">
                  {alert.type === 'success' ? '✅' : alert.type === 'warning' ? '⚠️' : '🚨'}
                </span>
                <span className="alert-message">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="activity-section">
          <h4>⏱️ Recent Activity</h4>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-icon">
                  {activity.type === 'task' ? '📋' : '🛒'}
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

        .overview-loading, .overview-error {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .metric-header h4 {
          margin: 0;
          font-size: 1rem;
          color: #374151;
        }

        .metric-total {
          font-size: 1.75rem;
          font-weight: 700;
          color: #667eea;
        }

        .metric-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .metric-value {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .metric-value.success { color: #10b981; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.error { color: #ef4444; }
        .metric-value.pending { color: #6b7280; }

        .alerts-section, .activity-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .alerts-list, .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
        }

        .alert-success { background: #ecfdf5; border-left: 4px solid #10b981; }
        .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .alert-error { background: #fef2f2; border-left: 4px solid #ef4444; }

        .alert-message {
          color: #374151;
          font-weight: 500;
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
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .metric-breakdown {
            gap: 0.75rem;
          }
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
      const response = await fetch(`/api/access-requests/${requestId}/decision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ approve }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to process request");
        return;
      }

      // Refresh the data
      onUpdate();
    } catch (error) {
      alert("Failed to process request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="access-requests-widget">
      <div className="widget-header">
        <h4>{requests.length} Access Request{requests.length !== 1 ? 's' : ''} Awaiting Your Review</h4>
      </div>

      <div className="requests-list">
        {requests.slice(0, 3).map((request) => (
          <div key={request._id} className="request-item">
            <div className="request-info">
              <div className="requester">
                <span className="name">{request.requesterName || request.requesterEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span className="role-badge">{request.requesterRole}</span>
              </div>
              <div className="request-details">
                <span className="email">{request.requesterEmail}</span>
                {request.organizationName && <span className="organization">from {request.organizationName}</span>}
                {request.message && <span className="message">"{request.message}"</span>}
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
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
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

        .approve-btn, .reject-btn {
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

        .approve-btn:disabled, .reject-btn:disabled {
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
      <a href="/sub-elements" className="legacy-link">→ View in current Sub-elements page</a>

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
      <a href="/shift-allocation" className="legacy-link">→ View in current Shift Allocation page</a>

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
      <a href="/budget-reports" className="legacy-link">→ View in current Budget Reports page</a>

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

// Create Token Modal Component
function CreateTokenModal({ isOpen, onClose, selectedClient, jwt, user }) {
  const [tokenType, setTokenType] = React.useState("FAMILY_TOKEN");
  const [maxUses, setMaxUses] = React.useState(1);
  const [expiresInDays, setExpiresInDays] = React.useState(7);
  const [generatedToken, setGeneratedToken] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = async () => {
    if (!selectedClient) {
      alert("Please select a client first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          type: tokenType,
          organizationId: user.organizationId,
          personIds: [selectedClient._id],
          maxUses,
          expiresInDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate token");
      }

      const data = await response.json();
      setGeneratedToken(data.token);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    alert("Token copied to clipboard!");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Invite Token</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!generatedToken ? (
            <>
              <p>Create an invite token for <strong>{selectedClient?.name}</strong></p>

              <div className="form-group">
                <label>Token Type:</label>
                <select value={tokenType} onChange={(e) => setTokenType(e.target.value)}>
                  <option value="FAMILY_TOKEN">Family Token</option>
                  <option value="MANAGER_TOKEN">Manager Token</option>
                  <option value="STAFF_TOKEN">Staff Token</option>
                </select>
              </div>

              <div className="form-group">
                <label>Maximum Uses:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Expires in (days):</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                />
              </div>

              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Token"}
              </button>
            </>
          ) : (
            <div className="token-result">
              <h4>Token Generated Successfully!</h4>
              <div className="token-display">
                <code>{generatedToken}</code>
              </div>
              <div className="token-actions">
                <button className="copy-btn" onClick={copyToClipboard}>
                  Copy Token
                </button>
                <button className="done-btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
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
            max-width: 500px;
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

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
          }

          .generate-btn {
            width: 100%;
            padding: 0.75rem;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
          }

          .generate-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .token-result {
            text-align: center;
          }

          .token-display {
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
            word-break: break-all;
          }

          .token-display code {
            color: #1f2937;
            font-weight: 600;
          }

          .token-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .copy-btn,
          .done-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
          }

          .copy-btn {
            background: #3b82f6;
            color: white;
          }

          .done-btn {
            background: #6b7280;
            color: white;
          }
        `}</style>
      </div>
    </div>
  );
}

// Enter Token Modal Component
function EnterTokenModal({ isOpen, onClose, jwt, onSuccess }) {
  const [token, setToken] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      alert("Please enter a token");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          token: token.trim(),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit access request");
      }

      alert("Access request submitted successfully!");
      onSuccess();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enter Invite Token</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Invite Token:</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your invite token here"
                required
              />
            </div>

            <div className="form-group">
              <label>Message (optional):</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message to your access request"
                rows="3"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Requesting..." : "Request Access"}
            </button>
          </form>
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
            max-width: 500px;
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

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
          }

          .form-group input,
          .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            box-sizing: border-box;
          }

          .submit-btn {
            width: 100%;
            padding: 0.75rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
          }

          .submit-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

// Organization Management Modal Component
function OrganizationManagementModal({ isOpen, onClose, organizationData, user, jwt, onSuccess }) {
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showChangeOrg, setShowChangeOrg] = React.useState(false);
  const [newOrgId, setNewOrgId] = React.useState('');
  const [isChanging, setIsChanging] = React.useState(false);

  const handleLeaveOrganization = async () => {
    setIsLeaving(true);
    try {
      const response = await fetch('/api/organizations/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave organization');
      }

      alert('Successfully left organization');
      onSuccess();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleChangeOrganization = async () => {
    if (!newOrgId.trim()) {
      alert('Please enter an organization ID');
      return;
    }

    setIsChanging(true);
    try {
      const response = await fetch('/api/organizations/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          newOrganizationId: newOrgId.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change organization');
      }

      alert('Successfully changed organization');
      onSuccess();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsChanging(false);
      setShowChangeOrg(false);
      setNewOrgId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Organization</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
              <p className="action-description">
                You can change to a different organization using its ID, or leave your current organization.
              </p>

              <div className="action-buttons">
                {/* Change Organization */}
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
                    <p className="form-description">Enter the ID of the organization you want to join:</p>
                    <input
                      type="text"
                      value={newOrgId}
                      onChange={(e) => setNewOrgId(e.target.value)}
                      placeholder="Enter organization ID"
                      className="org-id-input"
                    />
                    <div className="form-actions">
                      <button
                        className="confirm-change-btn"
                        onClick={handleChangeOrganization}
                        disabled={isChanging || !newOrgId.trim()}
                      >
                        {isChanging ? 'Changing...' : 'Change Organization'}
                      </button>
                      <button
                        className="cancel-change-btn"
                        onClick={() => {
                          setShowChangeOrg(false);
                          setNewOrgId('');
                        }}
                        disabled={isChanging}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
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
                    <p className="warning-text">
                      ⚠️ Are you sure you want to leave "{organizationData?.name}"?
                      This will remove your access to all clients and data in this organization.
                    </p>
                    <div className="confirm-actions">
                      <button
                        className="confirm-leave-btn"
                        onClick={handleLeaveOrganization}
                        disabled={isLeaving}
                      >
                        {isLeaving ? 'Leaving...' : 'Yes, Leave Organization'}
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

          .org-id-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            margin-bottom: 1rem;
            box-sizing: border-box;
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

export default FamilyDashboard;