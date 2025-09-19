import React from "react";
import "../../styles/LogIn.css"
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext"

function LogIn() {
  const navigate = useNavigate();
  const {setMe} = useAuth();
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
    setLoading(true); // start loading
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
      setLoading(false); // always stop loading
    }
  }

  return (
    <div className="login-wrapper">
      <div className="card">
        <h2>Login</h2>
        <form onSubmit={submit}>
          <input className="login-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
          <input className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />
          <div className="login-button-wrapper">
            <button disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
        <div className="login-register-link-wrapper">
          <Link className="login-register-link" to='/registeruser'>Don't have an account? Sign up here</Link>
        </div>
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      </div>
    </div>
  );
}

export default LogIn;
