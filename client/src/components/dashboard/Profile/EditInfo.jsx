import React from "react";
import { BiX } from "react-icons/bi";
import "../../../styles/UserProfile.css";

const EditInfo = ({ me, jwt, refreshMe, showEdit, setShowEdit }) => {
  const [name, setName] = React.useState(me?.name || "");
  const [mobile, setMobile] = React.useState(me?.mobile || "");
  const [address, setAddress] = React.useState(me?.address || "");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    // if me changes while panel is open, sync values
    setName(me?.name || "");
    setMobile(me?.mobile || "");
    setAddress(me?.address || "");
  }, [me]);

  const onConfirm = async () => {
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          name: name?.trim(),
          mobile: mobile?.trim() || null,
          address: address?.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update profile");

      // refresh parent "me"
      await refreshMe?.();

      setShowEdit(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="userprofile-edit-wrapper">
      <div className={`userprofile-edit ${showEdit ? "on" : "off"}`}>
        <div className="userprofile-edit-cancel-wrapper">
          <BiX
            className="userprofile-edit-cancel-icon"
            onClick={() => setShowEdit(!showEdit)}
          />
        </div>

        <div className="userprofile-edit-input">
          <input
            className="userprofile-input"
            placeholder={me?.name ? "" : "Please provide your full name."}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="userprofile-input"
            placeholder={me?.mobile ? "" : "Please provide your phone number."}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />

          <input
            className="userprofile-input"
            placeholder={me?.address ? "" : "Please provide your address..."}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {err && <div className="userprofile-error">{err}</div>}

          <button
            className="userprofile-detail1-main-button"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInfo;
