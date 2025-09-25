import React from "react";
import "../css/global_style.css";
import { Link } from "react-router-dom";
import useAuth from "./dashboard/hooks/useAuth";

function Header() {
  const { me } = useAuth();

  return (
    <header className="header">
      {me && (
        <span className="link">
          Hello,&nbsp;
          {me?.name || "Testing2"}
        </span>
      )}
    </header>
  );
}

export default Header;
