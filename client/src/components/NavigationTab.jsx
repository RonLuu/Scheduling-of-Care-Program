import React, { useState } from "react";
import {
  BiMenu,
  BiSolidDashboard,
  BiCalendar,
  BiGroup,
  BiTask,
  BiUser,
  BiExit,
} from "react-icons/bi";
import { Link, useNavigate } from "react-router-dom";
import "../styles/NavigationTab.css";

const NavItem = ({ to, onClick, children }) => {
  // If `to` exists, render a Link; otherwise render a <button>
  return to ? (
    <Link to={to} className="navigationtab-link">
      {children}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="navigationtab-link as-button"
    >
      {children}
    </button>
  );
};

const NavigationTab = ({ setMe }) => {
  const [showTab, setShowTab] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setMe(null);
    navigate("/");
  };

  return (
    <div className="navigationtab-wrapper">
      <div className="navigationtab-button-menu-wrapper">
        <button
          className={`navigationtab-button-menu ${showTab ? "on" : "off"}`}
          onClick={() => setShowTab(!showTab)}
          type="button"
        >
          <BiMenu />
        </button>
      </div>

      {showTab && (
        <div
          className="navigationtab-overlay"
          onClick={() => setShowTab(false)}
        />
      )}

      <div className={`navigationtab-panel ${showTab ? "on" : "off"}`}>
        {showTab && (
          <div className="navigationtab-link-wrapper">
            <NavItem to="/faq">
              <BiSolidDashboard className="navigationtab-icon" />
              FAQ
            </NavItem>
            <NavItem to="/calendar">
              <BiCalendar className="navigationtab-icon" />
              Calendar
            </NavItem>
            <NavItem to="/budgetreport">
              <BiGroup className="navigationtab-icon" />
              Budget reports
            </NavItem>
            <NavItem to="/tasks">
              <BiTask className="navigationtab-icon" />
              Tasks
            </NavItem>
            <NavItem to="/profile">
              <BiUser className="navigationtab-icon" />
              Profile
            </NavItem>

            {/* Logout as button but styled identically */}
            <NavItem onClick={handleLogout}>
              <BiExit className="navigationtab-icon" />
              Logout
            </NavItem>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationTab;
