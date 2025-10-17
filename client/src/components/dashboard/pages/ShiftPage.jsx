import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import ShiftAllocation from "../Shift/ShiftAllocation";
import ShiftCalendar from "../Shift/ShiftCalendar";
import ShiftSettingsManager from "../Shift/ShiftSettingsManager";
import { useClients } from "../hooks/useClients";

function ShiftPage() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  // Load all clients linked to the current user (with relationshipType merged in)
  const { clients, loading, error } = useClients(me, jwt);
  
  const [personId, setPersonId] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // default to first client (if linked to multiple)
  React.useEffect(() => {
    if (!personId && clients?.length) setPersonId(clients[0]._id);
  }, [clients, personId]);

  const bump = () => setRefreshKey((k) => k + 1);

  const onChangeClient = (e) => {
    setPersonId(e.target.value);
  };

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="shift-page-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Shift Allocation</h1>
          </div>

          {/* Loading and Error States */}
          {loading && <div className="loading-state">Loading clients…</div>}
          {error && <div className="error-state">{error}</div>}

          {/* Page Content */}
          {!loading && !error && jwt && me && (
            <div className="page-content">
              {/* Client Selection */}
              <div className="client-selection">
                <div className="client-selector-container">
                  <label htmlFor="client-select">Select Client:</label>
                  <select
                    id="client-select"
                    className="client-selector"
                    value={personId}
                    onChange={onChangeClient}
                  >
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {personId && (
                <div className={`shift-content ${me?.role === "Admin" ? "admin-layout" : "user-layout"}`}>
                  {/* Left Column - Shift Allocation (Admin only) */}
                  {me?.role === "Admin" && (
                    <div className="left-column">
                      {/* Tip Box */}
                      <div className="tip-box">
                        <div className="tip-icon">💡</div>
                        <div className="tip-content">
                          <strong>Tip:</strong> Want to change your organization's shift hours? Scroll down and click the "Change Organization Shift Settings" at the bottom of this section.
                        </div>
                      </div>
                      
                      <ShiftAllocation jwt={jwt} personId={personId} onCreated={bump} />
                      
                      {/* Admin-only shift settings management */}
                      {me?.organizationId && (
                        <ShiftSettingsManager jwt={jwt} organizationId={me.organizationId} />
                      )}
                    </div>
                  )}

                  {/* Right Column - Calendar */}
                  <div className="right-column">
                    <div className="calendar-section">
                      <h2 className="section-title">Shift Calendar</h2>
                      <ShiftCalendar
                        jwt={jwt}
                        personId={personId}
                        isAdmin={me?.role === "Admin"}
                        refreshKey={refreshKey}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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

        .shift-page-container {
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


        .loading-state,
        .error-state {
          padding: 3rem;
          text-align: center;
        }

        .error-state {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          margin: 1rem;
          border-radius: 8px;
        }

        .page-content {
          padding: 2rem;
        }

        .client-selection {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .client-selector-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .client-selector-container label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .client-selector {
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          min-width: 250px;
          font-family: "Inter", sans-serif;
        }

        .client-selector:focus {
          outline: none;
          border-color: #8189d2;
          box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
        }


        .shift-content.admin-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
          align-items: start;
        }

        .shift-content.user-layout {
          display: block;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .right-column {
          min-width: 0;
        }

        .calendar-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .section-title {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .tip-box {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .tip-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .tip-content {
          font-size: 0.875rem;
          line-height: 1.5;
          color: #1e40af;
        }

        .tip-content strong {
          font-weight: 600;
          color: #1e3a8a;
        }

        @media (max-width: 1200px) {
          .shift-content.admin-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }

          .page-header {
            padding: 1.5rem;
          }

          .page-header h1 {
            font-size: 1.5rem;
          }

          .page-content {
            padding: 1rem;
          }

          .client-selector-container {
            flex-direction: column;
            align-items: stretch;
          }

          .client-selector {
            min-width: unset;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftPage;
