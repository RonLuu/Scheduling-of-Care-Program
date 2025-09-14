import React, {useState} from "react";
import RegisterOrganization from "./RegisterOrganization.jsx";
import RegisterFamily from "./RegisterFamily.jsx";
// Register: A wrapper for different kind of registry
// depending on the role the user selected
const Register = ({onAuthed}) => {
  const [role, setRole] = useState();

  const roleInputs = {
    familymember: <RegisterFamily role="Family" />,
    // caretaker: <RegisterCareTaker />,
    // admin: <RegisterAdmin />
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h2>Register</h2>
        <label htmlFor="role">
          Choose your role:
        </label>
        <select className="choose" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">-- Select a role --</option>
          <option value="familymember">Family Member/POA</option>
          <option value="admin">Admin</option>
          <option value="caretaker">Caretaker</option>
        </select>
        {role && roleInputs[role]}
      </div>
    </div>
  );
}

export default Register

// function Register({ onAuthed }) {
//   return (
//     <div>
//       <RegisterUser onAuthed={onAuthed} />
//       <RegisterOrganization />
//     </div>
//   );
// }

// export default Register;
