import React, { useState } from "react";
import Select from 'react-select';
import "../../css/login_layout.css";
import useAuth from "../dashboard/hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate } from "react-router-dom";

const RegisterUser = () => {
  const { setMe } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("Family"); // default
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    {value: 'Family', label: ' Family'},
    {value: 'Person of Authority', label: 'Person of Authority'},
    {value:'Admin', label:'Admin'},
    {value:'Caretaker', label:'Caretaker'},
  ];
  const selectedOption = options.find((opt) => opt.value === role) || null;
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
      navigate("/profile");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-wallpaper">
      <div className="box">
        <div className="register-box2 h80m20">
          <form onSubmit={submit}>
            <div className="left top">
              <h2>Register User</h2>
              <label className="login-label" >Enter Your Name 
                {/* Important tip */}
                <div className="help-wrapper">
                    <span className="important-info"> * </span>
                    <span className="tool-tip">Required</span>
                </div>
                <div className="help-wrapper">
                  <span className="help-icon " >?</span>
                <span className="tool-tip">Please type your First Name + Last Name</span>
                </div>
                
                </label>
              <input
                className="form"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <label className="login-label">Enter Your Email 
                {/* Important tip */}
                <div className="help-wrapper">
                    <span className="important-info"> * </span>
                    <span className="tool-tip">Required</span>
                </div>
                    <div className="help-wrapper">
                      <span className="help-icon " >?</span>
                      <span className="tool-tip">Please type a legit email!</span>
                    </div>
                
                </label>

              <input
                className="form"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <label className="login-label">Enter Your Password 
                {/* Important tip */}
                <div className="help-wrapper">
                    <span className="important-info"> * </span>
                    <span className="tool-tip">Required</span>
                </div>

                {/* Q&A tip */}

                 <div className="help-wrapper">
                      <span className="help-icon " >?</span>
                      <span className="tool-tip">Password should have more than 6 characters</span>
                    </div>
                </label>

              <input
                className="form"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="left center ">
              <h3 style={{fontWeight:"normal", color: "#2C3F70" }}>Choose your role: &nbsp;
                                {/* Important tip */}
                <div className="help-wrapper">
                    <span className="important-info"> * </span>
                    <span className="tool-tip">Required</span>
                </div>
                 
                    <div className="help-wrapper">
                      <span className="help-icon " >?</span>
                      <span className="tool-tip">Your relationship with the client</span>
                    </div>
              </h3>
              <div className="select-container  access-select" >
                <Select
                options={options}
                value={selectedOption || null}
                onChange={(option) => setRole(option ? option.value : "")}
                onMenuOpen={() => setIsOpen(true)}
                onMenuClose={() => setIsOpen(false)}
                classNamePrefix="role-select"
                isClearable
                placeholder="-- Select a role --"
                unstyled
                components={{
                DropdownIndicator: () => null, // hide default dropdown arrow
                IndicatorSeparator: () => null,
                }}
                classNames={{
                control: () => 'select__control',
                menu: () => 'select__menu',
                option: ({ isFocused, isSelected }) => 
                  `select__option ${isFocused ? 'select__option--is-focused' : ''}${isSelected ? ' select__option--is-selected' : ''}`,
                placeholder: () => 'select__placeholder',
                singleValue: () => 'select__single-value',
                clearIndicator: () => 'client-select__clear-indicator',

                }}
                />
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`icon ${isOpen ? "open" : "close"}`}
                />
              </div>
            </div>
            <div className="left bottom">
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </button>
            </div>
            {err && <p className="error">{err}</p>}
          </form>
        </div>

        <div className="register-box1 h20">
          <div className="left">
            <p>Already a member?</p>
            <Link to="/login">
              <button className="btn">Login</button>
            </Link>
          </div>
          {err && <p className="error">{err}</p>}
        </div>
      </div>
    </div>
  );
};

export default RegisterUser;
