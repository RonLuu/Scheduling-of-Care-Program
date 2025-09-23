import React, { useState } from "react";
import {
  BiMenu,
  BiHelpCircle,
  BiUser,
  BiLockAlt,
  BiGroup,
  BiCalendar,
  BiGitBranch,
  BiTask,
  BiBarChartSquare,
  BiExit,
} from "react-icons/bi";
import { Link, useNavigate } from "react-router-dom";
import "../styles/NavigationTab.css";
import useAuth from "./dashboard/hooks/useAuth";

const NavItem = ({ to, onClick, children }) => {
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

const NavigationTab = () => {
  const [showTab, setShowTab] = useState(false);
  const { setMe } = useAuth();
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
              <BiHelpCircle className="navigationtab-icon" />
              FAQ
            </NavItem>
            <NavItem to="/profile">
              <BiUser className="navigationtab-icon" />
              Profile
            </NavItem>
            <NavItem to="/access">
              <BiLockAlt className="navigationtab-icon" />
              Access
            </NavItem>
            <NavItem to="/clients">
              <BiGroup className="navigationtab-icon" />
              Clients
            </NavItem>
            <NavItem to="/shift-allocation">
              <BiCalendar className="navigationtab-icon" />
              Shift Allocation
            </NavItem>
            <NavItem to="/sub-elements">
              <BiGitBranch className="navigationtab-icon" />
              Sub-elements
            </NavItem>
            <NavItem to="/tasks">
              <BiTask className="navigationtab-icon" />
              Tasks
            </NavItem>
            <NavItem to="/budget-reports">
              <BiBarChartSquare className="navigationtab-icon" />
              Budget Reports
            </NavItem>

            {/* Log Out as a button but styled like links */}
            <NavItem onClick={handleLogout}>
              <BiExit className="navigationtab-icon" />
              Log Out
            </NavItem>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationTab;
