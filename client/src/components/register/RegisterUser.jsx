import React, { useState } from "react";
import "../../styles/RegisterUser.css"
import {useAuth} from "../../AuthContext"
import { useNavigate } from "react-router-dom";
// TODO refactor useAuth() to a different file function

const RegisterUser = () => {
  const {setMe} = useAuth();
  const navigate = useNavigate();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("Family"); // default
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
      const res = await fetch("/api/auth/register-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      // Try to parse JSON safely
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-json error page etc */
      }

      if (!res.ok) {
        const msg = data?.error || `Registration failed (${res.me})`;
        setErr(msg);
        return;
      }

      // Expecting: { session: { jwt }, user: {...} }
      const jwt = data?.session?.jwt;
      const expiresIn = data?.session?.expiresIn ?? 3600;
      if (jwt) {
        localStorage.setItem("jwt", jwt);
        localStorage.setItem(
          "jwt_expires_at",
          String(Date.now() + expiresIn * 1000)
        );
      }
      onAuthed({ ...(data?.user ?? null), jwt, expiresIn });
      navigate("/dashboard")

    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-wrapper">
      <div className="card">
        <h2>Register User</h2>
        <form onSubmit={submit}>
          <div>
            <input className="register-input"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <input className="register-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input className="register-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="role" style={{ fontSize: "20px" }}>
              Choose your role:
            </label>
            <select className="register-choose" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">-- Select a role --</option>
              <option value="Family">Family Member</option>
              <option value="PoA">PoA</option>
              <option value="Admin">Admin</option>
              <option value="GeneralCareStaff">Caretaker</option>
            </select>
          </div>
          <div className="register-button-wrapper">
            <button disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
        {/* TODO: add route to sign in */}
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      </div>
    </div> 
  );
}

export default RegisterUser

