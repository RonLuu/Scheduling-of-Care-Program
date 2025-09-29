import React, { useState } from "react";
import { BiUser } from "react-icons/bi";
import NavigationTab from "../../NavigationTab";
import EditInfo from "./EditInfo";

import "../../../styles/UserProfile.css";
function UserProfile({ me, refreshMe, jwt }) {
  const [showEdit, setShowEdit] = useState(false);

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

      <div className="userprofile-detail">
        <div className="userprofile-detail1">
          <div className="userprofile-image-wrapper">
            <BiUser className="userprofile-image" />
          </div>

          <div className="userprofile-detail1-general-wrapper">
            <p className="userprofile-detail1-general">
              {me?.name || "Testing"}
            </p>

            <button
              className="userprofile-detail1-edit-button"
              onClick={() => setShowEdit(!showEdit)}
            >
              Edit
            </button>
          </div>
        </div>

        <div className="userprofile-detail2" style={{ color: "#252E47" }}>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "35px",
              margin: "2% 0% 2% 5%",
            }}
          >
            Personal Detail
          </p>
          <div className="userprofile-detail2-detailed-wrapper">
            <p className="userprofile-detail2-detailed">
              <strong>Full name:</strong> {me?.name || "Not Set"}
            </p>
            <p className="userprofile-detail2-detailed">
              <strong>Role:</strong> {me?.role || "Not Set"}
            </p>
            <p className="userprofile-detail2-detailed">
              <strong>Phone number:</strong> {me?.mobile || "Not Set"}
            </p>
            <p className="userprofile-detail2-detailed">
              <strong>Email address:</strong> {me?.email || "Not Set"}
            </p>
            <p className="userprofile-detail2-detailed">
              <strong>Address:</strong> {me?.address || "Not Set"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
