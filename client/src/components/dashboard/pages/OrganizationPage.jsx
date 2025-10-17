import React, { useState, useEffect, useMemo, useRef } from "react";
import { BiBuilding, BiEdit, BiLogOut } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import NavigationTab from "../../NavigationTab";
import useAuth from "../hooks/useAuth";

function OrganizationPage() {
  const { me, setMe } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgErr, setOrgErr] = useState("");
  const [pendingOrgId, setPendingOrgId] = useState("");
  const [orgSaveMsg, setOrgSaveMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(() => {
    // Check localStorage for success message on mount
    const savedMessage = localStorage.getItem('org_success_message');
    if (savedMessage) {
      localStorage.removeItem('org_success_message');
      return savedMessage;
    }
    return "";
  });
  const skipOrgReload = useRef(false);

  const refreshMe = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
  };

  // Debug: Check if component is mounting/unmounting
  useEffect(() => {
    console.log("OrganizationPage MOUNTED");
    return () => {
      console.log("OrganizationPage UNMOUNTED");
    };
  }, []);

  // Load organizations on mount
  useEffect(() => {
    // Skip reload if we just joined/left an organization
    if (skipOrgReload.current) {
      skipOrgReload.current = false;
      return;
    }

    let active = true;
    (async () => {
      try {
        setLoadingOrgs(true);
        setOrgErr("");
        const r = await fetch("/api/organizations");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load organizations");
        if (!active) return;
        setOrgs(d);

        // Set initial pending org ID
        if (me?.organizationId) {
          setPendingOrgId(String(me.organizationId));
        }
      } catch (e) {
        if (active) setOrgErr(e.message || String(e));
      } finally {
        if (active) setLoadingOrgs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [me?.organizationId]);

  const currentOrg = useMemo(() => {
    if (!me?.organizationId) return null;
    return orgs.find((o) => o._id === String(me.organizationId));
  }, [orgs, me?.organizationId]);

  const handleSaveOrganization = async () => {
    try {
      setOrgSaveMsg("");
      setIsProcessing(true);

      if (!pendingOrgId) {
        setOrgSaveMsg("Please select an organization.");
        setIsProcessing(false);
        return;
      }

      // No-op if same org selected
      if (me?.organizationId && pendingOrgId === String(me.organizationId)) {
        setOrgSaveMsg("You're already in this organization. No changes made.");
        setEditing(false);
        setIsProcessing(false);
        return;
      }

      const isFirstTimeJoining = !me?.organizationId;
      const isSwitchingOrgs =
        me?.organizationId && me.organizationId !== pendingOrgId;
      let migrateClients = false;

      if (me.role === "Family" || me.role === "PoA") {
        let confirmMessage;

        if (isFirstTimeJoining) {
          confirmMessage =
            "Join this organization?\n\n" +
            "Click OK to proceed.";
        } else if (isSwitchingOrgs) {
          confirmMessage =
            "Switch to a different organization?\n\n" +
            "Your clients and their budget plans will be moved to the new organization.\n" +
            "Staff and admin access from your current organization will be revoked.\n\n" +
            "Click OK to proceed.";
        }

        const ok = window.confirm(confirmMessage);
        if (!ok) {
          setOrgSaveMsg("Change cancelled. No updates made.");
          setIsProcessing(false);
          return;
        }
        migrateClients = true;
      } else if (me.role === "Admin" || me.role === "GeneralCareStaff") {
        let confirmMessage;

        if (isSwitchingOrgs) {
          confirmMessage =
            "Switch to a different organization?\n\n" +
            "You will leave your current organization.\n" +
            "Your access to clients in the current organization will be revoked.\n\n" +
            "Click OK to proceed.";
        } else {
          confirmMessage =
            "Join this organization?\n\n" + "Click OK to proceed.";
        }

        const ok = window.confirm(confirmMessage);
        if (!ok) {
          setOrgSaveMsg("Change cancelled. No updates made.");
          setIsProcessing(false);
          return;
        }
      }

      const r = await fetch("/api/users/me/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          organizationId: pendingOrgId,
          migrateClients,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to save organization");

      // Success
      const chosenName =
        orgs.find((o) => o._id === pendingOrgId)?.name || "Organization";

      // Save success message to localStorage to survive component remount
      localStorage.setItem('org_success_message', `Successfully joined "${chosenName}"!`);
      console.log("Success message saved to localStorage:", `Successfully joined "${chosenName}"!`);
      setOrgSaveMsg("");
      setEditing(false);

      // Skip the useEffect reload on next render
      skipOrgReload.current = true;

      // Refresh user data - this will cause component to remount
      await refreshMe();

      // After remount, scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (e) {
      setOrgSaveMsg("Error: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!me?.organizationId) {
      setOrgSaveMsg("You haven’t joined any organization yet.");
      return;
    }

    // Role-specific confirmation messages
    let confirmMessage;

    if (me.role === "Family" || me.role === "PoA") {
      confirmMessage =
        "Leave this organization?\n\n" +
        "Your clients and their data will leave with you.\n" +
        "• Your clients will no longer be in any organization\n" +
        "• Budget plans and tasks will remain with your clients\n" +
        "• Staff and admin access to your clients will be revoked\n" +
        "• Other family/PoA members of your clients will also leave\n\n" +
        "Click OK to proceed.";
    } else if (me.role === "Admin" || me.role === "GeneralCareStaff") {
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

    try {
      setIsProcessing(true);
      setOrgSaveMsg("");

      const r = await fetch("/api/users/me/leave-organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to leave organization");

      // Show success message based on user type
      let successMsg;

      if (d.userType === "family_poa" && d.cascade) {
        const c = d.cascade;
        successMsg =
          "Successfully left organization. " +
          `Moved ${c.personsMoved} client${
            c.personsMoved !== 1 ? "s" : ""
          } out. ` +
          `${c.budgetPlansMoved} budget plan${
            c.budgetPlansMoved !== 1 ? "s" : ""
          }, ` +
          `${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}. ` +
          (c.familyMoved > 0 ? `${c.familyMoved} family/PoA also left. ` : "") +
          (c.staffRevoked > 0
            ? `${c.staffRevoked} staff/admin access revoked.`
            : "");
      } else if (d.userType === "admin_staff" && d.cascade) {
        const c = d.cascade;
        successMsg =
          `Successfully left organization. ` +
          `Your access to ${c.linksRevoked} client${
            c.linksRevoked !== 1 ? "s" : ""
          } revoked.`;
      } else {
        successMsg = "You have successfully left the organization.";
      }

      setOrgSaveMsg(successMsg);
      setPendingOrgId("");

      // Refresh user data
      await refreshMe();
    } catch (e) {
      setOrgSaveMsg("Error leaving organization: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setPendingOrgId(me?.organizationId ? String(me.organizationId) : "");
    setOrgSaveMsg("");
  };

  // Debug log
  console.log("Rendering OrganizationPage, successMessage:", successMessage);

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="organization-container">
          <div className="org-header">
            <BiBuilding className="org-icon" />
            <h1>Organization Settings</h1>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="success-message">
              <div className="success-content">
                <span className="success-icon">✓</span>
                <div>
                  <p className="success-text">{successMessage}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="return-dashboard-btn"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Organization Status */}
          <div className="org-status-card">
            <h2>Current Organization</h2>
            {currentOrg ? (
              <div className="current-org-info">
                <div className="org-name">
                  <span className="label">Organization:</span>
                  <span className="value">{currentOrg.name}</span>
                </div>
                <div className="org-id">
                  <span className="label">ID:</span>
                  <code className="value">{currentOrg._id}</code>
                </div>
                {!editing && (
                  <div className="org-actions">
                    {(me.role === "Family" || me.role === "PoA") && (
                      <button
                        className="btn-secondary"
                        onClick={() => setEditing(true)}
                        disabled={isProcessing}
                      >
                        <BiEdit /> Change Organization
                      </button>
                    )}

                    <button
                      className="btn-danger"
                      onClick={handleLeaveOrganization}
                      disabled={isProcessing}
                    >
                      <BiLogOut /> Leave Organization
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="no-org-info">
                  <p className="warning-text">
                    You haven't joined any organization yet.
                  </p>
                </div>
                {!editing && (
                  <button
                    className="btn-primary"
                    onClick={() => setEditing(true)}
                    disabled={isProcessing}
                  >
                    <BiBuilding /> Join Organization
                  </button>
                )}
              </>
            )}
          </div>

          {/* Edit Organization Section */}
          {editing && (
            <div className="org-edit-card">
              <h3>
                {currentOrg ? "Change Organization" : "Join Organization"}
              </h3>

              {loadingOrgs ? (
                <div className="loading">Loading organizations...</div>
              ) : orgErr ? (
                <div className="error-message">Error: {orgErr}</div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="orgSelect">Select Organization</label>
                    <select
                      id="orgSelect"
                      className="org-select"
                      value={pendingOrgId}
                      onChange={(e) => setPendingOrgId(e.target.value)}
                      disabled={isProcessing}
                    >
                      <option value="">— Select organization —</option>
                      {orgs.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(me?.role === "Family" || me?.role === "PoA") &&
                    currentOrg &&
                    pendingOrgId &&
                    pendingOrgId !== String(me.organizationId) && (
                      <div className="migration-warning">
                        <strong>Important:</strong> Changing organizations will:
                        <ul>
                          <li>Move all your clients to the new organization</li>
                          <li>Transfer associated family/PoA members</li>
                          <li>Revoke all staff/admin access to your clients</li>
                        </ul>
                      </div>
                    )}

                  <div className="edit-actions">
                    <button
                      className="btn-primary"
                      onClick={handleSaveOrganization}
                      disabled={!pendingOrgId || isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Save"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Status Messages */}
          {orgSaveMsg && (
            <div
              className={`status-message ${
                orgSaveMsg.includes("Error") ? "error" : "success"
              }`}
            >
              {orgSaveMsg}
            </div>
          )}

          {/* Information Section */}
          <div className="info-card">
            <h3>About Organizations</h3>
            <div className="info-content">
              <p>
                Organizations help take care clients, manage workers and
                organize resources.
              </p>

              <h4>Your Role: {me?.role || "Not Set"}</h4>
              {(me?.role === "Family" || me?.role === "PoA") && (
                <ul>
                  <li>You can grant client access to the organization's representative.</li>
                  <li>If you change organizations, all yur clients will be moved to the new one.</li>
                  <li>
                    You can grant or revoke access for any staff within 
                    the organization.
                  </li>
                </ul>
              )}
              {me?.role === "Admin" && (
                <ul>
                  <li>You can manage organization-wide settings</li>
                  <li>You can oversee clients within the organization</li>
                  <li>
                    You can manage grant access and allocating shifts for
                    workers in organization
                  </li>
                </ul>
              )}
              {me?.role === "GeneralCareStaff" && (
                <ul>
                  <li>
                    You can view and assist care tasks associated to the client
                  </li>
                  <li>Your access is managed by organization manager users</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .page-main {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .organization-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .org-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .org-icon {
          font-size: 2.5rem;
          color: #8189d2;
        }

        .org-header h1 {
          margin: 0;
          color: #1a202c;
          font-size: 2rem;
          font-weight: 700;
        }

        .org-status-card,
        .org-edit-card,
        .info-card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .org-status-card:hover,
        .org-edit-card:hover,
        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0, 0, 0, 0.08);
        }

        .org-status-card h2,
        .org-edit-card h3,
        .info-card h3 {
          margin: 0 0 1.5rem 0;
          color: #1a202c;
          font-weight: 700;
          font-size: 1.5rem;
          text-align: left;
        }

        .current-org-info {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .org-name,
        .org-id {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .label {
          font-weight: 600;
          color: #1a202c;
          min-width: 120px;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .value {
          color: #1a202c;
          font-size: 1.125rem;
          font-weight: 500;
        }

        .org-id code {
          background: #e9ecef;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.875rem;
          color: #495057;
        }

        .org-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        .no-org-info {
          padding: 1.5rem;
          background: #fef3c7;
          border-radius: 12px;
          border: 2px solid #fbbf24;
          margin-bottom: 1.5rem;
        }

        .warning-text {
          color: #92400e;
          font-weight: 600;
          margin: 0;
          font-size: 1.125rem;
        }

        .info-text {
          color: #6b7280;
          margin: 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .org-select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          background: white;
          color: #111827;
          font-family: "Segoe UI", Arial, sans-serif;
          outline: none;
          transition: all 0.2s ease;
        }

        .org-select:focus {
          border-color: #8189d2;
          box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
        }

        .org-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f3f4f6;
        }

        .migration-warning {
          background: #fef3c7;
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          color: #92400e;
        }

        .migration-warning strong {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 1.125rem;
        }

        .migration-warning ul {
          margin: 0.75rem 0 0 1.5rem;
          padding: 0;
          line-height: 1.6;
        }

        .edit-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 0.875rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-size: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .btn-primary {
          background: #8189d2;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #6d76c4;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(129, 137, 210, 0.4);
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151 !important;
          border: 2px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-danger {
          background: #fee2e2;
          color: #991b1b !important;
          border: 2px solid #fecaca;
        }

        .btn-danger:hover:not(:disabled) {
          background: #fecaca;
          transform: translateY(-2px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .status-message {
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          margin-top: 1rem;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 2px solid #a7f3d0;
        }

        .status-message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 2px solid #fecaca;
        }

        .loading {
          color: #6b7280;
          font-style: italic;
          padding: 1.5rem;
          text-align: center;
        }

        .error-message {
          color: #991b1b;
          padding: 1.25rem 1.5rem;
          background: #fee2e2;
          border-radius: 12px;
          border: 2px solid #fecaca;
          font-weight: 500;
        }

        .info-content {
          color: #374151;
          line-height: 1.7;
        }

        .info-content h4 {
          margin: 1.5rem 0 0.75rem 0;
          color: #1a202c;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .info-content p {
          margin-bottom: 1rem;
          font-size: 1.125rem;
          color: #1a202c;
          font-weight: 500;
        }

        .info-content ul {
          margin: 0.75rem 0 0 1.5rem;
          padding: 0;
          color: #1a202c;
        }

        .info-content li {
          margin-bottom: 0.5rem;
        }

        .success-message {
          background: #10b981;
          color: white;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
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
          color: #10b981;
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
          color: #10b981!important;
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

        @media (max-width: 768px) {
          .page-main {
            padding: 1.5rem 1rem;
          }

          .organization-container {
            gap: 1.5rem;
          }

          .org-status-card,
          .org-edit-card,
          .info-card {
            padding: 1.5rem;
          }

          .org-header h1 {
            font-size: 1.5rem;
          }

          .org-actions,
          .edit-actions {
            flex-direction: column;
          }

          button {
            width: 100%;
            justify-content: center;
          }

          .org-name,
          .org-id {
            flex-direction: column;
            align-items: flex-start;
          }

          .label {
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}

export default OrganizationPage;
