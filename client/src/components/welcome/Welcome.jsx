import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../dashboard/hooks/useAuth";
import "../../styles/Welcome.css";

const Welcome = () => {
  // me for whether the user logged in
  const { me } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (me) {
      navigate("/profile");
    }
  }, [me, navigate]);

  // ---- render a React nav  ----
  return (
    <div className="button-wrapper">
      <Link to="/login">
        <button id="nav-login">Login</button>
      </Link>
      <Link to="/registeruser">
        <button id="nav-register">Register</button>
      </Link>
    </div>
  );
};

export default Welcome;
