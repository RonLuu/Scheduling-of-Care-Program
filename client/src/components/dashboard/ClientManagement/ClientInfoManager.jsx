import React from "react";

function ClientInfoManager({ me, jwt, clients, onClientUpdate }) {
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [accessLinks, setAccessLinks] = React.useState([]);
  const [accessErr, setAccessErr] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteError, setInviteError] = React.useState("");
  const [inviteSuccess, setInviteSuccess] = React.useState("");
  const [isInviting, setIsInviting] = React.useState(false);

  // Edit panel state
  const [editPanel, setEditPanel] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  // Custom fields state for edit panel
  const [newMedicalFieldTitle, setNewMedicalFieldTitle] = React.useState("");
  const [newMedicalFieldValue, setNewMedicalFieldValue] = React.useState("");
  const [newAdditionalFieldTitle, setNewAdditionalFieldTitle] =
    React.useState("");
  const [newAdditionalFieldValue, setNewAdditionalFieldValue] =
    React.useState("");

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  const australianStates = [
    { value: "", label: "Select State" },
    { value: "NSW", label: "New South Wales" },
    { value: "VIC", label: "Victoria" },
    { value: "QLD", label: "Queensland" },
    { value: "WA", label: "Western Australia" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NT", label: "Northern Territory" },
  ];

  const sexOptions = [
    { value: "", label: "Select" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  const canEdit = me?.role === "Family" || me?.role === "PoA";
  const canInvite =
    me?.role === "Admin" || me?.role === "Family" || me?.role === "PoA";

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

  const openEditPanel = () => {
    if (!selectedClient) return;

    const medicalCustomFields = (selectedClient.customFields || []).filter(
      (f) => f.category === "Medical"
    );
    const additionalCustomFields = (selectedClient.customFields || []).filter(
      (f) => f.category === "Additional" || !f.category
    );

    const initialData = {
      // Basic Information
      dateOfBirth: selectedClient.dateOfBirth
        ? new Date(selectedClient.dateOfBirth).toISOString().split("T")[0]
        : "",
      sex: selectedClient.sex || "",
      mobilePhone: selectedClient.mobilePhone || "",
      address: selectedClient.address?.street || "",
      suburb: selectedClient.address?.suburb || "",
      state: selectedClient.address?.state || "",
      postcode: selectedClient.address?.postcode || "",
      // Emergency Contact
      emergencyContactName: selectedClient.emergencyContact?.name || "",
      emergencyContactPhone: selectedClient.emergencyContact?.phone || "",
      // Medical Information
      medicalProblems: selectedClient.medicalInfo?.problems || "",
      allergies: selectedClient.medicalInfo?.allergies || "",
      medications: selectedClient.medicalInfo?.medications || "",
      mobilityNeeds: selectedClient.medicalInfo?.mobilityNeeds || "",
      communicationNeeds: selectedClient.medicalInfo?.communicationNeeds || "",
      dietaryRequirements:
        selectedClient.medicalInfo?.dietaryRequirements || "",
      customMedicalFields: medicalCustomFields,
      // Additional Information
      customAdditionalFields: additionalCustomFields,
    };

    setEditFormData(initialData);
    setEditPanel(true);
    setSaveError("");
    setNewMedicalFieldTitle("");
    setNewMedicalFieldValue("");
    setNewAdditionalFieldTitle("");
    setNewAdditionalFieldValue("");
  };

  const closeEditPanel = () => {
    setEditPanel(false);
    setEditFormData({});
    setSaveError("");
  };

  const handleEditInputChange = (field) => (e) => {
    setEditFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const addMedicalCustomField = () => {
    if (newMedicalFieldTitle && newMedicalFieldValue) {
      setEditFormData((prev) => ({
        ...prev,
        customMedicalFields: [
          ...(prev.customMedicalFields || []),
          { title: newMedicalFieldTitle, value: newMedicalFieldValue },
        ],
      }));
      setNewMedicalFieldTitle("");
      setNewMedicalFieldValue("");
    }
  };

  const removeMedicalCustomField = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateMedicalFieldTitle = (index, newTitle) => {
    setEditFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.map((field, i) =>
        i === index ? { ...field, title: newTitle } : field
      ),
    }));
  };

  const updateMedicalFieldValue = (index, newValue) => {
    setEditFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.map((field, i) =>
        i === index ? { ...field, value: newValue } : field
      ),
    }));
  };

  const addAdditionalCustomField = () => {
    if (newAdditionalFieldTitle && newAdditionalFieldValue) {
      setEditFormData((prev) => ({
        ...prev,
        customAdditionalFields: [
          ...(prev.customAdditionalFields || []),
          { title: newAdditionalFieldTitle, value: newAdditionalFieldValue },
        ],
      }));
      setNewAdditionalFieldTitle("");
      setNewAdditionalFieldValue("");
    }
  };

  const removeAdditionalCustomField = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateAdditionalFieldTitle = (index, newTitle) => {
    setEditFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.map((field, i) =>
        i === index ? { ...field, title: newTitle } : field
      ),
    }));
  };

  const updateAdditionalFieldValue = (index, newValue) => {
    setEditFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.map((field, i) =>
        i === index ? { ...field, value: newValue } : field
      ),
    }));
  };

  const saveEditPanel = async () => {
    if (!selectedClient) return;

    setIsSaving(true);
    setSaveError("");

    try {
      // Combine all custom fields with categories
      const allCustomFields = [
        ...(editFormData.customMedicalFields || []).map((f) => ({
          ...f,
          category: "Medical",
        })),
        ...(editFormData.customAdditionalFields || []).map((f) => ({
          ...f,
          category: "Additional",
        })),
      ];

      const updateData = {
        dateOfBirth: editFormData.dateOfBirth
          ? new Date(editFormData.dateOfBirth).toISOString()
          : undefined,
        sex: editFormData.sex || undefined,
        mobilePhone: editFormData.mobilePhone,
        address: {
          street: editFormData.address,
          suburb: editFormData.suburb,
          state: editFormData.state,
          postcode: editFormData.postcode,
        },
        emergencyContact: {
          name: editFormData.emergencyContactName,
          phone: editFormData.emergencyContactPhone,
        },
        medicalInfo: {
          problems: editFormData.medicalProblems,
          allergies: editFormData.allergies,
          medications: editFormData.medications,
          mobilityNeeds: editFormData.mobilityNeeds,
          communicationNeeds: editFormData.communicationNeeds,
          dietaryRequirements: editFormData.dietaryRequirements,
        },
        customFields: allCustomFields,
      };

      const response = await fetch(
        `/api/person-with-needs/${selectedClient._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update client");

      // Close the panel first
      closeEditPanel();

      // Call the parent's refresh function to reload all clients
      if (onClientUpdate) {
        await onClientUpdate();
      }
    } catch (err) {
      setSaveError(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
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

  const openInviteModal = () => {
    setShowInviteModal(true);
    setInviteEmail("");
    setInviteError("");
    setInviteSuccess("");
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteError("");
    setInviteSuccess("");
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const response = await fetch("/api/person-user-links/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          personId: selectedClientId,
          inviteeEmail: inviteEmail.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setInviteSuccess(data.message || "Invite sent successfully!");
      setInviteEmail("");

      // Reload access links to show the new user
      await loadAccessLinks(selectedClientId);

      // Auto-close modal after success
      setTimeout(() => {
        closeInviteModal();
      }, 2000);
    } catch (error) {
      setInviteError(error.message);
    } finally {
      setIsInviting(false);
    }
  };

  const getInviteInstructions = () => {
    if (me?.role === "Admin") {
      return "You can invite general care staff members to access this client. They must be registered in the system.";
    } else if (me?.role === "Family" || me?.role === "PoA") {
      if (!me?.organizationId) {
        return (
          <>
            You can invite other family members or someone with power of
            attorney to access this client.
            <div className="org-warning">
              <strong>Note:</strong> If the person you invite is part of an
              organization, you and all related clients will automatically join
              their organization.
            </div>
          </>
        );
      } else {
        return "You can invite family members, power of attorney, or organization administrators to access this client. They will join your organization if not already in one.";
      }
    }
    return "";
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

  const hasBasicInfo =
    selectedClient &&
    (selectedClient.dateOfBirth ||
      selectedClient.sex ||
      selectedClient.mobilePhone ||
      (selectedClient.address &&
        (selectedClient.address.street || selectedClient.address.suburb)));

  const hasEmergencyContact =
    selectedClient &&
    selectedClient.emergencyContact &&
    (selectedClient.emergencyContact.name ||
      selectedClient.emergencyContact.phone);

  const hasMedicalInfo = medicalInfoDisplay && medicalInfoDisplay.length > 0;
  const hasAdditionalInfo =
    additionalInfoDisplay && additionalInfoDisplay.length > 0;

  return (
    <div className="client-info-manager">
      <div className="client-card">
        {canManageAccess && (
          <div className="tip-box">
            <div className="tip-icon">i</div>
            <p>
              <strong>Want to give someone access to a client?</strong> <br />
              Select a client below and click "Invite User" to share access with
              other registered users via email.
            </p>
          </div>
        )}

        <div className="selector-container">
          <div className="client-selector">
            <h4>
              Select a client (person with special needs) to view details
              <span className="required-mark">*</span>
            </h4>
            <select value={selectedClientId} onChange={handleClientChange}>
              <option value="">— Choose a client—</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.status !== "Active" ? `(${c.status})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && canInvite && (
            <div className="invite-section">
              <button className="invite-user-btn" onClick={openInviteModal}>
                Invite User
              </button>
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
                {canEdit && (
                  <button className="edit-client-btn" onClick={openEditPanel}>
                    Edit Client Information
                  </button>
                )}
              </div>

              <div className="info-grid">
                <div className="info-block">
                  <div className="block-header">
                    <h4>Basic Information</h4>
                  </div>
                  {hasBasicInfo ? (
                    <>
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
                    </>
                  ) : (
                    <p className="empty-block-text">
                      No basic information added yet.
                    </p>
                  )}
                </div>

                <div className="info-block">
                  <div className="block-header">
                    <h4>Emergency Contact</h4>
                  </div>
                  {hasEmergencyContact ? (
                    <div className="info-row">
                      <span className="value">
                        {getEmergencyContactDisplay(
                          selectedClient.emergencyContact
                        )}
                      </span>
                    </div>
                  ) : (
                    <p className="empty-block-text">
                      No emergency contact added yet.
                    </p>
                  )}
                </div>

                <div className="info-block full-width">
                  <div className="block-header">
                    <h4>Medical Information</h4>
                  </div>
                  {hasMedicalInfo ? (
                    <>
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
                    </>
                  ) : (
                    <p className="empty-block-text">
                      No medical information added yet.
                    </p>
                  )}
                </div>

                <div className="info-block full-width">
                  <div className="block-header">
                    <h4>Additional Information</h4>
                  </div>
                  {hasAdditionalInfo ? (
                    <>
                      <p className="block-description">
                        Custom information and notes specific to this client.
                      </p>
                      {additionalInfoDisplay.map((field, index) => (
                        <div key={index} className="info-row">
                          <span className="label">{field.title}:</span>
                          <span className="value">{field.value}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="empty-block-text">
                      No additional information added yet.
                    </p>
                  )}
                </div>
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

      {/* Edit Panel Modal */}
      {editPanel && (
        <div className="edit-modal-overlay" onClick={closeEditPanel}>
          <div
            className="edit-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="edit-modal-header">
              <h3>Edit Client Information</h3>
              <button className="modal-close" onClick={closeEditPanel}>
                ×
              </button>
            </div>

            <div className="edit-modal-body">
              {/* Basic Information */}
              <div className="edit-section">
                <h4>Basic Information</h4>
                <div className="edit-row">
                  <div className="edit-field">
                    <label>Date of birth</label>
                    <input
                      type="date"
                      value={editFormData.dateOfBirth || ""}
                      onChange={handleEditInputChange("dateOfBirth")}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Sex</label>
                    <select
                      value={editFormData.sex || ""}
                      onChange={handleEditInputChange("sex")}
                    >
                      {sexOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="edit-field">
                  <label>Mobile phone</label>
                  <input
                    type="tel"
                    value={editFormData.mobilePhone || ""}
                    onChange={handleEditInputChange("mobilePhone")}
                    placeholder="+61 4XX XXX XXX"
                  />
                </div>
                <div className="edit-field">
                  <label>Street address</label>
                  <input
                    value={editFormData.address || ""}
                    onChange={handleEditInputChange("address")}
                    placeholder="Street address"
                  />
                </div>
                <div className="edit-row">
                  <div className="edit-field">
                    <label>Suburb/City</label>
                    <input
                      value={editFormData.suburb || ""}
                      onChange={handleEditInputChange("suburb")}
                      placeholder="e.g., Sydney"
                    />
                  </div>
                  <div className="edit-field">
                    <label>State</label>
                    <select
                      value={editFormData.state || ""}
                      onChange={handleEditInputChange("state")}
                    >
                      {australianStates.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-field">
                    <label>Postcode</label>
                    <input
                      type="text"
                      pattern="[0-9]{4}"
                      maxLength="4"
                      value={editFormData.postcode || ""}
                      onChange={handleEditInputChange("postcode")}
                      placeholder="0000"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="edit-section">
                <h4>Emergency Contact</h4>
                <div className="edit-row">
                  <div className="edit-field">
                    <label>Contact name</label>
                    <input
                      value={editFormData.emergencyContactName || ""}
                      onChange={handleEditInputChange("emergencyContactName")}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="edit-field">
                    <label>Contact phone</label>
                    <input
                      type="tel"
                      value={editFormData.emergencyContactPhone || ""}
                      onChange={handleEditInputChange("emergencyContactPhone")}
                      placeholder="+61 4XX XXX XXX"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="edit-section">
                <h4>Medical Information</h4>
                <p className="section-description">
                  Document the client's medical conditions, medications, and
                  care needs. You can add custom medical fields below if you
                  need to record additional health information.
                </p>

                <div className="edit-field">
                  <label>Medical problems/conditions</label>
                  <textarea
                    value={editFormData.medicalProblems || ""}
                    onChange={handleEditInputChange("medicalProblems")}
                    placeholder="e.g., Diabetes, Heart conditions, etc."
                    rows="2"
                  />
                </div>
                <div className="edit-field">
                  <label>Allergies</label>
                  <textarea
                    value={editFormData.allergies || ""}
                    onChange={handleEditInputChange("allergies")}
                    placeholder="e.g., Peanuts, Penicillin, Latex, etc."
                    rows="2"
                  />
                </div>
                <div className="edit-field">
                  <label>Current medications</label>
                  <textarea
                    value={editFormData.medications || ""}
                    onChange={handleEditInputChange("medications")}
                    placeholder="List all current medications and dosages"
                    rows="2"
                  />
                </div>
                <div className="edit-field">
                  <label>Mobility needs</label>
                  <textarea
                    value={editFormData.mobilityNeeds || ""}
                    onChange={handleEditInputChange("mobilityNeeds")}
                    placeholder="e.g., Wheelchair, Walker, Assistance required"
                    rows="2"
                  />
                </div>
                <div className="edit-field">
                  <label>Communication needs</label>
                  <textarea
                    value={editFormData.communicationNeeds || ""}
                    onChange={handleEditInputChange("communicationNeeds")}
                    placeholder="e.g., Sign language, Speech assistance, etc."
                    rows="2"
                  />
                </div>
                <div className="edit-field">
                  <label>Dietary requirements</label>
                  <textarea
                    value={editFormData.dietaryRequirements || ""}
                    onChange={handleEditInputChange("dietaryRequirements")}
                    placeholder="e.g., Vegetarian, Gluten-free, Soft foods only"
                    rows="2"
                  />
                </div>

                {/* Custom Medical Fields */}
                <div className="custom-fields-subsection">
                  <h5>Add Custom Medical Information</h5>
                  <p className="subsection-hint">
                    Add any additional medical details not covered above (e.g.,
                    Vision needs, Hearing aids, etc.)
                  </p>

                  {editFormData.customMedicalFields &&
                    editFormData.customMedicalFields.length > 0 && (
                      <div className="custom-fields-list">
                        {editFormData.customMedicalFields.map(
                          (field, index) => (
                            <div key={index} className="custom-field-item">
                              <div className="field-inputs">
                                <div className="field-input-group">
                                  <label>Header:</label>
                                  <input
                                    type="text"
                                    value={field.title}
                                    onChange={(e) =>
                                      updateMedicalFieldTitle(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., Vision needs"
                                  />
                                </div>
                                <div className="field-input-group">
                                  <label>Details:</label>
                                  <textarea
                                    value={field.value}
                                    onChange={(e) =>
                                      updateMedicalFieldValue(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    rows="2"
                                    placeholder="Enter details..."
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedicalCustomField(index)}
                                className="remove-field-btn"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  <div className="add-custom-field">
                    <div className="field-input-group">
                      <label>Header</label>
                      <input
                        placeholder="e.g., Vision needs"
                        value={newMedicalFieldTitle}
                        onChange={(e) =>
                          setNewMedicalFieldTitle(e.target.value)
                        }
                      />
                    </div>
                    <div className="field-input-group">
                      <label>Details</label>
                      <textarea
                        placeholder="e.g., Requires prescription glasses"
                        value={newMedicalFieldValue}
                        onChange={(e) =>
                          setNewMedicalFieldValue(e.target.value)
                        }
                        rows="2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addMedicalCustomField}
                      className="add-custom-field-btn"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="edit-section">
                <h4>Additional Information</h4>
                <p className="section-description">
                  Add any other relevant information about the client that
                  doesn't fit in the categories above (e.g., Hobbies,
                  Preferences, Special notes, etc.)
                </p>

                {editFormData.customAdditionalFields &&
                  editFormData.customAdditionalFields.length > 0 && (
                    <div className="custom-fields-list">
                      {editFormData.customAdditionalFields.map(
                        (field, index) => (
                          <div key={index} className="custom-field-item">
                            <div className="field-inputs">
                              <div className="field-input-group">
                                <label>Header:</label>
                                <input
                                  type="text"
                                  value={field.title}
                                  onChange={(e) =>
                                    updateAdditionalFieldTitle(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g., Hobbies"
                                />
                              </div>
                              <div className="field-input-group">
                                <label>Details:</label>
                                <textarea
                                  value={field.value}
                                  onChange={(e) =>
                                    updateAdditionalFieldValue(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  rows="2"
                                  placeholder="Enter details..."
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAdditionalCustomField(index)}
                              className="remove-field-btn"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                <div className="add-custom-field">
                  <div className="field-input-group">
                    <label>Header</label>
                    <input
                      placeholder="e.g., Hobbies, Preferences"
                      value={newAdditionalFieldTitle}
                      onChange={(e) =>
                        setNewAdditionalFieldTitle(e.target.value)
                      }
                    />
                  </div>
                  <div className="field-input-group">
                    <label>Details</label>
                    <textarea
                      placeholder="e.g., Enjoys painting, Loves outdoor activities"
                      value={newAdditionalFieldValue}
                      onChange={(e) =>
                        setNewAdditionalFieldValue(e.target.value)
                      }
                      rows="2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addAdditionalCustomField}
                    className="add-custom-field-btn"
                  >
                    Add Field
                  </button>
                </div>
              </div>

              {saveError && (
                <div className="save-error">
                  <p>Error: {saveError}</p>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button className="cancel-btn" onClick={closeEditPanel}>
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={saveEditPanel}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal - Place this inside your component's return statement, before the closing tags */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={closeInviteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite User to Access {selectedClient?.name}</h3>
              <button className="modal-close" onClick={closeInviteModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="invite-instructions">
                {getInviteInstructions()}
              </div>

              {!inviteSuccess && (
                <>
                  <div className="invite-form">
                    <label htmlFor="invite-email">User Email Address</label>
                    <input
                      id="invite-email"
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleInviteSubmit()
                      }
                      disabled={isInviting}
                    />
                    {inviteError && (
                      <div className="invite-error">
                        <p>{inviteError}</p>
                      </div>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      className="cancel-btn"
                      onClick={closeInviteModal}
                      disabled={isInviting}
                    >
                      Cancel
                    </button>
                    <button
                      className="send-invite-btn"
                      onClick={handleInviteSubmit}
                      disabled={isInviting || !inviteEmail}
                    >
                      {isInviting ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                </>
              )}

              {inviteSuccess && (
                <div className="invite-success">
                  <div className="success-icon">✓</div>
                  <p>{inviteSuccess}</p>
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

        .create-token-btn {
          padding: 0.625rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
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

        .edit-client-btn {
          padding: 0.625rem 1.25rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.2);
        }

        .edit-client-btn:hover {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(129, 137, 210, 0.3);
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

        .block-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .info-block h4 {
          margin: 0;
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

        .empty-block-text {
          color: #9ca3af;
          font-size: 0.875rem;
          font-style: italic;
          margin: 0;
        }

        /* Edit Modal Styles */
        .edit-modal-overlay {
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
          padding: 1rem;
        }

        .edit-modal-content {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .edit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .edit-modal-header h3 {
          margin: 0;
          color: #374151;
          font-size: 1.25rem;
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

        .modal-body {
          padding: 1.5rem;
        }

        .modal-close:hover {
          color: #374151;
        }

        .edit-modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .edit-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .edit-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .edit-section h4 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .edit-field {
          margin-bottom: 1rem;
        }

        .edit-field label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
        }

        .edit-field input,
        .edit-field select,
        .edit-field textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          box-sizing: border-box;
        }

        .edit-field textarea {
          resize: vertical;
        }

        .edit-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.8125rem;
          margin-bottom: 1rem;
          font-style: italic;
          line-height: 1.4;
        }

        .custom-fields-subsection {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .custom-fields-subsection h5 {
          margin: 0 0 0.25rem 0;
          color: #4b5563;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .subsection-hint {
          color: #9ca3af;
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
          font-style: italic;
        }

        .custom-fields-list {
          background: #f9fafb;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 0.75rem;
        }

        .custom-field-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.75rem;
          align-items: start;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
        }

        .custom-field-item:last-child {
          margin-bottom: 0;
        }

        .field-inputs {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 0;
        }

        .field-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field-input-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
        }

        .field-input-group input,
        .field-input-group textarea {
          width: 100%;
          padding: 0.5rem;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .remove-field-btn {
          padding: 0.375rem 0.625rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.75rem;
          white-space: nowrap;
          height: fit-content;
          min-width: fit-content;
        }

        .remove-field-btn:hover {
          background: #dc2626;
        }

        .add-custom-field {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.375rem;
          border: 1px dashed #d1d5db;
        }

        .add-custom-field-btn {
          padding: 0.625rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          align-self: flex-start;
        }

        .add-custom-field-btn:hover {
          background: #2563eb;
        }

        .save-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 0.75rem;
          margin-top: 1rem;
        }

        .save-error p {
          margin: 0;
          color: #991b1b;
          font-size: 0.875rem;
        }

        .edit-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn {
          padding: 0.625rem 1.25rem;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #f9fafb;
        }

        .save-btn {
          padding: 0.625rem 1.25rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background: #6d76c4;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Token Modal Styles */
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
          font-size: 1.25rem;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-intro {
          margin: 0 0 1.5rem 0;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .token-type-selection {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .token-type-card {
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .token-type-card:hover {
          border-color: #8189d2;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .card-header h4 {
          margin: 0 0 0.75rem 0;
          color: #111827;
          font-size: 1rem;
          font-weight: 600;
        }

        .card-description {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .select-type-btn.primary {
          background: #8189d2;
          color: white;
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.2);
          width: 100%;
          margin: 0;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

        .select-type-btn.primary:hover {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(129, 137, 210, 0.3);
        }

        .select-type-btn.secondary {
          background: #10b981;
          color: white;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          width: 100%;
          margin: 0;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

        .select-type-btn.secondary:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .org-required-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
        }

        .warning-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .org-required-text {
          margin: 0 0 0.5rem 0;
          color: #92400e;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .org-link {
          color: #b45309;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .org-link:hover {
          color: #92400e;
          text-decoration: underline;
        }

        .generating-state {
          text-align: center;
          padding: 2rem 0;
          color: #6b7280;
          font-style: italic;
        }

        .generate-btn {
          width: 100%;
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
          margin: 0 auto !important;
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
          margin-bottom: 1.5rem;
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
          margin: 0 !important;
        }

        .copy-btn:hover {
          background: #6d76c4;
        }

        .token-info-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .token-instructions {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .instructions-list {
          margin: 0;
          padding-left: 1.25rem;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .instructions-list li {
          margin-bottom: 0.5rem;
        }

        .instructions-list li:last-child {
          margin-bottom: 0;
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

        .invite-instructions {
          margin: 0 0 1.5rem 0;
          color: #374151;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .org-warning {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          color: #92400e;
          font-size: 0.8125rem;
        }

        .org-warning strong {
          font-weight: 600;
        }

        .invite-form {
          margin-bottom: 1.5rem;
        }

        .invite-form label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .invite-form input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .invite-form input:focus {
          outline: none;
          border-color: #8189d2;
          box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
        }

        .invite-form input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .invite-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 0.75rem;
          margin-top: 0.75rem;
        }

        .invite-error p {
          margin: 0;
          color: #991b1b;
          font-size: 0.875rem;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .cancel-btn {
          padding: 0.625rem 1.25rem;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #f9fafb;
        }

        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .send-invite-btn {
          padding: 0.625rem 1.25rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-invite-btn:hover:not(:disabled) {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(129, 137, 210, 0.2);
        }

        .send-invite-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .invite-success {
          text-align: center;
          padding: 2rem 0;
        }

        .success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 4rem;
          height: 4rem;
          background: #d1fae5;
          color: #065f46;
          border-radius: 50%;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }

        .invite-success p {
          color: #065f46;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
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

          .create-token-btn {
            width: 100%;
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

          .modal-content,
          .edit-modal-content {
            max-width: 95%;
            width: 95%;
          }

          .token-type-selection {
            gap: 0.75rem;
          }

          .edit-row {
            grid-template-columns: 1fr;
          }

          .custom-field-item {
            grid-template-columns: 1fr;
          }

          .remove-field-btn {
            width: 100%;
          }

          .modal-actions {
            flex-direction: column-reverse;
            gap: 0.5rem;
          }

          .cancel-btn,
          .send-invite-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default ClientInfoManager;
