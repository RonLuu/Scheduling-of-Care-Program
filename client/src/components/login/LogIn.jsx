import React from "react";
import "../../css/login_layout.css"
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
  <div className="bg-wallpaper">
    <div className="box">
      <div className = "register-box1">
        <div className="left">
          <p >Not a member yet?</p>
          <Link to='/registeruser'>
          <button className = "btn">Register</button>
          </Link>
        </div>
      </div>
      <div className = "register-box2">
          <div className="left">
            <h2>Member Login</h2>
            
            <form onSubmit={submit}>
              <input className="form" 
              placeholder = "Email" value={email} 
              onChange={(e) => setEmail(e.target.value)}>
              </input>
              <input className="form" type="password"
              placeholder = "Password" value={password} 
              onChange={(e) => setPassword(e.target.value)}>
              </input>
              <button className = "btn"  disabled={loading}>
                {loading ? "Logging in…" : "Login"}
              </button>
            </form>
        </div>
      </div>
    </div>
  </div>
  );
}

export default LogIn;
