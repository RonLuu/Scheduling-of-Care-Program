import React from "react";

function Create({ jwt, clients }) {
  // Form state
  const [ciPersonId, setCiPersonId] = React.useState("");
  const [ciName, setCiName] = React.useState("");
  const [ciDesc, setCiDesc] = React.useState("");
  const [ciCategory, setCiCategory] = React.useState("HygieneProducts");
  const [ciCategories, setCiCategories] = React.useState([
    "HygieneProducts",
    "Clothing",
    "Health",
    "Entertainment",
    "Other",
  ]);
  const [ciUseCustomCat, setCiUseCustomCat] = React.useState(false);
  const [ciCustomCat, setCiCustomCat] = React.useState("");

  const [ciIntervalType, setCiIntervalType] = React.useState("JustPurchase");
  const [ciIntervalValue, setCiIntervalValue] = React.useState(1);
  const [ciStartDate, setCiStartDate] = React.useState("");
  const [ciEndMode, setCiEndMode] = React.useState("none");
  const [ciEndDate, setCiEndDate] = React.useState("");
  const [ciOccurrenceCount, setCiOccurrenceCount] = React.useState("");

  const [ciBudgetCost, setCiBudgetCost] = React.useState(0);
  const [ciPurchaseCost, setCiPurchaseCost] = React.useState(0);
  const [ciOccurrenceCost, setCiOccurrenceCost] = React.useState(0);

  const [ciScheduleType, setCiScheduleType] = React.useState("AllDay");
  const [ciStartTime, setCiStartTime] = React.useState("09:00");
  const [ciEndTime, setCiEndTime] = React.useState("10:00");

  const [assignableUsers, setAssignableUsers] = React.useState([]);
  const [ciAssignedTo, setCiAssignedTo] = React.useState("");

  const [ciBusy, setCiBusy] = React.useState(false);
  const [ciErr, setCiErr] = React.useState("");
  const [ciSuccess, setCiSuccess] = React.useState("");

  // Attachments
  const [attachMode, setAttachMode] = React.useState("none"); // none | upload | reference
  const [attachFile, setAttachFile] = React.useState(null);
  const [sharedFileId, setSharedFileId] = React.useState("");

  // Load categories when client is selected
  React.useEffect(() => {
    if (!jwt || !ciPersonId) return;
    fetch(`/api/person-with-needs/${ciPersonId}/categories`, {
      headers: { Authorization: "Bearer " + jwt },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.categories)) {
          setCiCategories(d.categories);
          if (!d.categories.includes(ciCategory)) {
            setCiCategory(d.categories[0] || "Other");
          }
        }
      })
      .catch(() => {});
  }, [ciPersonId, jwt, ciCategory]);

  // Load assignable users when client is selected
  React.useEffect(() => {
    if (!jwt || !ciPersonId) {
      setAssignableUsers([]);
      setCiAssignedTo("");
      return;
    }

    fetch(
      `/api/person-user-links/assignable-users?personId=${encodeURIComponent(
        ciPersonId
      )}`,
      {
        headers: { Authorization: "Bearer " + jwt },
      }
    )
      .then((r) => r.json())
      .then((d) => setAssignableUsers(Array.isArray(d) ? d : []))
      .catch(() => setAssignableUsers([]));
  }, [ciPersonId, jwt]);

  const submitCareNeedItem = async (e) => {
    e.preventDefault();
    setCiErr("");
    setCiSuccess("");
    setCiBusy(true);
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!ciPersonId) throw new Error("Please select a client.");
      if (!ciName) throw new Error("Name is required.");

      const startDate =
        ciIntervalType === "JustPurchase" ? new Date() : new Date(ciStartDate);

      const payload = {
        personId: ciPersonId,
        name: ciName,
        description: ciDesc,
        ...(ciUseCustomCat
          ? { newCategoryName: ciCustomCat, category: ciCustomCat || "Other" }
          : { category: ciCategory }),
        frequency: {
          intervalType: ciIntervalType,
          intervalValue: Number(ciIntervalValue),
          startDate: startDate.toISOString(),
        },
        scheduleType: ciScheduleType,
        budgetCost: Number(ciBudgetCost) || 0,
        purchaseCost: Number(ciPurchaseCost) || 0,
        occurrenceCost: Number(ciOccurrenceCost) || 0,
      };

      if (ciScheduleType === "Timed") {
        payload.timeWindow = { startTime: ciStartTime, endTime: ciEndTime };
      }
      if (ciEndMode === "endDate" && ciEndDate)
        payload.endDate = new Date(ciEndDate).toISOString();
      if (ciEndMode === "count" && ciOccurrenceCount)
        payload.occurrenceCount = Number(ciOccurrenceCount);

      if (attachMode === "reference") {
        const id = (sharedFileId || "").trim();

        // 1) Basic 24-hex check (client side)
        const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        if (!looksLikeObjectId) {
          throw new Error("Invalid receipt File ID format.");
        }

        // 2) Check existence & scope === 'Shared'
        const chk = await fetch(`/api/file-upload/${encodeURIComponent(id)}`, {
          headers: { Authorization: "Bearer " + jwt },
        });
        const fd = await chk.json();
        if (!chk.ok)
          throw new Error(fd.error || "Failed to verify receipt File ID");

        if (!fd || fd.scope !== "Shared") {
          throw new Error(
            "That File ID is not a shared receipt (bucket) file."
          );
        }
      }

      // 1) Create CareNeedItem
      const r1 = await fetch("/api/care-need-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(payload),
      });
      const item = await r1.json();
      if (!r1.ok) throw new Error(item.error || "Failed to create item");

      // 2) Generate tasks unless JustPurchase
      if (ciIntervalType !== "JustPurchase") {
        const r2 = await fetch(
          `/api/scheduling/care-need-items/${item._id}/generate-tasks`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + jwt,
            },
            body: JSON.stringify(
              ciAssignedTo ? { assignToUserId: ciAssignedTo } : {}
            ),
          }
        );
        const gen = await r2.json();
        if (!r2.ok) throw new Error(gen.error || "Failed to generate tasks");
        setCiSuccess(`Created item and generated ${gen.upserts || 0} tasks.`);
      } else {
        setCiSuccess(`Created purchase-only care need item (no tasks).`);
      }

      // 3) Attach (optional)
      if (attachMode === "upload" && attachFile) {
        const fd = new FormData();
        fd.append("scope", "CareNeedItem");
        fd.append("targetId", item._id);
        fd.append("file", attachFile);
        const up = await fetch("/api/file-upload/upload", {
          method: "POST",
          headers: { Authorization: "Bearer " + jwt },
          body: fd,
        });
        const ud = await up.json();
        if (!up.ok) throw new Error(ud.error || "File upload failed");
      } else if (attachMode === "reference" && sharedFileId) {
        const ref = await fetch("/api/file-upload/shared/reference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({
            careNeedItemId: item._id,
            fileId: sharedFileId,
          }),
        });
        const rd = await ref.json();
        if (!ref.ok) throw new Error(rd.error || "Failed to reference receipt");
      }

      // Reset
      setCiName("");
      setCiDesc("");
      setCiUseCustomCat(false);
      setCiCustomCat("");
      setCiPurchaseCost(0);
      setCiOccurrenceCost(0);
      setCiBudgetCost(0);
      setCiIntervalType("Daily");
      setCiIntervalValue(1);
      setCiEndMode("none");
      setCiEndDate("");
      setCiOccurrenceCount("");
      setAttachMode("none");
      setAttachFile(null);
      setSharedFileId("");
    } catch (err) {
      setCiErr(err.message || String(err));
    } finally {
      setCiBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Create Care Need Item (Sub-element)</h3>
      <form onSubmit={submitCareNeedItem}>
        <label>Client</label>
        <select
          value={ciPersonId}
          onChange={(e) => setCiPersonId(e.target.value)}
        >
          <option value="">— Select a client —</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="row">
          <div>
            <label>Name</label>
            <input
              value={ciName}
              onChange={(e) => setCiName(e.target.value)}
              placeholder="e.g., Dental visit"
            />
          </div>

          <div>
            <label>Category</label>
            {!ciUseCustomCat ? (
              <>
                <select
                  value={ciCategory}
                  onChange={(e) => setCiCategory(e.target.value)}
                >
                  {ciCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCiUseCustomCat(true);
                    setCiCustomCat("");
                  }}
                  style={{ marginTop: 6 }}
                >
                  + Add custom
                </button>
              </>
            ) : (
              <>
                <input
                  placeholder="Type new category"
                  value={ciCustomCat}
                  onChange={(e) => setCiCustomCat(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setCiUseCustomCat(false)}
                  >
                    Use list instead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <label>Description</label>
        <input
          value={ciDesc}
          onChange={(e) => setCiDesc(e.target.value)}
          placeholder="Optional notes"
        />

        <div className="row">
          <div>
            <label>Interval Type</label>
            <select
              value={ciIntervalType}
              onChange={(e) => setCiIntervalType(e.target.value)}
            >
              <option value="JustPurchase">Just Purchase</option>
              <option value="OneTime">One Time</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          {ciIntervalType !== "OneTime" &&
            ciIntervalType !== "JustPurchase" && (
              <div>
                <label>Every N (interval value)</label>
                <input
                  type="number"
                  min="1"
                  value={ciIntervalValue}
                  onChange={(e) => setCiIntervalValue(e.target.value)}
                />
              </div>
            )}
        </div>

        {ciIntervalType !== "JustPurchase" && (
          <div className="row">
            <div>
              <label>Start date</label>
              <input
                type="date"
                value={ciStartDate}
                onChange={(e) => setCiStartDate(e.target.value)}
              />
            </div>
            {ciIntervalType !== "OneTime" && (
              <div>
                <label>End condition</label>
                <select
                  value={ciEndMode}
                  onChange={(e) => setCiEndMode(e.target.value)}
                >
                  <option value="none">No end</option>
                  <option value="endDate">End by date</option>
                  <option value="count">End after N occurrences</option>
                </select>
              </div>
            )}
          </div>
        )}

        {ciEndMode === "endDate" && (
          <div>
            <label>End date</label>
            <input
              type="date"
              value={ciEndDate}
              onChange={(e) => setCiEndDate(e.target.value)}
            />
          </div>
        )}
        {ciEndMode === "count" && (
          <div>
            <label>Occurrences</label>
            <input
              type="number"
              min="1"
              value={ciOccurrenceCount}
              onChange={(e) => setCiOccurrenceCount(e.target.value)}
            />
          </div>
        )}

        {ciIntervalType !== "JustPurchase" && (
          <div className="row">
            <div>
              <label>Schedule type</label>
              <select
                value={ciScheduleType}
                onChange={(e) => setCiScheduleType(e.target.value)}
              >
                <option value="AllDay">All-day</option>
                <option value="Timed">Scheduled (start/end)</option>
              </select>
            </div>

            {ciScheduleType === "Timed" && (
              <div>
                <label>Start time / End time</label>
                <div className="row">
                  <input
                    type="time"
                    value={ciStartTime}
                    onChange={(e) => setCiStartTime(e.target.value)}
                  />
                  <input
                    type="time"
                    value={ciEndTime}
                    onChange={(e) => setCiEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="row">
          <div>
            <label>Annual Budget (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ciBudgetCost !== 0 ? String(ciBudgetCost) : ""}
              onChange={(e) => setCiBudgetCost(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Purchase cost (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ciPurchaseCost !== 0 ? String(ciPurchaseCost) : ""}
              onChange={(e) => setCiPurchaseCost(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
          {ciIntervalType !== "JustPurchase" && (
            <div>
              <label>Expected occurrence cost per task (AUD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ciOccurrenceCost !== 0 ? String(ciOccurrenceCost) : ""}
                onChange={(e) => setCiOccurrenceCost(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        {ciPersonId && ciIntervalType !== "JustPurchase" && (
          <div className="row">
            <div>
              <label>Assign to (optional)</label>
              <select
                value={ciAssignedTo}
                onChange={(e) => setCiAssignedTo(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {assignableUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <p style={{ opacity: 0.7, marginTop: -6 }}>
                Admins and staff linked to this client
              </p>
            </div>
          </div>
        )}

        {/* Attach receipt */}
        <hr />
        <label>Attach receipt</label>
        <select
          value={attachMode}
          onChange={(e) => setAttachMode(e.target.value)}
        >
          <option value="none">— No attachment —</option>
          <option value="upload">Upload directly to this care item</option>
          <option value="reference">Reference a shared receipt (bucket)</option>
        </select>

        {attachMode === "upload" && (
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
            />
          </div>
        )}

        {attachMode === "reference" && (
          <div style={{ marginTop: 8 }}>
            <input
              placeholder="Paste shared receipt File ID"
              value={sharedFileId}
              onChange={(e) => setSharedFileId(e.target.value)}
            />
            <p style={{ opacity: 0.7, marginTop: -6 }}>
              Get the File ID from the “Receipt buckets” page for this client &
              month.
            </p>
          </div>
        )}

        <button disabled={ciBusy}>{ciBusy ? "Saving..." : "Create"}</button>
        {ciErr && <p style={{ color: "#b91c1c" }}>Error: {ciErr}</p>}
        {ciSuccess && <p style={{ color: "#065f46" }}>{ciSuccess}</p>}
      </form>
    </div>
  );
}

export default Create;
