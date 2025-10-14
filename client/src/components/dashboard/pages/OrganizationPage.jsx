import React, { useState, useEffect, useMemo } from "react";
import { BiBuilding, BiEdit, BiLogOut } from "react-icons/bi";
import NavigationTab from "../../NavigationTab";
import useAuth from "../hooks/useAuth";

function OrganizationPage() {
  const { me, setMe } = useAuth();
  const jwt = localStorage.getItem("jwt");

  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgErr, setOrgErr] = useState("");
  const [pendingOrgId, setPendingOrgId] = useState("");
  const [orgSaveMsg, setOrgSaveMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Load organizations on mount
  useEffect(() => {
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
        setOrgSaveMsg("Please select an organisation.");
        setIsProcessing(false);
        return;
      }

      // No-op if same org selected
      if (me?.organizationId && pendingOrgId === String(me.organizationId)) {
        setOrgSaveMsg("You're already in this organisation. No changes made.");
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
            "Join this organisation?\n\n" +
            "Your clients and their budget plans will be moved to this organisation.\n\n" +
            "Click OK to proceed.";
        } else if (isSwitchingOrgs) {
          confirmMessage =
            "Switch to a different organisation?\n\n" +
            "Your clients and their budget plans will be moved to the new organisation.\n" +
            "Staff and admin access from your current organisation will be revoked.\n\n" +
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
            "Switch to a different organisation?\n\n" +
            "You will leave your current organisation.\n" +
            "Your access to clients in the current organisation will be revoked.\n\n" +
            "Click OK to proceed.";
        } else {
          confirmMessage =
            "Join this organisation?\n\n" + "Click OK to proceed.";
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
      if (!r.ok) throw new Error(d.error || "Failed to save organisation");

      // Success
      const chosenName =
        orgs.find((o) => o._id === pendingOrgId)?.name || "Organisation";

      if (d.cascade) {
        const c = d.cascade;
        if (isFirstTimeJoining) {
          setOrgSaveMsg(
            `Successfully joined "${chosenName}". ` +
              `Moved: ${c.personsMoved} client${
                c.personsMoved !== 1 ? "s" : ""
              }, ` +
              `${c.budgetPlansMoved} budget plan${
                c.budgetPlansMoved !== 1 ? "s" : ""
              }, ` +
              `${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}. ` +
              (c.familyMoved > 0
                ? `${c.familyMoved} family/PoA member${
                    c.familyMoved !== 1 ? "s" : ""
                  } also joined.`
                : "")
          );
        } else {
          setOrgSaveMsg(
            `Successfully switched to "${chosenName}". ` +
              `Moved: ${c.personsMoved} client${
                c.personsMoved !== 1 ? "s" : ""
              }, ` +
              `${c.budgetPlansMoved} budget plan${
                c.budgetPlansMoved !== 1 ? "s" : ""
              }, ` +
              `${c.tasksMoved} task${c.tasksMoved !== 1 ? "s" : ""}. ` +
              (c.familyMoved > 0 ? `${c.familyMoved} family/PoA moved. ` : "") +
              (c.staffRevoked > 0
                ? `${c.staffRevoked} staff/admin access${
                    c.staffRevoked !== 1 ? "es" : ""
                  } revoked.`
                : "")
          );
        }
      } else {
        setOrgSaveMsg(
          isFirstTimeJoining
            ? `Successfully joined "${chosenName}".`
            : `Successfully switched to "${chosenName}".`
        );
      }

      // Refresh user data
      await refreshMe();
      setEditing(false);
    } catch (e) {
      setOrgSaveMsg("Error: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!me?.organizationId) {
      setOrgSaveMsg("You are not currently in an organisation.");
      return;
    }

    // Role-specific confirmation messages
    let confirmMessage;

    if (me.role === "Family" || me.role === "PoA") {
      confirmMessage =
        "Leave this organisation?\n\n" +
        "Your clients and their data will leave with you.\n" +
        "• Your clients will no longer be in any organisation\n" +
        "• Budget plans and tasks will remain with your clients\n" +
        "• Staff and admin access to your clients will be revoked\n" +
        "• Other family/PoA members of your clients will also leave\n\n" +
        "Click OK to proceed.";
    } else if (me.role === "Admin" || me.role === "GeneralCareStaff") {
      confirmMessage =
        "Leave this organisation?\n\n" +
        "You will lose access to all clients in this organisation.\n" +
        "• Your access to current clients will be revoked\n" +
        "• Clients will remain in the organisation\n\n" +
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
      if (!r.ok) throw new Error(d.error || "Failed to leave organisation");

      // Show success message based on user type
      let successMsg;

      if (d.userType === "family_poa" && d.cascade) {
        const c = d.cascade;
        successMsg =
          "Successfully left organisation. " +
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
          `Successfully left organisation. ` +
          `Your access to ${c.linksRevoked} client${
            c.linksRevoked !== 1 ? "s" : ""
          } revoked.`;
      } else {
        successMsg = "You have successfully left the organisation.";
      }

      setOrgSaveMsg(successMsg);
      setPendingOrgId("");

      // Refresh user data
      await refreshMe();
    } catch (e) {
      setOrgSaveMsg("Error leaving organisation: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setPendingOrgId(me?.organizationId ? String(me.organizationId) : "");
    setOrgSaveMsg("");
  };

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="organization-container">
          <div className="org-header">
            <BiBuilding className="org-icon" />
            <h1>Organization Settings</h1>
          </div>

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
              <div className="no-org-info">
                <p className="warning-text">
                  You are not currently associated with any organization.
                </p>
                {!editing && (
                  <button
                    className="btn-primary"
                    onClick={() => setEditing(true)}
                    disabled={isProcessing}
                  >
                    <BiBuilding /> Join Organization
                  </button>
                )}
              </div>
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
                  <li>You can grant access to manager of the organization.</li>
                  <li>Changing organizations will migrate all your clients</li>
                  <li>
                    You can grant or revoke access to any worker and staff of
                    the organization
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
          background: #f3f4f6;
        }

        .page-main {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .organization-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .org-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .org-icon {
          font-size: 2.5rem;
          color: #3b82f6;
        }

        .org-header h1 {
          margin: 0;
          color: #111827;
          font-size: 2rem;
        }

        .org-status-card,
        .org-edit-card,
        .info-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .org-status-card h2,
        .org-edit-card h3,
        .info-card h3 {
          margin: 0 0 1rem 0;
          color: #111827;
        }

        .current-org-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .org-name,
        .org-id {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label {
          font-weight: 600;
          color: #6b7280;
          min-width: 100px;
        }

        .value {
          color: #111827;
          font-size: 1rem;
        }

        .org-id code {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .org-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .no-org-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .warning-text {
          color: #dc2626;
          font-weight: 600;
          margin: 0;
        }

        .info-text {
          color: #6b7280;
          margin: 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .org-select {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          background: white;
        }

        .org-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .migration-warning {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 1rem;
          color: #92400e;
        }

        .migration-warning strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .migration-warning ul {
          margin: 0.5rem 0 0 1.5rem;
          padding: 0;
        }

        .edit-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 0.625rem 1.25rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151 !important;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-danger {
          background: #fee2e2;
          color: #991b1b !important;
          border: 1px solid #fecaca;
        }

        .btn-danger:hover:not(:disabled) {
          background: #fecaca;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-message {
          padding: 1rem;
          border-radius: 0.375rem;
          margin-top: 1rem;
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status-message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .loading {
          color: #6b7280;
          font-style: italic;
          padding: 1rem;
        }

        .error-message {
          color: #dc2626;
          padding: 1rem;
          background: #fee2e2;
          border-radius: 0.375rem;
        }

        .info-content {
          color: #374151;
        }

        .info-content h4 {
          margin: 1rem 0 0.5rem 0;
          color: #111827;
        }

        .info-content ul {
          margin: 0.5rem 0 0 1.5rem;
          padding: 0;
          color: #6b7280;
        }

        .info-content li {
          margin-bottom: 0.25rem;
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }

          .org-actions,
          .edit-actions {
            flex-direction: column;
          }

          button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default OrganizationPage;
