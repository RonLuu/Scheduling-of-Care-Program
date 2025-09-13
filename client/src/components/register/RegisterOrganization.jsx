import React from "react";

function RegisterOrganization() {
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [org, setOrg] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    setOrg(null);
    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ name, address }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        {
          console.log("An error occurs:", e);
        }
      }

      if (res.status === 401) {
        setErr(
          "Please log in as an authorized user to create an organization."
        );
        return;
      }
      if (!res.ok) {
        const msg =
          data?.error || `Failed to create organisation (${res.status})`;
        throw new Error(msg);
      }

      setOrg(data); // expect {_id, name, address}
      // Optional: clear inputs on success
      setName("");
      setAddress("");
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Register Organization</h2>
      <form onSubmit={submit}>
        <input
          placeholder="Organisation name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          autoComplete="street-address"
        />
        <button disabled={busy}>
          {busy ? "Creating..." : "Create organisation"}
        </button>
      </form>

      {err && <p style={{ color: "#b91c1c" }}>Error: {err}</p>}

      {org && (
        <p>
          Created: <strong>{org.name}</strong>
          <br />
          Organisation ID: <code>{org._id}</code>
        </p>
      )}
    </div>
  );
}

export default RegisterOrganization;
