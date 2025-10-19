import React, { useState, useEffect, useRef } from "react";
import {
  BiMenu,
  BiHelpCircle,
  BiUser,
  BiBuilding,
  BiLockAlt,
  BiGroup,
  BiCalendar,
  BiGitBranch,
  BiTask,
  BiBarChartSquare,
  BiExit,
  BiHome,
  BiDollarCircle,
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
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setMe(null);
    navigate("/");
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTab &&
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowTab(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTab]);

  return (
    <div className="navigationtab-wrapper">
      <div className="navigationtab-button-menu-wrapper">
        <button
          ref={buttonRef}
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

      <div
        ref={panelRef}
        className={`navigationtab-panel ${showTab ? "on" : "off"}`}
      >
        {showTab && (
          <div className="navigationtab-link-wrapper">
            {(me?.role === "Family" || me?.role === "Admin" || me?.role === "PoA" || me?.role === "GeneralCareStaff") && (
              <NavItem to="/dashboard">
                <BiHome className="navigationtab-icon" />
                Dashboard
              <span className="tooltip-wrapper">
                <span className="tooltip-icon">?</span>
                <span className="tooltip-text">
                  Overview of Client's Schedule, Budget, and Care Taker
                </span>
            </span>
              </NavItem>
            )}
            <NavItem to="/tasks">
              <BiTask className="navigationtab-icon" />
              Tasks
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              Create and View Tasks
              </span>
            </span>
            </NavItem>
            {me?.role !== "GeneralCareStaff" && (
              <NavItem to="/budget-and-reports">
                <BiDollarCircle className="navigationtab-icon" />
                Budget & Reports
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              See your spending
              </span>
            </span>                
              </NavItem>
            )}
            <NavItem to="/clients">
              <BiGroup className="navigationtab-icon" />
              Clients
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              Add or Track Clients
              </span>
            </span>
            </NavItem>
            <NavItem to="/shift-allocation">
              <BiCalendar className="navigationtab-icon" />
              Shift Allocation
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              See Today's Caretakers' Shifts
              </span>
            </span>
            </NavItem>
            <NavItem to="/profile">
              <BiUser className="navigationtab-icon" />
              Profile
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              Your Personal Information
              </span>
            </span>             
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
