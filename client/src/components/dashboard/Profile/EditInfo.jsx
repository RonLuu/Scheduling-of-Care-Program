import React from "react";
import { BiX, BiUpload } from "react-icons/bi";
import "../../../styles/UserProfile.css";

const EditInfo = ({ me, jwt, refreshMe, showEdit, setShowEdit }) => {
  const [name, setName] = React.useState(me?.name || "");
  const [mobile, setMobile] = React.useState(me?.mobile || "");
  const [address, setAddress] = React.useState(me?.address || "");
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    // if me changes while panel is open, sync values
    setName(me?.name || "");
    setMobile(me?.mobile || "");
    setAddress(me?.address || "");
  }, [me]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErr("Please select an image file");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image must be less than 10MB");
      return;
    }

    // Create preview
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

      // Refresh user data to get new avatar
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

  const onConfirm = async () => {
    setSaving(true);
    setErr("");
    try {
      // Upload avatar if selected
      if (avatarPreview && fileInputRef.current?.files?.[0]) {
        await uploadAvatar();
      }

      // Update profile info
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

  const currentAvatarUrl = me?.avatarFileId?.urlOrPath;
  const displayAvatar = avatarPreview || currentAvatarUrl;

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
            placeholder={me?.address ? "" : "Please provide your address."}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {err && <div className="userprofile-error">{err}</div>}

          <button
            className="userprofile-detail1-main-button"
            onClick={onConfirm}
            disabled={saving || uploading}
          >
            {saving ? "Saving..." : uploading ? "Uploading..." : "Confirm"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .avatar-upload-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: #f9fafb;
        }

        .avatar-label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: #374151;
        }

        .avatar-preview {
          width: 120px;
          height: 120px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #e5e7eb;
        }

        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .avatar-upload-btn,
        .avatar-delete-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .avatar-upload-btn {
          background: #3b82f6;
          color: white;
        }

        .avatar-upload-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .avatar-delete-btn {
          background: #ef4444;
          color: white;
        }

        .avatar-delete-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .avatar-upload-btn:disabled,
        .avatar-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .avatar-hint {
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default EditInfo;
