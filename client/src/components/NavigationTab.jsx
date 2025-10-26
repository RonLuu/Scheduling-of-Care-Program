import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWallet, 
  faListCheck, 
  faHouseChimney, 
  faUser, 
  faUsers,
  faRightFromBracket,
  faBars,
  faCalendarDays} from '@fortawesome/free-solid-svg-icons';
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
          <FontAwesomeIcon className="menu-icon" icon={faBars} />

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
                <FontAwesomeIcon className="navigationtab-icon" icon={faHouseChimney} />
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
              <FontAwesomeIcon className="navigationtab-icon" icon={faListCheck} />

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
                <FontAwesomeIcon className="navigationtab-icon" icon={faWallet} />
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
              <FontAwesomeIcon className="navigationtab-icon" icon={faUsers} />
              Clients
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              Add or Track Clients
              </span>
            </span>
            </NavItem>
            <NavItem to="/shift-allocation">
              <FontAwesomeIcon className="navigationtab-icon" icon={faCalendarDays} />
              Shift Allocation
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">
              See Today's Caretakers' Shifts
              </span>
            </span>
            </NavItem>
            <NavItem to="/profile">
              <FontAwesomeIcon className="navigationtab-icon" icon={faUser} />
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
              <FontAwesomeIcon className= {"navigationtab-icon"} icon={faRightFromBracket} />
              Log Out
            </NavItem>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationTab;
