import React, { useState } from "react";
import Select from 'react-select';
import "../../styles/AuthPages.css";
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
    {value: 'Power of Attorney', label: 'Power of Attorney'},
    {value:'Organization Representative', label:'Organization Representative'},
    {value:'Career', label:'Career'},
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
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: "500px" }}>
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Register to get started</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {err && <div className="auth-error">{err}</div>}

          <div className="auth-form-group">
            <label>
              Full Name <span className="required-mark">*</span>
            </label>
            <input
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-form-group">
            <label>
              Email <span className="required-mark">*</span>
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
              Password <span className="required-mark">*</span>
            </label>
            <input
              type="password"
              placeholder="Password (at least 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div className="auth-form-group">
            <label>
              Role <span className="required-mark">*</span>
              &nbsp;
              <span className="help-wrapper">
                <span className="help-icon">?</span>
                <span className="tool-tip">Your relationship with the Person 
                  With Special Needs you want to care for</span>
              </span>
            </label>
            <div className="select-container access-select">
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
                  DropdownIndicator: () => null,
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

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <p>Already have an account?</p>
          <Link to="/login" className="auth-footer-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterUser;