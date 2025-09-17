import React from "react";
import { aud, toAnnualBudget } from "../utils/formatters";

function AddClient({ me, jwt, setClients }) {
  const [newPName, setNewPName] = React.useState("");
  const [newPDob, setNewPDob] = React.useState("");
  const [newPMed, setNewPMed] = React.useState("");
  const [newPBudgetType, setNewPBudgetType] = React.useState("Year");
  const [newPBudgetAmt, setNewPBudgetAmt] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [addErr, setAddErr] = React.useState("");

  const addClient = async (e) => {
    e.preventDefault();
    if (!me.organizationId) {
      setAddErr("Please set your organisation first.");
      return;
    }
    if (!me || (me.role !== "Family" && me.role !== "PoA")) return;

    setAdding(true);
    setAddErr("");

    try {
      const annual = toAnnualBudget(newPBudgetType, newPBudgetAmt);

      // Create PersonWithNeeds
      const r1 = await fetch("/api/person-with-needs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          name: newPName,
          dateOfBirth: newPDob ? new Date(newPDob).toISOString() : undefined,
          medicalInfo: newPMed,
          organizationId: me.organizationId,
          currentAnnualBudget: annual,
        }),
      });
      const p = await r1.json();
      if (!r1.ok) throw new Error(p.error || "Failed to create person");

      // Create PersonUserLink
      const r2 = await fetch("/api/person-user-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          personId: p._id,
          userId: me.id,
          relationshipType: "Family",
          active: true,
          startAt: new Date(),
        }),
      });
      const l = await r2.json();
      if (!r2.ok) throw new Error(l.error || "Failed to link person");

      // Refresh clients list
      const linksRes = await fetch(`/api/person-user-links?userId=${me.id}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const links = await linksRes.json();
      const persons = await Promise.all(
        links.map((link) =>
          fetch(`/api/person-with-needs/${link.personId}`, {
            headers: { Authorization: "Bearer " + jwt },
          })
            .then((rr) => rr.json())
            .then((pp) => ({
              ...pp,
              relationshipType: link.relationshipType,
            }))
        )
      );
      setClients(persons);

      // Clear form
      setNewPName("");
      setNewPDob("");
      setNewPMed("");
      setNewPBudgetType("Year");
      setNewPBudgetAmt("");
    } catch (err) {
      setAddErr(err.message || String(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card">
      <h3>Add a client (PWSN)</h3>
      <form onSubmit={addClient}>
        <input
          placeholder="Client name"
          value={newPName}
          onChange={(e) => setNewPName(e.target.value)}
          required
        />
        <div className="row">
          <div>
            <label>Date of birth</label>
            <input
              type="date"
              value={newPDob}
              onChange={(e) => setNewPDob(e.target.value)}
            />
          </div>
          <div>
            <label>Medical info (optional)</label>
            <input
              value={newPMed}
              onChange={(e) => setNewPMed(e.target.value)}
              placeholder="e.g., allergies, notes..."
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Budget period</label>
            <select
              value={newPBudgetType}
              onChange={(e) => setNewPBudgetType(e.target.value)}
            >
              <option>Year</option>
              <option>Month</option>
              <option>Week</option>
            </select>
          </div>
          <div>
            <label>Budget amount (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPBudgetAmt}
              onChange={(e) => setNewPBudgetAmt(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <p style={{ opacity: 0.7 }}>
          Annual budget will be saved as:{" "}
          <strong>
            {aud.format(toAnnualBudget(newPBudgetType, newPBudgetAmt))}
          </strong>
        </p>

        <button disabled={adding}>{adding ? "Adding..." : "Add client"}</button>
        {addErr && <p style={{ color: "#b91c1c" }}>Error: {addErr}</p>}
        <p className="badge">
          Org derived from your account:{" "}
          <code>{(me && me.organizationId) || ""}</code>
        </p>
      </form>
    </div>
  );
}

export default AddClient;
