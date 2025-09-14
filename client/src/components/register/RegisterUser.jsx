import React, {useState} from "react";
import RegisterOrganization from "./RegisterOrganization.jsx";
import RegisterFamily from "./RegisterFamily.jsx";
import RegisterAdmin from "./RegisterAdmin.jsx";
import "../../styles/RegisterUser.css"
// Register: A wrapper for different kind of registry
// depending on the role the user selected
const RegisterUser = () => {
  const [role, setRole] = useState();

  const roleInputs = {
    familymember: <RegisterFamily/>,
    // caretaker: <RegisterCareTaker />,
    admin: <RegisterAdmin />
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h2>Register User</h2>
        <label htmlFor="role" style={{ fontSize: "20px" }}>
          Choose your role:
        </label>
        <select className="choose" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">-- Select a role --</option>
          <option value="familymember">Family Member</option>
          <option value="admin">Admin</option>
          <option value="caretaker">Caretaker</option>
        </select>
        {role && roleInputs[role]}
      </div>
    </div>

  );
}

export default RegisterUser

// function Register({ onAuthed }) {
//   return (
//     <div>
//       <RegisterUser onAuthed={onAuthed} />
//       <RegisterOrganization />
//     </div>
//   );
// }

// export default Register;
