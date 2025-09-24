import React from "react";
import "../css/global_style.css";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

function Header() {
  const { me } = useAuth();

  return (
    <header className="header">
      {me && (
        <span className="link">
            Hello,&nbsp;
            <Link to="/dashboard">{me?.name || "Testing2"}</Link>
        </span>
      )}
    </header>
  );
}

export default Header;
