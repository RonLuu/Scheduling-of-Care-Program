import React from "react";
import RegisterOrganization from "./RegisterOrganization.jsx";
import RegisterUser from "./RegisterUser.jsx";

function Register({ onAuthed }) {
  return (
    <div>
      <RegisterUser onAuthed={onAuthed} />
      <RegisterOrganization />
    </div>
  );
}

export default Register;
