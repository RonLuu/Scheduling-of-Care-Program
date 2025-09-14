import React, { useState } from 'react'

const RegisterAdmin = () => {
    const [token, setToken] = useState("");
    const [preview, setPreview] = useState(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    async function verify() {
        setErr("");
        const r = await fetch(API + "/tokens/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        const d = await r.json();
        setPreview(d.valid ? d : { valid: false });
        if (!d.valid) setErr("Invalid or expired token");
    }

    async function submit(e) {
        e.preventDefault();
        setErr("");
        const r = await fetch(API + "/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, name, email, password })
        });
        const d = await r.json();
        if (!r.ok) return setErr(d.error || "Registration failed");
        localStorage.setItem("jwt", d.session.jwt);
        onAuthed(d.user);
    }

    return (
        <>
            <h2>Register with a token</h2>
            <div className="row">
                <div>
                    <input placeholder="Invitation token" value={token} onChange={e => setToken(e.target.value)} />
                    <button className="secondary" type="button" onClick={verify}>Verify</button>
                    {preview && (preview.valid
                        ? <p><span className="badge">{preview.role}</span> · org <code>{preview.organizationId}</code></p>
                        : <p>Token invalid</p>)}
                </div>
                <div>
                    <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
                    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                    <button onClick={submit}>Create account</button>
                </div>
            </div>
            {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        </>
    )
}

export default RegisterAdmin