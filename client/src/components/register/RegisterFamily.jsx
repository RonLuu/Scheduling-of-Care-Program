import React from "react";
import "../../styles/RegisterFamily.css"
function onAuthed(userWithJwt) {
  setMe(userWithJwt);
  localStorage.setItem("jwt", userWithJwt.jwt);
  setPage("dashboard");
}

function RegisterFamily() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("Family"); // default
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      // Try to parse JSON safely
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-json error page etc */
      }

      if (!res.ok) {
        const msg = data?.error || `Registration failed (${res.status})`;
        setErr(msg);
        return;
      }

      // Expecting: { session: { jwt }, user: {...} }
      const jwt = data?.session?.jwt;
      const expiresIn = data?.session?.expiresIn ?? 3600;
      if (jwt) {
        localStorage.setItem("jwt", jwt);
        localStorage.setItem(
          "jwt_expires_at",
          String(Date.now() + expiresIn * 1000)
        );
      }
      onAuthed({ ...(data?.user ?? null), jwt, expiresIn });
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit}>
        <div>
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
        </div>
        <div className="button-containter">
          <button disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
    </div>
  );
}

export default RegisterFamily;
