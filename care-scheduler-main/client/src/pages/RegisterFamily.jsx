import React, {useState} from 'react'
import axios from 'axios'
import { client_URL_users } from '../../../constants';
const RegisterFamily = ({role}) => 
{
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [passwordHash, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [organizationId, setOrganizationId] = useState("");

    // async function submit(e) {
    //     e.preventDefault();
    //     setErr("");
    //     const r = await fetch("/api/auth/register-family", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ name, email, password, organizationId })
    //     });
    //     const d = await r.json();
    //     if (!r.ok) return setErr(d.error || "Registration failed");
    //     localStorage.setItem("jwt", d.session.jwt);
    //     onAuthed(d.user);
    // }

    const submit = () => {
        // TODO add prevent reload
        //e.preventDefault();
        const familyMember = {
            name,
            email,
            passwordHash,
            organizationId,
            role,
        }
        // TODO: loading screen
        // setloading()
        axios.post(client_URL_users, familyMember)
        .then(()=>{
            // TODO: better message
            console.log("Success")
        })
        .catch((error)=>{
            console.log(error)
        })
    }

    return (
        <>
            <h2>Register as a family member/POA</h2>
            <form onSubmit={submit}>
                <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
                <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" value={passwordHash} onChange={e => setPassword(e.target.value)} />
                <input placeholder="Organization ID" value={organizationId} onChange={e=>setOrganizationId(e.target.value)} />
                <button>Create family account</button>
            </form>
            {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        </>
    )
}
export default RegisterFamily