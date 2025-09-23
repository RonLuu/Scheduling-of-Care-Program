import React, { useState } from "react";
import "../../css/login_layout.css"
import {useAuth} from "../../AuthContext"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { data, Link, useNavigate } from 'react-router-dom';

const RegisterUser = () => {
  const {setMe} = useAuth();
  const navigate = useNavigate();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("Family"); // default
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = useState(false);
  function onAuthed(userWithJwt) {
    setMe(userWithJwt);
    localStorage.setItem("jwt", userWithJwt.jwt);
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
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
    <div className="bg-wallpaper">
      <div className = "box">
        <div className = "register-box2 h80m20">
            <form onSubmit={submit} >
              <div className="left top">
                <h2 >Register User</h2>
                <input className="form"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
                <input className="form"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <input className="form"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />

              </div>
              <div className = "left center">
                  <h3 style={{ color: "#8b8b8bff" }}>
                    Choose your role:
                  </h3>     
               <div className="select-container">
                  <select className={` form role ${role === '' ? 'italic' : ''}`} 
                  id="role" value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  onBlur={() => setIsOpen(false)} onClick={() => setIsOpen(!isOpen)} >
                    <option style={{ fontStyle: 'italic' }} value="">-- Select a role --</option>
                    <option className = "role"value="Family">Family Member</option>
                    <option className = "role" value="PoA">PoA</option> 
                    <option className = "role" value="Admin">Admin</option>
                    <option className = "role" value="GeneralCareStaff">Caretaker</option>
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} 
                  className={`icon ${isOpen ? 'open' : 'close'}`} />
                </div>
               
              </div>
              <div className = "left bottom">
                <button className = "btn" type='submit' disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
          

        <div className = "register-box1 h20">
          <div className="left">
            <p >Already a member?</p>
            <Link to='/login'>
            <button className = "btn">Login</button>
            </Link>
          </div>
           {err && <p className = "error">{err}</p>}
        </div>
      </div>
    </div> 
  );
}

export default RegisterUser

