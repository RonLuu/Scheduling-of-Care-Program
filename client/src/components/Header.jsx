import React from "react";
import "../css/global_style.css";
import { Link } from "react-router-dom";
import useAuth from "./dashboard/hooks/useAuth.jsx";
import NavigationTab from "./NavigationTab.jsx";

const Header = ({ title }) => {
  const { me } = useAuth();

  return (
    <header className="header">
      <div className="navigation-tab"><NavigationTab/></div>
      <h1>{title}</h1>
      <span className="link">
          Hello,&nbsp;
          <Link to="/profile">{me?.name || "Testing2"}</Link>
      </span>
    </header>
  );
}

export default Header;