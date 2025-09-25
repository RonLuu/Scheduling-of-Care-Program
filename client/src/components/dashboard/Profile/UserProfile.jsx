import React, { useState } from "react";
import { BiUser } from "react-icons/bi";

import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab"
import EditInfo from "./EditInfo";
import OrganizationManagement from "./OrganizationManagement";
import "../../../styles/UserProfile.css";
function UserProfile() {
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { me, setMe } = useAuth();
  const jwt = localStorage.getItem("jwt");
  const handleLeaveOrganization = async () => {
    try {
      const r = await fetch("/api/users/me/leave-organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");

      alert("You left the organisation successfully.");

      const rr = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + jwt },
      });
      if (rr.ok) {
        refreshMe();
      }
    } catch (e) {
      alert("Error leaving organisation: " + (e.message || e));
    }
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setMe(null);
  };

  const refreshMe = async () => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return setMe(null);
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
  return (

    <div className={`userprofile-wrapper ${showEdit ? "showEditOn" : ""}`}>
      {showEdit &&
        (
          <EditInfo showEdit = {showEdit} setShowEdit = {setShowEdit}/>
        )}

      {showAdd && (me.role === "Family" || me.role === "PoA") &&
        (
          <OrganizationManagement
            me={me}
            jwt={jwt}
            refreshMe={refreshMe}
            showAdd = {showAdd}
            setShowAdd = {setShowAdd}
          />
        )}

      <NavigationTab className="navigationtab" />

      {/* TODO: add a user icon */}
      <div className="userprofile-detail">
        <div className="userprofile-detail1">
          <div className="userprofile-image-wrapper">
            <BiUser className="userprofile-image"></BiUser>

          </div>
          <div className="userprofile-detail1-general-wrapper">
            <p className="userprofile-detail1-general">{me?.name || "Testing"}</p>
            {(me?.role === "Family" || me?.role === "PoA") && (
              <>
                {!me?.organizationId ? 
                  (
                    <button className="userprofile-detail1-add-button" onClick={() => setShowAdd(!showAdd)}>
                      Add Organization ID
                    </button>
                  ) : 
                  (
                    <button className="userprofile-detail1-add-button" onClick={() => setShowAdd(!showAdd)}>
                      Change Organization ID
                    </button>
                  )
                }
                <button className="userprofile-detail1-edit-button" onClick={() => setShowEdit(!showEdit)}>
                  Edit
                </button>
              </>
            )}
          </div>
          <div className="userprofile-detail1-remove-button-wrapper">
            <button className="userprofile-detail1-remove-button" onClick={() => handleLeaveOrganization()}>Leave Organization</button>
          </div>
        </div>
        <div className="userprofile-detail2" style={{ color: "#252E47" }}>
          <p style={{ fontWeight: 'bold', fontSize: '35px', margin: "2% 0% 2% 5%" }}>Personal Detail</p>
          <div className="userprofile-detail2-detailed-wrapper">
            <p className="userprofile-detail2-detailed"><strong>Full name:</strong> {me?.name || "Testing"}</p>
            <p className="userprofile-detail2-detailed"><strong>Role:</strong> {me?.role || "Testing"}</p>
            <p className="userprofile-detail2-detailed"><strong>Phone number:</strong> 04XXXXXXX</p>
            <p className="userprofile-detail2-detailed"><strong>Email address:</strong> {me?.email || "Testing"}</p>
            <p className="userprofile-detail2-detailed"><strong>Address:</strong> XXXXXX</p>

          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
