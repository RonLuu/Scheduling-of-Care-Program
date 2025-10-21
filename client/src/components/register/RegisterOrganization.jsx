import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/AuthPages.css";
import "../../css/login_layout.css";

const RegisterOrganization = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, address }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-json error */
      }

      if (!res.ok) {
        const msg =
          data?.error || `Failed to register organization (${res.status})`;
        setErr(msg);
        return;
      }

      // Show success message
      setSuccess(true);
      setName("");
      setAddress("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: "500px" }}>
        <div className="auth-header">
          <h2>Register Organization</h2>
          <p>Add your organization to the system</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {err && <div className="auth-error">{err}</div>}

          {success && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                color: "#16a34a",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Organization registered successfully! Redirecting to login...
            </div>
          )}

          <div className="auth-form-group">
            <label>
              Organization Name{" "}
              <span className="required-mark" title="This field is required">
                *
              </span>
            </label>
            <input
              placeholder="Enter organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="organization"
            />
          </div>

          <div className="auth-form-group">
            <label>
              Address{" "}
              <span className="required-mark" title="This field is required">
                *
              </span>
            </label>
            <input
              placeholder="Enter organization address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              autoComplete="street-address"
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || success}
          >
            {loading
              ? "Registering..."
              : success
              ? "Success!"
              : "Register Organization"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <p>Ready to log in?</p>
          <Link to="/login" className="auth-footer-link">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterOrganization;
