import React, { useEffect, useState } from 'react'
import RegisterFamily from './RegisterFamily';
import RegisterCareTaker from './RegisterCareTaker';
import RegisterAdmin from './RegisterAdmin';

// Register: A wrapper for different kind of registry
// depending on the role the user selected
const Register = () => 
{
    const [role, setRole] = useState();
    
    const roleInputs = {
        familymember: <RegisterFamily/>,
        caretaker: <RegisterCareTaker/>,
        admin: <RegisterAdmin/>
    }

    return (
        <div className="wrapper">
            <div className="card">
                <h2>Register</h2>
                <label htmlFor = "role">
                    Choose your role:
                </label>
                <select className = "choose" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
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