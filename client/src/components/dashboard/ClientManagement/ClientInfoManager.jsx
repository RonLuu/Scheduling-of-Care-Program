import React from "react";

function ClientInfoManager({ me, jwt, clients }) {
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [accessLinks, setAccessLinks] = React.useState([]);
  const [accessErr, setAccessErr] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showTokenForm, setShowTokenForm] = React.useState(false);
  const [tokenType, setTokenType] = React.useState(null); // 'MANAGER_TOKEN' or 'FAMILY_TOKEN'
  const [generatedToken, setGeneratedToken] = React.useState("");
  const [tokenError, setTokenError] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  const loadAccessLinks = async (pid) => {
    setIsLoading(true);
    try {
      setAccessErr("");
      const r = await fetch(`/api/person-user-links/by-person/${pid}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load access list");
      setAccessLinks(d);
    } catch (e) {
      setAccessErr(e.message || String(e));
      setAccessLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientChange = (e) => {
    const value = e.target.value;
    setSelectedClientId(value);
    const canManage =
      me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";
    if (value && canManage) loadAccessLinks(value);
  };

  const getMedicalInfoDisplay = (medicalInfo, customFields = []) => {
    if (!medicalInfo || typeof medicalInfo !== "object") return null;
    const info = [];

    if (medicalInfo.problems)
      info.push({ label: "Medical Problems", value: medicalInfo.problems });
    if (medicalInfo.allergies)
      info.push({ label: "Allergies", value: medicalInfo.allergies });
    if (medicalInfo.medications)
      info.push({ label: "Medications", value: medicalInfo.medications });
    if (medicalInfo.mobilityNeeds)
      info.push({ label: "Mobility Needs", value: medicalInfo.mobilityNeeds });
    if (medicalInfo.communicationNeeds)
      info.push({
        label: "Communication",
        value: medicalInfo.communicationNeeds,
      });
    if (medicalInfo.dietaryRequirements)
      info.push({ label: "Dietary", value: medicalInfo.dietaryRequirements });

    const medicalCustomFields = customFields.filter(
      (f) => f.category === "Medical"
    );
    medicalCustomFields.forEach((field) => {
      info.push({ label: field.title, value: field.value });
    });

    return info;
  };

  const getAdditionalInfoDisplay = (customFields = []) => {
    return customFields.filter(
      (f) => f.category === "Additional" || !f.category
    );
  };

  const getAddressDisplay = (address) => {
    if (!address || typeof address !== "object") return "No address provided";
    const parts = [
      address.street,
      address.suburb,
      address.state,
      address.postcode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

  const getEmergencyContactDisplay = (contact) => {
    if (!contact || typeof contact !== "object") return "No emergency contact";
    if (contact.name && contact.phone) {
      return `${contact.name} - ${contact.phone}`;
    } else if (contact.name) {
      return contact.name;
    } else if (contact.phone) {
      return contact.phone;
    }
    return "No emergency contact";
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const shouldShowUser = () => {
    if (!me) return false;
    return me.role === "Admin" || me.role === "Family" || me.role === "PoA";
  };

  const canRevoke = (userLink) => {
    const u = userLink.userId;
    if (!u) return false;
    if (String(u._id) === String(me.id)) return false;

    if (me.role === "Family" || me.role === "PoA") {
      return true;
    }

    if (me.role === "Admin") {
      return u.role === "GeneralCareStaff";
    }

    return false;
  };

  const confirmText = (link) => {
    const target = link?.userId || {};
    const targetLabel = [target.role, target.name || target.email]
      .filter(Boolean)
      .join(" ");
    const isFamily = me.role === "Family" || me.role === "PoA";

    if (isFamily && target.role === "Admin") {
      return `You're about to revoke ${targetLabel}'s access to this client.\n\nThis will ALSO revoke ALL GeneralCareStaff for this client.\n\nContinue?`;
    }
    return `Revoke access for ${targetLabel}?`;
  };

  const revokeAccess = async (link) => {
    const ok = window.confirm(confirmText(link));
    if (!ok) return;

    try {
      const r = await fetch(`/api/person-user-links/${link._id}/revoke`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to revoke");

      let msg = "Access revoked successfully.";
      if (d.cascade && typeof d.cascade.staffRevoked === "number") {
        msg += ` Also revoked ${d.cascade.staffRevoked} staff member access.`;
      }
      alert(msg);

      if (selectedClientId) await loadAccessLinks(selectedClientId);
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  const getActionStatus = (link) => {
    const u = link.userId;
    const isSelf = String(u._id) === String(me.id);
    const allowed = canRevoke(link);

    if (isSelf) {
      return { text: "Current User (You)", type: "self", canAct: false };
    }
    if (allowed) {
      return { text: "Revoke Access", type: "revokable", canAct: true };
    }
    return { text: "Protected User", type: "protected", canAct: false };
  };

  const openTokenModal = (type) => {
    setTokenType(type);
    setShowTokenForm(true);
    setGeneratedToken("");
    setTokenError("");
  };

  const closeTokenModal = () => {
    setShowTokenForm(false);
    setTokenType(null);
    setGeneratedToken("");
    setTokenError("");
  };

  const generateToken = async () => {
    setIsGenerating(true);
    setTokenError("");
    setGeneratedToken("");

    try {
      const body = {
        type: tokenType,
        organizationId: me.organizationId || null,
        personIds: [selectedClientId],
        expiresInDays: 7,
        maxUses: 1,
      };

      // Only include organizationId for MANAGER_TOKEN and STAFF_TOKEN
      if (tokenType === "MANAGER_TOKEN" || me.role === "Admin") {
        body.organizationId = me.organizationId;
      }

      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate token");
      }

      const data = await response.json();
      setGeneratedToken(data.token);
    } catch (error) {
      setTokenError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(generatedToken);
    alert("Token copied to clipboard!");
  };

  const medicalInfoDisplay = selectedClient
    ? getMedicalInfoDisplay(
        selectedClient.medicalInfo,
        selectedClient.customFields || []
      )
    : null;

  const additionalInfoDisplay = selectedClient
    ? getAdditionalInfoDisplay(selectedClient.customFields || [])
    : null;

  const canManageAccess =
    me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";
  const isFamilyOrPoA = me?.role === "Family" || me?.role === "PoA";
  const hasOrganization = me?.organizationId;

  const getTokenModalTitle = () => {
    if (tokenType === "MANAGER_TOKEN") {
      return `Create Admin Invite Token for ${selectedClient?.name}`;
    } else if (tokenType === "FAMILY_TOKEN") {
      return `Create Family/PoA Invite Token for ${selectedClient?.name}`;
    }
    return `Create Invite Token for ${selectedClient?.name}`;
  };

  const getTokenModalDescription = () => {
    if (tokenType === "MANAGER_TOKEN") {
      return (
        <p className="modal-description">
          Generate an invite token to share with an organization administrator.
          This will grant them access to <strong>{selectedClient?.name}</strong>{" "}
          within your organization.
        </p>
      );
    } else if (tokenType === "FAMILY_TOKEN") {
      return (
        <p className="modal-description">
          Generate an invite token to share with another family member or power
          of attorney. This will grant them access to{" "}
          <strong>{selectedClient?.name}</strong>.
        </p>
      );
    } else if (me.role === "Admin") {
      return (
        <p className="modal-description">
          Generate an invite token to share with care staff in your
          organization. This will grant them access to{" "}
          <strong>{selectedClient?.name}</strong>.
        </p>
      );
    }
    return null;
  };

  return (
    <div className="client-info-manager">
      <div className="client-card">
        {canManageAccess && (
          <div className="tip-box">
            <div className="tip-icon">i</div>
            <p>
              <strong>Want to give someone access to a client?</strong> <br />
              Create an invite token to share with other users. Select a client
              below, then click the appropriate "Create Invite Token" button.
            </p>
          </div>
        )}

        <div className="selector-container">
          <div className="client-selector">
            <label>
              Select a client (person with special needs) to view details
            </label>
            <select value={selectedClientId} onChange={handleClientChange}>
              <option value="">— Choose a client—</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.status !== "Active" ? `(${c.status})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && canManageAccess && (
            <div className="token-section">
              {me.role === "Admin" ? (
                <button
                  className="create-token-btn"
                  onClick={() => openTokenModal("STAFF_TOKEN")}
                >
                  Create Invite Token
                </button>
              ) : isFamilyOrPoA ? (
                <div className="token-buttons-group">
                  <button
                    className="create-token-btn"
                    onClick={() => openTokenModal("FAMILY_TOKEN")}
                  >
                    Create Token for Family/PoA
                  </button>
                  {hasOrganization ? (
                    <button
                      className="create-token-btn secondary"
                      onClick={() => openTokenModal("MANAGER_TOKEN")}
                    >
                      Create Token for Admin
                    </button>
                  ) : (
                    <div className="org-required-notice">
                      <span className="notice-icon">⚠</span>
                      <span>
                        To share access with an administrator, you need to{" "}
                        <a href="/organization">join an organization</a>.
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!selectedClientId && (
          <div className="empty-state">
            <p>
              Please select a client from the dropdown above to view their
              information and manage access.
            </p>
          </div>
        )}

        {selectedClient && (
          <>
            <div className="client-info-section">
              <div className="section-header">
                <h3>{selectedClient.name}</h3>
              </div>

              <div className="info-grid">
                <div className="info-block">
                  <h4>Basic Information</h4>
                  {selectedClient.dateOfBirth && (
                    <div className="info-row">
                      <span className="label">Age:</span>
                      <span className="value">
                        {calculateAge(selectedClient.dateOfBirth)} years old
                      </span>
                    </div>
                  )}
                  {selectedClient.sex && (
                    <div className="info-row">
                      <span className="label">Sex:</span>
                      <span className="value">{selectedClient.sex}</span>
                    </div>
                  )}
                  {selectedClient.mobilePhone && (
                    <div className="info-row">
                      <span className="label">Phone:</span>
                      <span className="value">
                        {selectedClient.mobilePhone}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Address:</span>
                    <span className="value">
                      {getAddressDisplay(selectedClient.address)}
                    </span>
                  </div>
                </div>

                <div className="info-block">
                  <h4>Emergency Contact</h4>
                  <div className="info-row">
                    <span className="value">
                      {getEmergencyContactDisplay(
                        selectedClient.emergencyContact
                      )}
                    </span>
                  </div>
                </div>

                {medicalInfoDisplay && medicalInfoDisplay.length > 0 && (
                  <div className="info-block full-width">
                    <h4>Medical Information</h4>
                    <p className="block-description">
                      Includes standard medical fields and any custom medical
                      information added for this client.
                    </p>
                    {medicalInfoDisplay.map((item, index) => (
                      <div key={index} className="info-row">
                        <span className="label">{item.label}:</span>
                        <span className="value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {additionalInfoDisplay && additionalInfoDisplay.length > 0 && (
                  <div className="info-block full-width">
                    <h4>Additional Information</h4>
                    <p className="block-description">
                      Custom information and notes specific to this client.
                    </p>
                    {additionalInfoDisplay.map((field, index) => (
                      <div key={index} className="info-row">
                        <span className="label">{field.title}:</span>
                        <span className="value">{field.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {canManageAccess && (
              <div className="access-section">
                <h3>Access to Client</h3>
                <p className="access-description">
                  These are the list of all users who currently have access to
                  view this client's information. This includes family members,
                  power of attorney, administrators, and general care staff
                  assigned to this client. You can revoke access as needed.
                </p>

                {accessErr && (
                  <div className="error-message">
                    <p>Error: {accessErr}</p>
                  </div>
                )}

                {isLoading && (
                  <p className="loading">Loading access information...</p>
                )}

                {!isLoading && accessLinks.length > 0 && (
                  <div className="access-table-wrapper">
                    <table className="access-table">
                      <thead>
                        <tr>
                          <th align="left">Name</th>
                          <th align="left">Email</th>
                          <th align="left">Role</th>
                          <th align="center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessLinks.filter(shouldShowUser).map((l) => {
                          const u = l.userId;
                          const actionStatus = getActionStatus(l);
                          return (
                            <tr key={l._id}>
                              <td>{u.name || "—"}</td>
                              <td>{u.email}</td>
                              <td>
                                <span
                                  className={`role-badge role-${u.role.toLowerCase()}`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td align="center">
                                {actionStatus.canAct ? (
                                  <button
                                    className="revoke-btn"
                                    onClick={() => revokeAccess(l)}
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <span className="no-action">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLoading && accessLinks.length === 0 && (
                  <p className="no-users">
                    No users have access to this client yet.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showTokenForm && (
        <div className="modal-overlay" onClick={closeTokenModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{getTokenModalTitle()}</h3>
              <button className="modal-close" onClick={closeTokenModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {!generatedToken ? (
                <>
                  {getTokenModalDescription()}

                  <button
                    className="generate-btn"
                    onClick={generateToken}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Generating Token..." : "Generate Token"}
                  </button>

                  {tokenError && (
                    <div className="token-error">
                      <p>Error: {tokenError}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="token-result">
                  <p className="success-message">
                    Token generated successfully!
                  </p>

                  <label>Your Invite Token:</label>
                  <div className="token-display">
                    <code>{generatedToken}</code>
                    <button className="copy-btn" onClick={copyToken}>
                      Copy
                    </button>
                  </div>

                  <p className="token-instructions">
                    Share this token with the user you want to grant access to.
                    They should enter this token on the Clients page to gain
                    access to <strong>{selectedClient?.name}</strong>. This
                    token expires in 7 days and can only be used once.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .client-info-manager {
          width: 100%;
        }

        .client-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }

        h2 {
          margin: 0 0 1.5rem 0;
          color: #111827;
          font-size: 1.5rem;
        }

        .tip-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .tip-icon {
          width: 1.5rem;
          height: 1.5rem;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          font-style: italic;
          flex-shrink: 0;
        }

        .tip-box p {
          margin: 0;
          color: #1e40af;
          font-size: 0.875rem;
          line-height: 1.6;
          flex: 1;
        }

        .tip-box strong {
          font-weight: 600;
        }

        .selector-container {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          margin-bottom: 1.5rem;
        }

        .client-selector {
          flex: 1;
          margin-bottom: 0;
        }

        .client-selector label {
          display: block;
          margin-bottom: 0.5rem;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .client-selector select {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          background: white;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .token-section {
          margin-bottom: 0;
          flex-shrink: 0;
        }

        .token-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .create-token-btn {
          padding: 0.625rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.2);
          white-space: nowrap;
        }

        .create-token-btn:hover {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(129, 137, 210, 0.3);
        }

        .create-token-btn.secondary {
          background: #10b981;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .create-token-btn.secondary:hover {
          background: #059669;
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .org-required-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          font-size: 0.8125rem;
          color: #92400e;
        }

        .notice-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .org-required-notice a {
          color: #b45309;
          font-weight: 600;
          text-decoration: underline;
        }

        .org-required-notice a:hover {
          color: #92400e;
        }

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
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
          font-size: 1.125rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #374151;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-description {
          margin: 0 0 1.5rem 0;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .generate-btn {
          padding: 0.75rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.2);
        }

        .generate-btn:hover:not(:disabled) {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(129, 137, 210, 0.3);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .token-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 0.75rem;
          margin-top: 1rem;
        }

        .token-error p {
          margin: 0;
          color: #991b1b;
          font-size: 0.875rem;
        }

        .success-message {
          background: #d1fae5;
          color: #065f46;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin: 0 0 1.5rem 0;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .token-result {
          margin-top: 0;
        }

        .token-result label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .token-display {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0.75rem;
        }

        .token-display code {
          flex: 1;
          font-family: "Courier New", monospace;
          font-size: 0.875rem;
          color: #374151;
          word-break: break-all;
        }

        .copy-btn {
          padding: 0.5rem 1rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: #6d76c4;
        }

        .token-instructions {
          margin: 0.75rem 0 0 0;
          color: #6b7280;
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .client-info-section {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-header h3 {
          margin: 0;
          color: #111827;
          font-size: 1.25rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .info-block {
          background: white;
          padding: 1rem;
          border-radius: 0.375rem;
        }

        .info-block.full-width {
          grid-column: 1 / -1;
        }

        .info-block h4 {
          margin: 0 0 0.5rem 0;
          color: #4b5563;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .block-description {
          color: #9ca3af;
          font-size: 0.75rem;
          margin: 0 0 0.75rem 0;
          font-style: italic;
        }

        .info-row {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: flex-start;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-row .label {
          font-weight: 500;
          color: #6b7280;
          margin-right: 0.5rem;
          min-width: 140px;
          font-size: 0.875rem;
        }

        .info-row .value {
          color: #111827;
          font-size: 0.875rem;
          flex: 1;
        }

        .access-section {
          border-top: 2px solid #e5e7eb;
          padding-top: 1.5rem;
        }

        .access-section h3 {
          margin: 0 0 1rem 0;
          color: #111827;
          font-size: 1.125rem;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }

        .loading {
          color: #6b7280;
          font-style: italic;
        }

        .access-table-wrapper {
          overflow-x: auto;
        }

        .access-table {
          width: 100%;
          border-collapse: collapse;
        }

        .access-table th {
          padding: 0.75rem;
          background: #f3f4f6;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
        }

        .access-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }

        .access-table tr:hover {
          background: #f9fafb;
        }

        .role-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .role-admin {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-family,
        .role-poa {
          background: #fce7f3;
          color: #a21caf;
        }

        .role-generalcarestaff {
          background: #e0e7ff;
          color: #4338ca;
        }

        .revoke-btn {
          padding: 0.375rem 0.75rem;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .revoke-btn:hover {
          background: #fecaca;
          color: #7f1d1d;
        }

        .no-action {
          color: #d1d5db;
        }

        .no-users {
          text-align: center;
          color: #6b7280;
          padding: 1.5rem;
          font-style: italic;
        }

        .access-description {
          color: #111827;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0 0 1.25rem 0;
        }

        @media (max-width: 768px) {
          .selector-container {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .client-selector {
            margin-bottom: 0;
          }

          .token-section {
            width: 100%;
          }

          .token-buttons-group {
            width: 100%;
          }

          .create-token-btn {
            width: 100%;
          }

          .org-required-notice {
            font-size: 0.75rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .access-table {
            font-size: 0.75rem;
          }

          .access-table th,
          .access-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ClientInfoManager;
