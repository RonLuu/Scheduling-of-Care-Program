import React from "react";
import "../../css/login_layout.css";
import "../../css/additional_help.css"
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
      navigate("/profile");
    } catch {
      setErr("Incorrect email or password. Please try again");
    } finally {
      setLoading(false); // always stop loading
    }
  }

  return (
    <div className="bg-wallpaper">
      <div className="box">
        <div className="register-box1 h45m40">
          <div className="left">
            <h3>Not a member yet?</h3>
            <Link to="/registeruser">
              <button className="btn">Register</button>
            </Link>
          </div>
        </div>
        <div className="register-box2 h55">
          <div className="left">
            <h2>Member Login</h2>
            <form onSubmit={submit}>
                {/* Important tip */}
                <label className="login-label">
                  Email
                  <span className="help-wrapper">
                    <span className="important-info">*</span>
                    <span className="tool-tip">Required</span>
                  </span>
                  <span className="help-wrapper">
                    <span className="help-icon">?</span>
                    <span className="tool-tip">The Email you use when register</span>
                  </span>
                </label>

              <input
                className="form"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              ></input>
               <label className="login-label">Password 
                {/* Important tip */}
                <div className="help-wrapper">
                    <span className="important-info"> * </span>
                    <span className="tool-tip">Required</span>
                </div>

                {/* Q&A tip */}

                 <div className="help-wrapper">
                      <span className="help-icon " >?</span>
                      <span className="tool-tip">The password you set up in register</span>
                    </div>
                </label>
              <input
                className="form"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              ></input>
              <button className="btn" disabled={loading}>
                {loading ? "Logging in…" : "Login"}
              </button>
            </form>
            {err && <p className="error">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogIn;