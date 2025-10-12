import React, { useState } from "react";
import { BiUser, BiPencil, BiEnvelope, BiPhone, BiMap, BiBriefcase } from "react-icons/bi";
import NavigationTab from "../../NavigationTab";
import EditInfo from "./EditInfo";

import "../../../styles/UserProfile.css";

function UserProfile({ me, refreshMe, jwt }) {
  const [showEdit, setShowEdit] = useState(false);

  const avatarUrl = me?.avatarFileId?.urlOrPath;

  return (
    <div className={`userprofile-wrapper ${showEdit ? "showEditOn" : ""}`}>
      {showEdit && (
        <EditInfo
          me={me}
          jwt={jwt}
          refreshMe={refreshMe}
          showEdit={showEdit}
          setShowEdit={setShowEdit}
        />
      )}

      <NavigationTab className="navigationtab" />

      <div className="userprofile-container">
        <div className="userprofile-content">
          {/* Profile Header Card */}
          <div className="userprofile-header-card">
            <div className="userprofile-avatar-section">
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
            </div>

            <div className="userprofile-header-info">
              <h1 className="userprofile-name">
                {me?.name || "User Name"}
              </h1>
              <div className="userprofile-role-badge">
                <BiBriefcase className="userprofile-role-icon" />
                <span>{me?.role || "Role"}</span>
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
                  <label className="userprofile-detail-label">Email Address</label>
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
                  <label className="userprofile-detail-label">Phone Number</label>
                  <p className="userprofile-detail-value">
                    {me?.mobile || "Not Set"}
                  </p>
                </div>
              </div>

              <div className="userprofile-detail-item userprofile-detail-item-full">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
