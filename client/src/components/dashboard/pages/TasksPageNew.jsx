import React from "react";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";
import CareTaskCreate from "../NewCareTasks/CareTaskCreate";
import CareTaskManagement from "../NewCareTasks/CareTaskManagement";
import { useClients } from "../hooks/useClients";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function TasksPageNew() {
  const { me } = useAuth();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const { clients, loading, error } = useClients(me, jwt);
  const managementRef = React.useRef(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState("");
  const navigate = useNavigate();

  const handleTaskCreated = () => {
    // Trigger reload in management component
    if (managementRef.current?.reloadTasks) {
      managementRef.current.reloadTasks(selectedClient);
    }
    // Close the form after successful creation
    setShowCreateForm(false);
  };

  const handleNavigateToBudget = () => {
    navigate("/budget-and-reports");
  };

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="tasks-page-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Tasks</h1>
          </div>

          {/* Loading and Error States */}
          {loading && <div className="loading-state">Loading clients…</div>}
          {error && <div className="error-state">{error}</div>}

          {/* Page Content */}
          {!loading && !error && jwt && me && (
            <div className="page-content">
              {/* 
              Creation Section - Hidden for GeneralCareStaff */}
              {(me?.role === "Family" || me?.role === "PoA" || me?.role === "Admin") && (
                <div className="left-column">
                  <div className="info-box">
                    <p>
                      The calendar shows current scheduled tasks in the system.
                      You can click on any task to view or change details, mark 
                      the task as complete, reschedule, or delete the task.
                    </p>
                  </div>
                  {showCreateForm ? (
                    <div className="create-section">
                      <CareTaskCreate
                        jwt={jwt}
                        clients={clients}
                        selectedClient={selectedClient}
                        setSelectedClient={setSelectedClient}
                        onTaskCreated={handleTaskCreated}
                        onCancel={() => setShowCreateForm(false)}
                        onNavigateToBudget={handleNavigateToBudget}
                      />
                    </div>
                  ) : (
                    <div className="create-button-container">
                      <button
                        className="create-task-btn"
                        onClick={() => setShowCreateForm(true)}
                      >
                        <FontAwesomeIcon className="plus-icon"icon={faPlus} />
                        <span className="create-task-label">Create Task</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Task Management Section */}
              <div className="management-section">
                <h2 className="section-title">Your Tasks</h2>

                {/* Tip boxes for GeneralCareStaff */}
                {me?.role === "GeneralCareStaff" && (
                  <div className="staff-tips-container">
                    <div className="staff-tip-box">
                      <div className="tip-icon">💡</div>
                      <div className="tip-content">
                        <strong>Quick Tip</strong>
                        <p>
                          View the client's tasks in the calendar below. Click on any task to see details and mark it as complete when finished.
                        </p>
                      </div>
                    </div>
                    <div className="staff-tip-box">
                      <div className="tip-icon">💡</div>
                      <div className="tip-content">
                        <strong>Want to return a purchase?</strong>
                        <p>
                          Click on any completed task and then click the refund button.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <CareTaskManagement
                  ref={managementRef}
                  jwt={jwt}
                  clients={clients}
                  me={me}
                  selectedClient={selectedClient}
                  setSelectedClient={setSelectedClient}
                />
              </div>
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
          max-width: calc(100vw - 200px);
          margin: 0 auto;
          padding: 2rem 1rem;
          /* Ensure content doesn't overlap with nav and print buttons */
          margin-left: 90px;
          margin-right: 110px;
        }

        .tasks-page-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          width: 100%;
          max-width: 100%;
        }
        
        .tasks-page-container * {
          max-width: 100%;
          box-sizing: border-box;
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

        .page-description {
          margin: 0;
          opacity: 0.95;
          font-size: 1rem;
          line-height: 1.6;
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
          display: grid;
          grid-template-columns: 450px 1fr;
          gap: 2rem;
          align-items: start;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* When only management section exists (staff view), make it full width */
        .page-content:has(.management-section:only-child) {
          grid-template-columns: 1fr;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 1rem;
          animation: fadeIn 0.3s ease-in;
        }

        .info-box p {
          margin: 0;
          color: #1e40af;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .create-button-container {
          animation: fadeIn 0.3s ease-in;
        }

        .create-task-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }

        .create-task-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        .create-task-btn:active {
          transform: translateY(0);
        }

        .plus-icon {
          margin-right: 0.5rem;
          font-size: 1.5rem;
          line-height: 1;
        }

        .create-section {
          animation: slideIn 0.3s ease-out;
          position: sticky;
          top: 2rem;
        }

        .management-section {
          animation: fadeIn 0.4s ease-in;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
        }

        .section-title {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .staff-tips-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .staff-tip-box {
          background: #eff6ff;
          border: 2px solid #bfdbfe;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          animation: fadeIn 0.3s ease-in;
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

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 1200px) {
          .page-content {
            grid-template-columns: 1fr;
          }

          .create-section {
            position: static;
          }
          
          .page-main {
            margin-left: 80px;
            margin-right: 90px;
            max-width: calc(100vw - 170px);
          }
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
            margin-left: 70px;
            margin-right: 70px;
            max-width: calc(100vw - 140px);
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
        }
      `}</style>
    </div>
  );
}

export default TasksPageNew;
