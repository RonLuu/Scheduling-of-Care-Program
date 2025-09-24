import React from "react";

function CareNeedItemRowEditor({ item, onCancel, onSaved, jwt }) {
  const [name, setName] = React.useState(item.name || "");

  // frequency editor mirrors your create form
  const [intervalType, setIntervalType] = React.useState(
    item.frequency?.intervalType || "JustPurchase"
  );
  const [intervalValue, setIntervalValue] = React.useState(
    item.frequency?.intervalValue || 1
  );
  const [startDate, setStartDate] = React.useState(
    item.frequency?.startDate
      ? new Date(item.frequency.startDate).toISOString().slice(0, 10)
      : ""
  );

  const [endMode, setEndMode] = React.useState(
    item.endDate ? "endDate" : item.occurrenceCount ? "count" : "none"
  );
  const [endDate, setEndDate] = React.useState(
    item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : ""
  );
  const [occCount, setOccCount] = React.useState(item.occurrenceCount || "");

  const [scheduleType, setScheduleType] = React.useState(
    item.scheduleType || "AllDay"
  );
  const [startTime, setStartTime] = React.useState(
    item.timeWindow?.startTime || "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    item.timeWindow?.endTime || "10:00"
  );

  const [budgetCost, setBudgetCost] = React.useState(item.budgetCost || 0);
  const [purchaseCost, setPurchaseCost] = React.useState(
    item.purchaseCost || 0
  );
  const [occurrenceCost, setOccurrenceCost] = React.useState(
    item.occurrenceCost || 0
  );

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const isJustPurchase = intervalType === "JustPurchase";

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
        occurrenceCost: isJustPurchase ? 0 : Number(occurrenceCost) || 0,
        scheduleType,
      };

      // frequency
      payload.frequency = {
        intervalType,
        intervalValue: isJustPurchase ? 1 : Number(intervalValue) || 1,
        startDate: isJustPurchase
          ? undefined
          : new Date(startDate).toISOString(),
      };

      // schedule time window
      if (!isJustPurchase && scheduleType === "Timed") {
        payload.timeWindow = { startTime, endTime };
      } else {
        payload.timeWindow = undefined;
      }

      // end conditions
      if (!isJustPurchase && intervalType !== "OneTime") {
        if (endMode === "endDate" && endDate) {
          payload.endDate = new Date(endDate).toISOString();
          payload.occurrenceCount = undefined;
        } else if (endMode === "count" && occCount) {
          payload.occurrenceCount = Number(occCount);
          payload.endDate = undefined;
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
            value={
              intervalType === "JustPurchase"
                ? "unscheduled"
                : intervalType === "OneTime"
                ? "one"
                : "repeat"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "unscheduled") setIntervalType("JustPurchase");
              else if (v === "one") setIntervalType("OneTime");
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
            <option value="one">One Time</option>
            <option value="repeat">Repeating</option>
          </select>
        </div>

        {["Daily", "Weekly", "Monthly", "Yearly"].includes(intervalType) && (
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

      {intervalType !== "JustPurchase" && (
        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          {intervalType !== "OneTime" && (
            <div>
              <label>End condition</label>
              <select
                value={endMode}
                onChange={(e) => setEndMode(e.target.value)}
              >
                <option value="none">No end</option>
                <option value="endDate">End by date</option>
                <option value="count">End after N occurrences</option>
              </select>
            </div>
          )}
        </div>
      )}

      {intervalType !== "JustPurchase" &&
        intervalType !== "OneTime" &&
        endMode === "endDate" && (
          <div style={{ marginTop: 8 }}>
            <label>End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

      {intervalType !== "JustPurchase" &&
        intervalType !== "OneTime" &&
        endMode === "count" && (
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

      {intervalType !== "JustPurchase" && (
        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <label>Schedule period</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
            >
              <option value="AllDay">All-day</option>
              <option value="Timed">Scheduled (start/end)</option>
            </select>
          </div>
          {scheduleType === "Timed" && (
            <div>
              <label>Start / End</label>
              <div className="row">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
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
        {intervalType !== "JustPurchase" && (
          <div>
            <label>Expected per task (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={String(occurrenceCost)}
              onChange={(e) => setOccurrenceCost(Number(e.target.value) || 0)}
            />
          </div>
        )}
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
