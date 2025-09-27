import React from "react";
import ShiftAllocation from "./ShiftAllocation.jsx";
import ShiftCalendar from "./ShiftCalendar.jsx";
import ShiftSettingsManager from "./ShiftSettingsManager.jsx";

function ShiftScheduler({ jwt, me, clients }) {
  const [personId, setPersonId] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // default to first client (if linked to multiple)
  React.useEffect(() => {
    if (!personId && clients?.length) setPersonId(clients[0]._id);
  }, [clients, personId]);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="shift-scheduler">
      <div className="scheduler-header">
        <h3>Shift Scheduling</h3>
        <div className="header-actions">
          <select
            className="client-selector"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn-refresh" onClick={bump} disabled={!personId}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Admin-only shift settings management */}
      {me?.role === "Admin" && me?.organizationId && (
        <ShiftSettingsManager jwt={jwt} organizationId={me.organizationId} />
      )}

      {/* Admin-only shift allocator */}
      {me?.role === "Admin" && personId && (
        <ShiftAllocation jwt={jwt} personId={personId} onCreated={bump} />
      )}

      {/* Everyone linked can view the calendar */}
      {personId && (
        <ShiftCalendar
          jwt={jwt}
          personId={personId}
          isAdmin={me?.role === "Admin"}
          refreshKey={refreshKey}
        />
      )}

      <style jsx>{`
        .shift-scheduler {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          max-width: 1000px;
        }

        .scheduler-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .scheduler-header h3 {
          margin: 0;
          color: #111827;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .client-selector {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
          font-size: 0.875rem;
          min-width: 200px;
        }

        .client-selector:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-refresh {
          padding: 0.5rem 1rem;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .scheduler-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .client-selector {
            width: 100%;
          }

          .btn-refresh {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default ShiftScheduler;
