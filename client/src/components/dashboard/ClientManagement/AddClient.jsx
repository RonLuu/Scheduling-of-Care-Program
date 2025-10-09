import React from "react";

function AddClient({ me, jwt, setClients }) {
  const [formData, setFormData] = React.useState({
    name: "",
    dateOfBirth: "",
    sex: "",
    mobilePhone: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalProblems: "",
    allergies: "",
    medications: "",
    mobilityNeeds: "",
    communicationNeeds: "",
    dietaryRequirements: "",
    customMedicalFields: [], // New: for medical custom fields
    customAdditionalFields: [], // New: for additional custom fields
  });

  const [adding, setAdding] = React.useState(false);
  const [addErr, setAddErr] = React.useState("");

  // Medical custom field inputs
  const [newMedicalFieldTitle, setNewMedicalFieldTitle] = React.useState("");
  const [newMedicalFieldValue, setNewMedicalFieldValue] = React.useState("");

  // Additional custom field inputs
  const [newAdditionalFieldTitle, setNewAdditionalFieldTitle] =
    React.useState("");
  const [newAdditionalFieldValue, setNewAdditionalFieldValue] =
    React.useState("");

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

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const addMedicalCustomField = () => {
    if (newMedicalFieldTitle && newMedicalFieldValue) {
      setFormData((prev) => ({
        ...prev,
        customMedicalFields: [
          ...prev.customMedicalFields,
          { title: newMedicalFieldTitle, value: newMedicalFieldValue },
        ],
      }));
      setNewMedicalFieldTitle("");
      setNewMedicalFieldValue("");
    }
  };

  const removeMedicalCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateMedicalFieldTitle = (index, newTitle) => {
    setFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.map((field, i) =>
        i === index ? { ...field, title: newTitle } : field
      ),
    }));
  };

  const updateMedicalFieldValue = (index, newValue) => {
    setFormData((prev) => ({
      ...prev,
      customMedicalFields: prev.customMedicalFields.map((field, i) =>
        i === index ? { ...field, value: newValue } : field
      ),
    }));
  };

  const addAdditionalCustomField = () => {
    if (newAdditionalFieldTitle && newAdditionalFieldValue) {
      setFormData((prev) => ({
        ...prev,
        customAdditionalFields: [
          ...prev.customAdditionalFields,
          { title: newAdditionalFieldTitle, value: newAdditionalFieldValue },
        ],
      }));
      setNewAdditionalFieldTitle("");
      setNewAdditionalFieldValue("");
    }
  };

  const removeAdditionalCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateAdditionalFieldTitle = (index, newTitle) => {
    setFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.map((field, i) =>
        i === index ? { ...field, title: newTitle } : field
      ),
    }));
  };

  const updateAdditionalFieldValue = (index, newValue) => {
    setFormData((prev) => ({
      ...prev,
      customAdditionalFields: prev.customAdditionalFields.map((field, i) =>
        i === index ? { ...field, value: newValue } : field
      ),
    }));
  };

  const addClient = async (e) => {
    e.preventDefault();
    if (!me.organizationId) {
      setAddErr("Please set your organisation first.");
      return;
    }
    if (!me || (me.role !== "Family" && me.role !== "PoA")) return;

    setAdding(true);
    setAddErr("");

    try {
      // Combine all custom fields with categories
      const allCustomFields = [
        ...formData.customMedicalFields.map((f) => ({
          ...f,
          category: "Medical",
        })),
        ...formData.customAdditionalFields.map((f) => ({
          ...f,
          category: "Additional",
        })),
      ];

      // Create PersonWithNeeds
      const r1 = await fetch("/api/person-with-needs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          name: formData.name,
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth).toISOString()
            : undefined,
          sex: formData.sex || undefined,
          mobilePhone: formData.mobilePhone,
          address: {
            street: formData.address,
            suburb: formData.suburb,
            state: formData.state,
            postcode: formData.postcode,
          },
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
          },
          medicalInfo: {
            problems: formData.medicalProblems,
            allergies: formData.allergies,
            medications: formData.medications,
            mobilityNeeds: formData.mobilityNeeds,
            communicationNeeds: formData.communicationNeeds,
            dietaryRequirements: formData.dietaryRequirements,
          },
          customFields: allCustomFields,
          organizationId: me.organizationId,
        }),
      });
      const p = await r1.json();
      if (!r1.ok) throw new Error(p.error || "Failed to create person");

      // Create PersonUserLink
      const r2 = await fetch("/api/person-user-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          personId: p._id,
          userId: me.id,
          relationshipType: "Family",
          active: true,
          startAt: new Date(),
        }),
      });
      const l = await r2.json();
      if (!r2.ok) throw new Error(l.error || "Failed to link person");

      // Refresh clients list
      const linksRes = await fetch(`/api/person-user-links?userId=${me.id}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const links = await linksRes.json();
      const persons = await Promise.all(
        links.map((link) =>
          fetch(`/api/person-with-needs/${link.personId}`, {
            headers: { Authorization: "Bearer " + jwt },
          })
            .then((rr) => rr.json())
            .then((pp) => {
              if (pp.medicalInfo && typeof pp.medicalInfo === "object") {
                const medicalSummary = [];
                if (pp.medicalInfo.problems)
                  medicalSummary.push(`Problems: ${pp.medicalInfo.problems}`);
                if (pp.medicalInfo.allergies)
                  medicalSummary.push(`Allergies: ${pp.medicalInfo.allergies}`);
                if (pp.medicalInfo.medications)
                  medicalSummary.push(
                    `Medications: ${pp.medicalInfo.medications}`
                  );
                pp.medicalInfoDisplay = medicalSummary.join("; ");
              }
              return {
                ...pp,
                relationshipType: link.relationshipType,
              };
            })
        )
      );
      setClients(persons);

      // Clear form
      setFormData({
        name: "",
        dateOfBirth: "",
        sex: "",
        mobilePhone: "",
        address: "",
        suburb: "",
        state: "",
        postcode: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        medicalProblems: "",
        allergies: "",
        medications: "",
        mobilityNeeds: "",
        communicationNeeds: "",
        dietaryRequirements: "",
        customMedicalFields: [],
        customAdditionalFields: [],
      });
    } catch (err) {
      setAddErr(err.message || String(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card">
      <h3>Add a Client (Person with Special Needs)</h3>
      <p className="card-description">
        Fill in the client's information below. Fields marked with * are
        required. You can add custom fields in both Medical and Additional
        Information sections as needed.
      </p>

      <form onSubmit={addClient}>
        {/* Basic Information */}
        <div className="section">
          <h4>Basic Information</h4>
          <input
            placeholder="Client name *"
            value={formData.name}
            onChange={handleInputChange("name")}
            required
          />
          <div className="row">
            <div>
              <label>Date of birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange("dateOfBirth")}
              />
            </div>
            <div>
              <label>Sex</label>
              <select value={formData.sex} onChange={handleInputChange("sex")}>
                {sexOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label>Mobile phone</label>
            <input
              type="tel"
              value={formData.mobilePhone}
              onChange={handleInputChange("mobilePhone")}
              placeholder="+61 4XX XXX XXX"
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="section">
          <h4>Address</h4>
          <input
            placeholder="Street address"
            value={formData.address}
            onChange={handleInputChange("address")}
          />
          <div className="row">
            <div className="col-md-4">
              <label>Suburb/City</label>
              <input
                value={formData.suburb}
                onChange={handleInputChange("suburb")}
                placeholder="e.g., Sydney"
              />
            </div>
            <div className="col-md-4">
              <label>State</label>
              <select
                value={formData.state}
                onChange={handleInputChange("state")}
              >
                {australianStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label>Postcode</label>
              <input
                type="text"
                pattern="[0-9]{4}"
                maxLength="4"
                value={formData.postcode}
                onChange={handleInputChange("postcode")}
                placeholder="0000"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="section">
          <h4>Emergency Contact</h4>
          <div className="row">
            <div>
              <label>Contact name</label>
              <input
                value={formData.emergencyContactName}
                onChange={handleInputChange("emergencyContactName")}
                placeholder="Emergency contact name"
              />
            </div>
            <div>
              <label>Contact phone</label>
              <input
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange("emergencyContactPhone")}
                placeholder="+61 4XX XXX XXX"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="section">
          <h4>Medical Information</h4>
          <p className="section-description">
            Document the client's medical conditions, medications, and care
            needs. You can add custom medical fields below if you need to record
            additional health information.
          </p>

          <div>
            <label>Medical problems/conditions</label>
            <textarea
              value={formData.medicalProblems}
              onChange={handleInputChange("medicalProblems")}
              placeholder="e.g., Diabetes, Heart conditions, etc."
              rows="2"
            />
          </div>
          <div>
            <label>Allergies</label>
            <textarea
              value={formData.allergies}
              onChange={handleInputChange("allergies")}
              placeholder="e.g., Peanuts, Penicillin, Latex, etc."
              rows="2"
            />
          </div>
          <div>
            <label>Current medications</label>
            <textarea
              value={formData.medications}
              onChange={handleInputChange("medications")}
              placeholder="List all current medications and dosages"
              rows="2"
            />
          </div>
          <div>
            <label>Mobility needs</label>
            <textarea
              value={formData.mobilityNeeds}
              onChange={handleInputChange("mobilityNeeds")}
              placeholder="e.g., Wheelchair, Walker, Assistance required"
              rows="2"
            />
          </div>
          <div>
            <label>Communication needs</label>
            <textarea
              value={formData.communicationNeeds}
              onChange={handleInputChange("communicationNeeds")}
              placeholder="e.g., Sign language, Speech assistance, etc."
              rows="2"
            />
          </div>
          <div>
            <label>Dietary requirements</label>
            <textarea
              value={formData.dietaryRequirements}
              onChange={handleInputChange("dietaryRequirements")}
              placeholder="e.g., Vegetarian, Gluten-free, Soft foods only"
              rows="2"
            />
          </div>

          {/* Custom Medical Fields */}
          <div className="custom-fields-subsection">
            <h5>Add Custom Medical Information</h5>
            <p className="subsection-hint">
              Add any additional medical details not covered above (e.g., Vision
              needs, Hearing aids, etc.)
            </p>

            {formData.customMedicalFields.length > 0 && (
              <div className="custom-fields-list">
                {formData.customMedicalFields.map((field, index) => (
                  <div key={index} className="custom-field-display">
                    <div className="field-content">
                      <div className="field-input-group">
                        <label>Header:</label>
                        <input
                          type="text"
                          value={field.title}
                          onChange={(e) =>
                            updateMedicalFieldTitle(index, e.target.value)
                          }
                          placeholder="e.g., Vision needs"
                        />
                      </div>
                      <div className="field-input-group">
                        <label>Details:</label>
                        <textarea
                          value={field.value}
                          onChange={(e) =>
                            updateMedicalFieldValue(index, e.target.value)
                          }
                          rows="2"
                          placeholder="Enter details..."
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicalCustomField(index)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="custom-field-input">
              <div>
                <label>Header</label>
                <input
                  placeholder="e.g., Vision needs"
                  value={newMedicalFieldTitle}
                  onChange={(e) => setNewMedicalFieldTitle(e.target.value)}
                />
              </div>
              <div>
                <label>Details</label>
                <textarea
                  placeholder="e.g., Requires prescription glasses"
                  value={newMedicalFieldValue}
                  onChange={(e) => setNewMedicalFieldValue(e.target.value)}
                  rows="2"
                />
              </div>
              <button
                type="button"
                onClick={addMedicalCustomField}
                className="add-field-btn"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="section">
          <h4>Additional Information</h4>
          <p className="section-description">
            Add any other relevant information about the client that doesn't fit
            in the categories above (e.g., Hobbies, Preferences, Special notes,
            etc.)
          </p>

          {formData.customAdditionalFields.length > 0 && (
            <div className="custom-fields-list">
              {formData.customAdditionalFields.map((field, index) => (
                <div key={index} className="custom-field-display">
                  <div className="field-content">
                    <div className="field-input-group">
                      <label>Header:</label>
                      <input
                        type="text"
                        value={field.title}
                        onChange={(e) =>
                          updateAdditionalFieldTitle(index, e.target.value)
                        }
                        placeholder="e.g., Hobbies"
                      />
                    </div>
                    <div className="field-input-group">
                      <label>Details:</label>
                      <textarea
                        value={field.value}
                        onChange={(e) =>
                          updateAdditionalFieldValue(index, e.target.value)
                        }
                        rows="2"
                        placeholder="Enter details..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdditionalCustomField(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="custom-field-input">
            <div>
              <label>Header</label>
              <input
                placeholder="e.g., Hobbies, Preferences"
                value={newAdditionalFieldTitle}
                onChange={(e) => setNewAdditionalFieldTitle(e.target.value)}
              />
            </div>
            <div>
              <label>Details</label>
              <textarea
                placeholder="e.g., Enjoys painting, Loves outdoor activities"
                value={newAdditionalFieldValue}
                onChange={(e) => setNewAdditionalFieldValue(e.target.value)}
                rows="2"
              />
            </div>
            <button
              type="button"
              onClick={addAdditionalCustomField}
              className="add-field-btn"
            >
              Add Field
            </button>
          </div>
        </div>

        <button disabled={adding} className="submit-btn">
          {adding ? "Adding..." : "Add Client"}
        </button>
        {addErr && <p style={{ color: "#b91c1c" }}>Error: {addErr}</p>}
      </form>

      <style jsx>{`
        .card {
          padding: 1.5rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section h4 {
          margin-bottom: 0.5rem;
          color: #374151;
          font-weight: 600;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.8125rem;
          margin-bottom: 1rem;
          font-style: italic;
          line-height: 1.4;
        }

        .custom-fields-subsection {
          margin-top: 0;
          padding-top: 0;
        }

        .custom-fields-subsection h5 {
          margin-bottom: 0.25rem;
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

        .row {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .row > div {
          flex: 1;
        }

        .col-md-4 {
          flex: 0 0 33.333%;
        }

        label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
        }

        input,
        select,
        textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          box-sizing: border-box;
        }

        textarea {
          resize: vertical;
        }

        .custom-field-input {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.75rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.375rem;
          border: 1px dashed #d1d5db;
        }
        .custom-field-input > div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .custom-field-input > div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .custom-field-input input,
        .custom-field-input textarea {
          width: 100%;
          min-width: 0;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          box-sizing: border-box;
        }

        .add-field-btn {
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

        .add-field-btn:hover {
          background: #2563eb;
        }

        .custom-fields-list {
          background: #f9fafb;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 0.75rem;
        }

        .custom-field-display {
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

        .custom-field-display:last-child {
          margin-bottom: 0;
        }

        .field-content {
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

        .field-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .field-input-group:last-child {
          margin-bottom: 0;
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

        .remove-btn {
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

        .remove-btn:hover {
          background: #dc2626;
        }

        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
        }

        .submit-btn:hover:not(:disabled) {
          background: #059669;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .custom-field-input {
            grid-template-columns: 1fr;
          }

          .custom-field-display {
            grid-template-columns: 1fr;
          }

          .remove-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default AddClient;
