import React from "react";

function CareNeedItemRowEditor({ item, onCancel, onSaved, jwt }) {
  const [name, setName] = React.useState(item.name || "");

  // Only unscheduled (JustPurchase) or repeating (Daily/Weekly/Monthly/Yearly)
  const [intervalType, setIntervalType] = React.useState(
    item.frequency?.intervalType === "JustPurchase"
      ? "JustPurchase"
      : ["Daily", "Weekly", "Monthly", "Yearly"].includes(
          item.frequency?.intervalType
        )
      ? item.frequency.intervalType
      : "JustPurchase"
  );
  const [intervalValue, setIntervalValue] = React.useState(
    item.frequency?.intervalValue || 1
  );

  // End conditions
  const [endMode, setEndMode] = React.useState(
    item.endDate === null && item.occurrenceCount === null
      ? "yearEnd"
      : item.endDate
      ? "endDate"
      : item.occurrenceCount
      ? "count"
      : "endDate"
  );
  const [endDate, setEndDate] = React.useState(
    item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : ""
  );
  const [occCount, setOccCount] = React.useState(item.occurrenceCount || "");

  const [budgetCost, setBudgetCost] = React.useState(item.budgetCost || 0);
  const [purchaseCost, setPurchaseCost] = React.useState(
    item.purchaseCost || 0
  );

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const isUnscheduled = intervalType === "JustPurchase";

  const handleSave = async () => {
    try {
      setErr("");
      setBusy(true);
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!name.trim()) throw new Error("Name is required.");

      const payload = {
        name: name.trim(),
        budgetCost: Number(budgetCost) || 0,
        purchaseCost: Number(purchaseCost) || 0,
        // removed: occurrenceCost, scheduleType, timeWindow, assignees
      };

      // frequency (startDate is server-side or fixed to item existing start; no input now)
      payload.frequency = {
        intervalType,
        intervalValue: isUnscheduled ? 1 : Number(intervalValue) || 1,
        startDate: item.frequency?.startDate, // keep original anchor
      };

      // end conditions for repeating
      if (!isUnscheduled) {
        if (endMode === "yearEnd") {
          payload.endDate = null;
          payload.occurrenceCount = null;
        } else if (endMode === "endDate" && endDate) {
          payload.endDate = new Date(endDate).toISOString();
          payload.occurrenceCount = null;
        } else if (endMode === "count" && occCount) {
          payload.occurrenceCount = Number(occCount);
          payload.endDate = null;
        } else {
          payload.endDate = null;
          payload.occurrenceCount = null;
        }
      } else {
        payload.endDate = undefined;
        payload.occurrenceCount = undefined;
      }

      const r = await fetch(`/api/care-need-items/${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");

      onSaved?.(d);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      <div className="row">
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <div>
          <label>Recurrence</label>
          <select
            value={isUnscheduled ? "unscheduled" : "repeat"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "unscheduled") setIntervalType("JustPurchase");
              else {
                if (
                  !["Daily", "Weekly", "Monthly", "Yearly"].includes(
                    intervalType
                  )
                ) {
                  setIntervalType("Weekly");
                  setIntervalValue(1);
                }
              }
            }}
          >
            <option value="unscheduled">Unscheduled</option>
            <option value="repeat">Repeating</option>
          </select>
        </div>

        {!isUnscheduled && (
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <div>
              <label>Every</label>
              <input
                type="number"
                min="1"
                step="1"
                value={intervalValue}
                onChange={(e) => setIntervalValue(Number(e.target.value) || 1)}
                style={{ width: 100 }}
              />
            </div>
            <div>
              <label>&nbsp;</label>
              <select
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
              >
                <option value="Daily">{`Day${
                  intervalValue > 1 ? "s" : ""
                }`}</option>
                <option value="Weekly">{`Week${
                  intervalValue > 1 ? "s" : ""
                }`}</option>
                <option value="Monthly">{`Month${
                  intervalValue > 1 ? "s" : ""
                }`}</option>
                <option value="Yearly">{`Year${
                  intervalValue > 1 ? "s" : ""
                }`}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {!isUnscheduled && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <label>End condition</label>
              <select
                value={endMode}
                onChange={(e) => setEndMode(e.target.value)}
              >
                <option value="endDate">End by date</option>
                <option value="count">End after N occurrences</option>
                <option value="yearEnd">Until end of current year</option>
              </select>
            </div>
          </div>

          {endMode === "endDate" && (
            <div style={{ marginTop: 8 }}>
              <label>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          {endMode === "count" && (
            <div style={{ marginTop: 8 }}>
              <label>Number of occurrences</label>
              <input
                type="number"
                min="1"
                value={occCount}
                onChange={(e) => setOccCount(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      <div className="row" style={{ marginTop: 8 }}>
        <div>
          <label>Annual Budget (AUD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={String(budgetCost)}
            onChange={(e) => setBudgetCost(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label>Purchase cost (AUD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={String(purchaseCost)}
            onChange={(e) => setPurchaseCost(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {err && (
        <div style={{ color: "#b91c1c", marginTop: 8 }}>Error: {err}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default CareNeedItemRowEditor;
