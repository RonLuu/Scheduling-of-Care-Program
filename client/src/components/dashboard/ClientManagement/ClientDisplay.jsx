import React from "react";

function ClientDisplay({ client }) {
  // Safely handle the medicalInfo object
  const getMedicalInfoDisplay = (medicalInfo) => {
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

    return info;
  };

  // Format address for display
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

  // Format emergency contact for display
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

  // Calculate age from date of birth
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

  const age = calculateAge(client.dateOfBirth);
  const medicalInfoItems = getMedicalInfoDisplay(client.medicalInfo);

  return (
    <div className="client-card">
      <div className="client-header">
        <h3>{client.name}</h3>
        <span
          className={`status-badge status-${
            client.status?.toLowerCase() || "active"
          }`}
        >
          {client.status || "Active"}
        </span>
      </div>

      <div className="client-details">
        {/* Basic Information */}
        <div className="info-section">
          <h4>Basic Information</h4>
          {client.dateOfBirth && (
            <div className="info-item">
              <span className="label">Age:</span>
              <span className="value">{age} years old</span>
            </div>
          )}
          {client.mobilePhone && (
            <div className="info-item">
              <span className="label">Phone:</span>
              <span className="value">{client.mobilePhone}</span>
            </div>
          )}
          <div className="info-item">
            <span className="label">Address:</span>
            <span className="value">{getAddressDisplay(client.address)}</span>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="info-section">
          <h4>Emergency Contact</h4>
          <div className="info-item">
            <span className="value">
              {getEmergencyContactDisplay(client.emergencyContact)}
            </span>
          </div>
        </div>

        {/* Medical Information */}
        {medicalInfoItems && medicalInfoItems.length > 0 && (
          <div className="info-section">
            <h4>Medical Information</h4>
            {medicalInfoItems.map((item, index) => (
              <div key={index} className="info-item">
                <span className="label">{item.label}:</span>
                <span className="value">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom Fields */}
        {client.customFields && client.customFields.length > 0 && (
          <div className="info-section">
            <h4>Additional Information</h4>
            {client.customFields.map((field, index) => (
              <div key={index} className="info-item">
                <span className="label">{field.title}:</span>
                <span className="value">{field.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Support Information */}
        {(client.riskLevel || client.supportLevel) && (
          <div className="info-section">
            <h4>Support Information</h4>
            {client.riskLevel && (
              <div className="info-item">
                <span className="label">Risk Level:</span>
                <span
                  className={`value risk-${client.riskLevel.toLowerCase()}`}
                >
                  {client.riskLevel}
                </span>
              </div>
            )}
            {client.supportLevel && (
              <div className="info-item">
                <span className="label">Support Level:</span>
                <span className="value">{client.supportLevel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .client-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .client-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .client-header h3 {
          margin: 0;
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-transferred {
          background: #fef3c7;
          color: #92400e;
        }

        .client-details {
          display: grid;
          gap: 1.5rem;
        }

        .info-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.375rem;
        }

        .info-section h4 {
          margin: 0 0 0.75rem 0;
          color: #4b5563;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-item {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: flex-start;
        }

        .info-item:last-child {
          margin-bottom: 0;
        }

        .label {
          font-weight: 500;
          color: #6b7280;
          margin-right: 0.5rem;
          min-width: 120px;
          font-size: 0.875rem;
        }

        .value {
          color: #111827;
          font-size: 0.875rem;
          flex: 1;
        }

        .risk-low {
          color: #059669;
          font-weight: 600;
        }

        .risk-medium {
          color: #d97706;
          font-weight: 600;
        }

        .risk-high {
          color: #dc2626;
          font-weight: 600;
        }

        .risk-critical {
          color: #7c3aed;
          font-weight: 700;
        }

        @media (min-width: 768px) {
          .client-details {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Client List Component
export function ClientList({ clients }) {
  if (!clients || clients.length === 0) {
    return (
      <div className="empty-state">
        <p>No clients found. Add your first client to get started.</p>
      </div>
    );
  }

  return (
    <div className="client-list">
      {clients.map((client) => (
        <ClientDisplay key={client._id} client={client} />
      ))}
    </div>
  );
}

export default ClientDisplay;
