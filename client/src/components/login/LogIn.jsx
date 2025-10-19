import React from "react";
import "../../styles/AuthPages.css";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../dashboard/hooks/useAuth";

function LogIn() {
  const navigate = useNavigate();
  const { setMe } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function onAuthed(userWithJwt) {
    setMe(userWithJwt);
    localStorage.setItem("jwt", userWithJwt.jwt);
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) return setErr(d.error || "Login failed");

      const jwt = d.session?.jwt;
      const expiresIn = d.session?.expiresIn ?? 3600;
      if (jwt) {
        localStorage.setItem("jwt", jwt);
        localStorage.setItem(
          "jwt_expires_at",
          String(Date.now() + expiresIn * 1000)
        );
      }
      onAuthed({ ...d.user, jwt, expiresIn });
      navigate("/dashboard");
    } catch {
      setErr("Incorrect email or password. Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome to Schedule of Care</h2>
          <p>Sign in to your account to continue</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {err && <div className="auth-error">{err}</div>}

          <div className="auth-form-group">
            <label>
              Email <span className="required-mark" title="This field is required">*</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-form-group">
            <label>
              Password <span className="required-mark" title="This field is required">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <Link to="/registeruser" className="auth-footer-link">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LogIn;