import React from "react";

function CareNeedItemRowEditor({ item, onCancel, onSaved, jwt }) {
  const [name, setName] = React.useState(item.name || "");

  // Start date (Event Day for unscheduled, Start Date for repeating)
  const [startDate, setStartDate] = React.useState(
    item.frequency?.startDate
      ? new Date(item.frequency.startDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

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

  const [budgetCost] = React.useState(item.budgetCost || 0); // Read-only
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
        budgetCost: Number(budgetCost) || 0, // Keep original value
        purchaseCost: Number(purchaseCost) || 0,
      };

      // frequency with the user-selected start date
      payload.frequency = {
        intervalType,
        intervalValue: isUnscheduled ? 1 : Number(intervalValue) || 1,
        startDate: new Date(startDate + "T00:00:00").toISOString(),
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

  const containerStyle = {
    background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  };

  const sectionStyle = {
    background: "white",
    borderRadius: 6,
    padding: "12px 14px",
    marginBottom: 12,
    border: "1px solid #e2e8f0",
  };

  const compactLabelStyle = {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#475569",
    marginBottom: 4,
    display: "block",
  };

  const inputStyle = {
    padding: "6px 10px",
    fontSize: "0.95rem",
    borderRadius: 4,
  };

  const readOnlyInputStyle = {
    ...inputStyle,
    backgroundColor: "#f1f5f9",
    cursor: "not-allowed",
    opacity: 0.7,
  };

  return (
    <div style={containerStyle}>
      {/* Name and Date Section */}
      <div style={sectionStyle}>
        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}
        >
          <div>
            <label style={compactLabelStyle}>Sub-element Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="e.g., Dental visit"
            />
          </div>
          <div>
            <label style={compactLabelStyle}>
              {isUnscheduled ? "Event Day" : "Start Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Recurrence Section */}
      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isUnscheduled ? "1fr" : "150px 100px auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label style={compactLabelStyle}>Recurrence</label>
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
              style={inputStyle}
            >
              <option value="unscheduled">Unscheduled</option>
              <option value="repeat">Repeating</option>
            </select>
          </div>

          {!isUnscheduled && (
            <>
              <div>
                <label style={compactLabelStyle}>Every</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={intervalValue}
                  onChange={(e) =>
                    setIntervalValue(Number(e.target.value) || 1)
                  }
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div>
                <label style={compactLabelStyle}>Period</label>
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value)}
                  style={inputStyle}
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
            </>
          )}
        </div>

        {/* End Conditions */}
        {!isUnscheduled && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  endMode === "endDate" || endMode === "count"
                    ? "200px 1fr"
                    : "1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={compactLabelStyle}>End condition</label>
                <select
                  value={endMode}
                  onChange={(e) => setEndMode(e.target.value)}
                  style={inputStyle}
                >
                  <option value="endDate">End by date</option>
                  <option value="count">After N occurrences</option>
                  <option value="yearEnd">End of current year</option>
                </select>
              </div>

              {endMode === "endDate" && (
                <div>
                  <label style={compactLabelStyle}>End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {endMode === "count" && (
                <div>
                  <label style={compactLabelStyle}>Number of occurrences</label>
                  <input
                    type="number"
                    min="1"
                    value={occCount}
                    onChange={(e) => setOccCount(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g., 10"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Costs Section */}
      <div style={sectionStyle}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label style={compactLabelStyle}>
              Annual Budget (AUD)
              <span
                style={{ fontSize: "0.75rem", marginLeft: 6, color: "#94a3b8" }}
              >
                (read-only)
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={String(budgetCost)}
              style={readOnlyInputStyle}
              readOnly
              disabled
            />
          </div>
          <div>
            <label style={compactLabelStyle}>Purchase Cost (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={String(purchaseCost)}
              onChange={(e) => setPurchaseCost(Number(e.target.value) || 0)}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {err && (
        <div
          style={{
            color: "#dc2626",
            fontSize: "0.875rem",
            padding: "8px 12px",
            background: "#fef2f2",
            borderRadius: 4,
            border: "1px solid #fecaca",
            marginBottom: 12,
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          className="secondary"
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: "8px 20px",
            fontSize: "0.925rem",
            borderRadius: 4,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={busy}
          style={{
            padding: "8px 20px",
            fontSize: "0.925rem",
            borderRadius: 4,
            background: busy ? "#94a3b8" : undefined,
          }}
        >
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default CareNeedItemRowEditor;
