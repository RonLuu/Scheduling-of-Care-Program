import React from "react";
import { BiX, BiUpload, BiPlus, BiTrash } from "react-icons/bi";
import "../../../styles/UserProfile.css";

const EditInfo = ({ me, jwt, refreshMe, showEdit, setShowEdit }) => {
  const [name, setName] = React.useState(me?.name || "");
  const [mobile, setMobile] = React.useState(me?.mobile || "");
  const [address, setAddress] = React.useState(me?.address || "");
  const [title, setTitle] = React.useState(me?.title || "");
  const [emergencyContacts, setEmergencyContacts] = React.useState(
    Array.isArray(me?.emergencyContacts) ? me.emergencyContacts : []
  );
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    setName(me?.name || "");
    setMobile(me?.mobile || "");
    setAddress(me?.address || "");
    setTitle(me?.title || "");
    // Ensure we always have an array, even if undefined
    setEmergencyContacts(
      Array.isArray(me?.emergencyContacts) ? me.emergencyContacts : []
    );
  }, [me]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErr("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErr("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setErr("");

    try {
      const formData = new FormData();
      formData.append("scope", "UserProfile");
      formData.append("targetId", me._id || me.id);
      formData.append("file", file);

      const r = await fetch("/api/file-upload/upload", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
        },
        body: formData,
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to upload avatar");

      await refreshMe?.();
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (
      !window.confirm("Are you sure you want to delete your profile picture?")
    ) {
      return;
    }

    setUploading(true);
    setErr("");

    try {
      const r = await fetch("/api/file-upload/user-avatar", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + jwt,
        },
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to delete avatar");

      await refreshMe?.();
      setAvatarPreview(null);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  // Emergency contact handlers
  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: "", phone: "" }]);
  };

  const updateEmergencyContact = (index, field, value) => {
    const updated = [...emergencyContacts];
    updated[index][field] = value;
    setEmergencyContacts(updated);
  };

  const removeEmergencyContact = (index) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updated);
  };

  const onConfirm = async () => {
    setSaving(true);
    setErr("");
    try {
      // Upload avatar if selected
      if (avatarPreview && fileInputRef.current?.files?.[0]) {
        await uploadAvatar();
      }

      // Validate and clean emergency contacts
      const validContacts = emergencyContacts
        .filter((contact) => contact && contact.name && contact.phone)
        .map((contact) => ({
          name: contact.name.trim(),
          phone: contact.phone.trim(),
        }));

      // Update profile info
      const payload = {
        name: name?.trim(),
        mobile: mobile?.trim() || null,
        address: address?.trim() || null,
        emergencyContacts: validContacts,
      };

      // Include title field only for Admin users
      if (me?.role === "Admin") {
        payload.title = title?.trim() || null;
      }

      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "Failed to update profile");

      await refreshMe?.();
      setShowEdit(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const currentAvatarUrl = me?.avatarFileId?.urlOrPath;
  const displayAvatar = avatarPreview || currentAvatarUrl;

  return (
    <div className="userprofile-edit-wrapper">
      <div className={`userprofile-edit ${showEdit ? "on" : "off"}`}>
        <div className="userprofile-edit-header">
          <h2 className="userprofile-edit-title">Edit Profile</h2>
          <button
            className="userprofile-edit-close-btn"
            onClick={() => setShowEdit(!showEdit)}
            type="button"
          >
            <BiX className="userprofile-edit-close-icon" />
          </button>
        </div>

        <div className="userprofile-edit-content">
          {/* Avatar Upload Section */}
          <div className="avatar-upload-section">
            <label className="avatar-label">Profile Picture</label>

            {displayAvatar && (
              <div className="avatar-preview">
                <img src={displayAvatar} alt="Avatar preview" />
              </div>
            )}

            <div className="avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <button
                type="button"
                className="avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <BiUpload />{" "}
                {currentAvatarUrl ? "Change Picture" : "Upload Picture"}
              </button>

              {currentAvatarUrl && (
                <button
                  type="button"
                  className="avatar-delete-btn"
                  onClick={deleteAvatar}
                  disabled={uploading}
                >
                  Delete Picture
                </button>
              )}
            </div>
          </div>

          {/* Profile Info Inputs */}
          <div className="userprofile-input-group">
            <label className="userprofile-input-label">Full Name</label>
            <input
              className="userprofile-input"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Title field - Only for Admin users */}
          {me?.role === "Admin" && (
            <div className="userprofile-input-group">
              <label className="userprofile-input-label">Role Title</label>
              <input
                className="userprofile-input"
                placeholder="e.g., Manager, Supervisor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}

          <div className="userprofile-input-group">
            <label className="userprofile-input-label">Phone Number</label>
            <input
              className="userprofile-input"
              placeholder="Enter your phone number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="userprofile-input-group">
            <label className="userprofile-input-label">Address</label>
            <input
              className="userprofile-input"
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Emergency Contacts Section */}
          <div className="emergency-contacts-section">
            <div className="emergency-contacts-header">
              <label className="userprofile-input-label">
                Emergency Contacts
              </label>
              <button
                type="button"
                className="add-contact-btn"
                onClick={addEmergencyContact}
              >
                <BiPlus /> Add Contact
              </button>
            </div>

            {emergencyContacts.length === 0 && (
              <p className="no-contacts-message">
                No emergency contacts added yet
              </p>
            )}

            {emergencyContacts.map((contact, index) => (
              <div key={index} className="emergency-contact-item">
                <div className="emergency-contact-fields">
                  <input
                    className="userprofile-input emergency-contact-name"
                    placeholder="Contact name"
                    value={contact.name}
                    onChange={(e) =>
                      updateEmergencyContact(index, "name", e.target.value)
                    }
                  />
                  <input
                    className="userprofile-input emergency-contact-phone"
                    placeholder="Contact number"
                    value={contact.phone}
                    onChange={(e) =>
                      updateEmergencyContact(index, "phone", e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  className="remove-contact-btn"
                  onClick={() => removeEmergencyContact(index)}
                  title="Remove contact"
                >
                  <BiTrash />
                </button>
              </div>
            ))}
          </div>

          {err && <div className="userprofile-error">{err}</div>}

          <button
            className="userprofile-save-button"
            onClick={onConfirm}
            disabled={saving || uploading}
          >
            {saving ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .avatar-upload-section {
          margin-bottom: 1.25rem;
          padding: 1.5rem;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          background: #f9fafb;
          transition: all 0.2s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .avatar-upload-section:hover {
          border-color: #8189d2;
          background: #f3f4f6;
        }

        .avatar-label {
          display: block;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #374151;
          font-size: 1rem;
        }

        .avatar-preview {
          width: 120px;
          height: 120px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #8189d2;
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.2);
        }

        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .avatar-upload-btn,
        .avatar-delete-btn {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
        }

        .avatar-upload-btn {
          background: #8189d2;
          color: white;
        }

        .avatar-upload-btn:hover:not(:disabled) {
          background: #6d76c4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.4);
        }

        .avatar-delete-btn {
          background: #ef4444;
          color: white;
        }

        .avatar-delete-btn:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .avatar-upload-btn:disabled,
        .avatar-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .emergency-contacts-section {
          margin-bottom: 1.25rem;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
        }

        .emergency-contacts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .add-contact-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          background: #8189d2;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
        }

        .add-contact-btn:hover {
          background: #6d76c4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
        }

        .no-contacts-message {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          padding: 1rem 0;
        }

        .emergency-contact-item {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          align-items: flex-start;
        }

        .emergency-contact-fields {
          flex: 1;
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .emergency-contact-name,
        .emergency-contact-phone {
          flex: 1;
          min-width: 150px;
        }

        .remove-contact-btn {
          padding: 0.625rem;
          border: none;
          border-radius: 8px;
          background: #ef4444;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .remove-contact-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .userprofile-edit-header button {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default EditInfo;
