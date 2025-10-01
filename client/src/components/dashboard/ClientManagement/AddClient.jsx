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
    customFields: [],
  });

  const [adding, setAdding] = React.useState(false);
  const [addErr, setAddErr] = React.useState("");
  const [newFieldTitle, setNewFieldTitle] = React.useState("");
  const [newFieldValue, setNewFieldValue] = React.useState("");

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

  const addCustomField = () => {
    if (newFieldTitle && newFieldValue) {
      setFormData((prev) => ({
        ...prev,
        customFields: [
          ...prev.customFields,
          { title: newFieldTitle, value: newFieldValue },
        ],
      }));
      setNewFieldTitle("");
      setNewFieldValue("");
    }
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
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
      // Create PersonWithNeeds with new fields
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
          customFields: formData.customFields,
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
        customFields: [],
      });
    } catch (err) {
      setAddErr(err.message || String(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card">
      <h3>Add a client (Person with Special Needs)</h3>
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
          <div>
            <label>Medical problems/conditions</label>
            <textarea
              value={formData.medicalProblems}
              onChange={handleInputChange("medicalProblems")}
              placeholder="e.g., Diabetes, Heart conditions, etc."
              rows="3"
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
            <input
              value={formData.mobilityNeeds}
              onChange={handleInputChange("mobilityNeeds")}
              placeholder="e.g., Wheelchair, Walker, Assistance required"
            />
          </div>
          <div>
            <label>Communication needs</label>
            <input
              value={formData.communicationNeeds}
              onChange={handleInputChange("communicationNeeds")}
              placeholder="e.g., Sign language, Speech assistance, etc."
            />
          </div>
          <div>
            <label>Dietary requirements</label>
            <input
              value={formData.dietaryRequirements}
              onChange={handleInputChange("dietaryRequirements")}
              placeholder="e.g., Vegetarian, Gluten-free, Soft foods only"
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="section">
          <h4>Additional Information</h4>
          <div className="custom-field-input">
            <input
              placeholder="What is it about?"
              value={newFieldTitle}
              onChange={(e) => setNewFieldTitle(e.target.value)}
            />
            <input
              placeholder="Details"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
            />
            <button type="button" onClick={addCustomField}>
              Add Information
            </button>
          </div>

          {formData.customFields.length > 0 && (
            <div className="custom-fields-list">
              {formData.customFields.map((field, index) => (
                <div key={index} className="custom-field-item">
                  <strong>{field.title}:</strong> {field.value}
                  <button
                    type="button"
                    onClick={() => removeCustomField(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button disabled={adding} className="submit-btn">
          {adding ? "Adding..." : "Add client"}
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

        .section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section h4 {
          margin-bottom: 1rem;
          color: #374151;
          font-weight: 600;
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
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 0.5rem;
          margin-bottom: 1rem;
          align-items: center;
        }

        .custom-field-input input {
          width: 100%;
          min-width: 0;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          box-sizing: border-box;
        }

        .custom-field-input button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          white-space: nowrap;
          font-size: 0.875rem;
        }

        .custom-field-input button:hover {
          background: #2563eb;
        }

        .custom-fields-list {
          background: #f9fafb;
          padding: 0.75rem;
          border-radius: 0.375rem;
        }

        .custom-field-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          background: white;
          border-radius: 0.25rem;
        }

        .remove-btn {
          padding: 0.25rem 0.5rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.75rem;
          margin-left: 1rem;
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
      `}</style>
    </div>
  );
}

export default AddClient;
