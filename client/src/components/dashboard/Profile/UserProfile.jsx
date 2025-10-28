import React, { useState } from "react";
import {
  BiUser,
  BiPencil,
  BiEnvelope,
  BiPhone,
  BiMap,
  BiBriefcase,
} from "react-icons/bi";
import { MdEmergency } from "react-icons/md";
import NavigationTab from "../../NavigationTab";
import EditInfo from "./EditInfo";
import ChangePassword from "./ChangePassword";

import "../../../styles/UserProfile.css";

function UserProfile({ me, refreshMe, jwt }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const avatarUrl = me?.avatarFileId?.urlOrPath;

  // Map backend role to display name
  const getRoleDisplayName = (role) => {
    // For Admin users, use their custom title if available
    if (role === "Admin" && me?.title) {
      return me.title;
    }

    const roleMap = {
      GeneralCareStaff: "Carer",
      PoA: "Power of Attorney",
      Admin: "Organization Representative",
      Family: "Family",
    };
    return roleMap[role] || role;
  };

  return (
    <div className={`userprofile-wrapper ${showEdit ? "showEditOn" : ""}`}>
      {showEdit && (
        <EditInfo
          me={me}
          jwt={jwt}
          refreshMe={refreshMe}
          showEdit={showEdit}
          setShowEdit={setShowEdit}
          onChangePassword={() => setShowChangePassword(true)} // ADD THIS
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          jwt={jwt}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            // Optional: show success notification
          }}
        />
      )}

      <NavigationTab className="navigationtab" />
      <div className="userprofile-container">
        <div className="userprofile-content">
          {/* Profile Header Card */}
          <div className="userprofile-header-card">
            <div className="userprofile-avatar-wrapper">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="userprofile-avatar-image"
                />
              ) : (
                <BiUser className="userprofile-avatar-icon" />
              )}
            </div>

            <div className="userprofile-header-info">
              <div className="userprofile-name-role-section">
                <h1 className="userprofile-name">{me?.name || "User Name"}</h1>
                <div className="userprofile-role-badge">
                  <BiBriefcase className="userprofile-role-icon" />
                  <span>{getRoleDisplayName(me?.role) || "Role"}</span>
                </div>
              </div>
              <button
                className="userprofile-edit-button"
                onClick={() => setShowEdit(!showEdit)}
              >
                <BiPencil className="userprofile-edit-icon" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="userprofile-details-card">
            <h2 className="userprofile-section-title">Personal Information</h2>

            <div className="userprofile-details-grid">
              <div className="userprofile-detail-item">
                <div className="userprofile-detail-icon-wrapper">
                  <BiUser className="userprofile-detail-icon" />
                </div>
                <div className="userprofile-detail-content">
                  <label className="userprofile-detail-label">Full Name</label>
                  <p className="userprofile-detail-value">
                    {me?.name || "Not Set"}
                  </p>
                </div>
              </div>

              <div className="userprofile-detail-item">
                <div className="userprofile-detail-icon-wrapper">
                  <BiEnvelope className="userprofile-detail-icon" />
                </div>
                <div className="userprofile-detail-content">
                  <label className="userprofile-detail-label">
                    Email Address
                  </label>
                  <p className="userprofile-detail-value">
                    {me?.email || "Not Set"}
                  </p>
                </div>
              </div>

              <div className="userprofile-detail-item">
                <div className="userprofile-detail-icon-wrapper">
                  <BiPhone className="userprofile-detail-icon" />
                </div>
                <div className="userprofile-detail-content">
                  <label className="userprofile-detail-label">
                    Phone Number
                  </label>
                  <p className="userprofile-detail-value">
                    {me?.mobile || "Not Set"}
                  </p>
                </div>
              </div>

              <div className="userprofile-detail-item">
                <div className="userprofile-detail-icon-wrapper">
                  <BiMap className="userprofile-detail-icon" />
                </div>
                <div className="userprofile-detail-content">
                  <label className="userprofile-detail-label">Address</label>
                  <p className="userprofile-detail-value">
                    {me?.address || "Not Set"}
                  </p>
                </div>
              </div>

              {/* Emergency Contacts Section - Full Width Last Row */}
              <div className="userprofile-detail-item userprofile-detail-item-full">
                <div className="userprofile-detail-icon-wrapper">
                  <MdEmergency className="userprofile-detail-icon emergency-icon" />
                </div>
                <div className="userprofile-detail-content">
                  <label className="userprofile-detail-label">
                    Emergency Contacts
                  </label>
                  {!me?.emergencyContacts ||
                  me.emergencyContacts.length === 0 ? (
                    <p className="userprofile-detail-value">Not Set</p>
                  ) : (
                    <div className="emergency-contacts-list">
                      {me.emergencyContacts.map((contact, index) => (
                        <div
                          key={contact._id || index}
                          className="emergency-contact-inline"
                        >
                          <span className="contact-name">{contact.name}</span>
                          <span className="contact-separator">•</span>
                          <span className="contact-phone">{contact.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .emergency-icon {
          color: white;
        }

        .emergency-contacts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .emergency-contact-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          font-size: 0.95rem;
        }

        .contact-name {
          font-weight: 600;
          color: #374151;
        }

        .contact-separator {
          color: #9ca3af;
          font-weight: bold;
        }

        .contact-phone {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default UserProfile;
