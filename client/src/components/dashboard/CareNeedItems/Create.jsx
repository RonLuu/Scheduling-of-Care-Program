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

  // Recurrence: JustPurchase (unscheduled) or repeating (Daily/Weekly/Monthly/Yearly)
  const [ciIntervalType, setCiIntervalType] = React.useState("JustPurchase");
  const [ciIntervalValue, setCiIntervalValue] = React.useState(1);

  // End conditions for repeating only
  const [ciEndMode, setCiEndMode] = React.useState("endDate"); // endDate | count | yearEnd
  const [ciEndDate, setCiEndDate] = React.useState("");
  const [ciOccurrenceCount, setCiOccurrenceCount] = React.useState("");

  // Costs (annual budget + purchase only)
  const [ciBudgetCost, setCiBudgetCost] = React.useState(0);
  const [ciPurchaseCost, setCiPurchaseCost] = React.useState(0);

  const [ciBusy, setCiBusy] = React.useState(false);
  const [ciErr, setCiErr] = React.useState("");
  const [ciSuccess, setCiSuccess] = React.useState("");

  // Attachments
  const [attachMode, setAttachMode] = React.useState("none"); // none | upload | reference
  const [attachFile, setAttachFile] = React.useState(null);

  // --- Shared receipt reference UI state ---
  const [refPickDate, setRefPickDate] = React.useState(
    new Date().toISOString().slice(0, 10) // yyyy-mm-dd
  );
  const [refMode, setRefMode] = React.useState("month"); // "month" | "day"
  const [refFiles, setRefFiles] = React.useState([]); // loaded month’s files
  const [refSelectedFileId, setRefSelectedFileId] = React.useState("");
  const [refLoading, setRefLoading] = React.useState(false);
  const [refErr, setRefErr] = React.useState("");

  const loadSharedBucket = async (y, m) => {
    try {
      setRefErr("");
      setRefLoading(true);
      setRefFiles([]);
      setRefSelectedFileId("");
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!ciPersonId) throw new Error("Select a client first");

      const r = await fetch(
        `/api/file-upload/buckets?personId=${encodeURIComponent(
          ciPersonId
        )}&year=${y}&month=${m}`,
        { headers: { Authorization: "Bearer " + jwt } }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load receipts");
      setRefFiles(Array.isArray(d.files) ? d.files : []);
    } catch (e) {
      setRefErr(e.message || String(e));
    } finally {
      setRefLoading(false);
    }
  };

  // Jump to this month’s bucket
  const quickPickTodayBucket = () => {
    const now = new Date();
    const toLocalYMD = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString(
        "en-CA"
      );
    setRefPickDate(toLocalYMD(now));
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    loadSharedBucket(y, m);
  };

  // Pick any day -> load that day’s month bucket
  const pickBucketByDate = () => {
    if (!refPickDate) return;
    const d = new Date(`${refPickDate}T00:00:00`);
    loadSharedBucket(d.getFullYear(), d.getMonth() + 1);
  };

  const visibleReceipts = React.useMemo(() => {
    if (refMode !== "day" || !refPickDate) return refFiles;
    return refFiles.filter((f) => {
      const baseDate = f.effectiveDate || f.createdAt;
      if (!baseDate) return false;
      const localDay = new Date(baseDate).toLocaleDateString("en-CA");
      return localDay === refPickDate;
    });
  }, [refFiles, refMode, refPickDate]);

  // Reset picker when client changes
  React.useEffect(() => {
    setRefFiles([]);
    setRefSelectedFileId("");
    setRefErr("");
  }, [ciPersonId]);

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

  const submitCareNeedItem = async (e) => {
    e.preventDefault();
    setCiErr("");
    setCiSuccess("");
    setCiBusy(true);
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!ciPersonId) throw new Error("Please select a client.");
      if (!ciName) throw new Error("Name is required.");

      const todayISO = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
      ).toISOString(); // 00:00 local -> ISO

      const isUnscheduled = ciIntervalType === "JustPurchase";

      const payload = {
        personId: ciPersonId,
        name: ciName,
        description: ciDesc,
        ...(ciUseCustomCat
          ? { newCategoryName: ciCustomCat, category: ciCustomCat || "Other" }
          : { category: ciCategory }),
        // frequency: startDate defaults to today; only for repeating items we care about cadence
        frequency: {
          intervalType: ciIntervalType, // JustPurchase or one of Daily/Weekly/Monthly/Yearly
          intervalValue: isUnscheduled ? 1 : Number(ciIntervalValue) || 1,
          startDate: todayISO,
        },
        // costs
        budgetCost: Number(ciBudgetCost) || 0,
        purchaseCost: Number(ciPurchaseCost) || 0,
        // removed: occurrenceCost, scheduleType, timeWindow, assignees
      };

      // End conditions (only if repeating)
      if (
        !isUnscheduled &&
        ["Daily", "Weekly", "Monthly", "Yearly"].includes(ciIntervalType)
      ) {
        if (ciEndMode === "yearEnd") {
          payload.endDate = null;
          payload.occurrenceCount = null;
        } else if (ciEndMode === "endDate" && ciEndDate) {
          payload.endDate = new Date(ciEndDate).toISOString();
          payload.occurrenceCount = null;
        } else if (ciEndMode === "count" && ciOccurrenceCount) {
          payload.occurrenceCount = Number(ciOccurrenceCount);
          payload.endDate = null;
        } else {
          payload.endDate = null;
          payload.occurrenceCount = null;
        }
      } else {
        payload.endDate = undefined;
        payload.occurrenceCount = undefined;
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

      // 2) Generate tasks only if repeating (server should ignore time/assignee)
      if (!isUnscheduled) {
        const r2 = await fetch(
          `/api/scheduling/care-need-items/${item._id}/generate-tasks`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + jwt,
            },
            body: JSON.stringify({}), // no assignment, no times
          }
        );
        const gen = await r2.json();
        if (!r2.ok) throw new Error(gen.error || "Failed to generate tasks");
        setCiSuccess(`Created item and generated ${gen.upserts || 0} tasks.`);
      } else {
        setCiSuccess(`Created unscheduled care need item (no tasks).`);
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
      } else if (attachMode === "reference" && refSelectedFileId) {
        const ref = await fetch("/api/file-upload/shared/reference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({
            careNeedItemId: item._id,
            fileId: refSelectedFileId,
          }),
        });
        const rd = await ref.json();
        if (!ref.ok) throw new Error(rd.error || "Failed to reference receipt");
      }

      // Reset (keep client & category selection)
      setCiName("");
      setCiDesc("");
      setCiUseCustomCat(false);
      setCiCustomCat("");
      setCiPurchaseCost(0);
      setCiBudgetCost(0);
      setCiIntervalType("JustPurchase");
      setCiIntervalValue(1);
      setCiEndMode("endDate");
      setCiEndDate("");
      setCiOccurrenceCount("");
      setAttachMode("none");
      setAttachFile(null);
      setRefFiles([]);
      setRefSelectedFileId("");
      setRefErr("");
    } catch (err) {
      setCiErr(err.message || String(err));
    } finally {
      setCiBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Create Sub-element</h3>
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
            <label>Category Name</label>
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

          <div>
            <label>Sub-element Name</label>
            <input
              value={ciName}
              onChange={(e) => setCiName(e.target.value)}
              placeholder="e.g., Dental visit"
            />
          </div>
        </div>

        <label>Description/Comment</label>
        <input
          value={ciDesc}
          onChange={(e) => setCiDesc(e.target.value)}
          placeholder="Optional comment"
        />

        {/* Recurrence */}
        <div className="row">
          <div>
            <label>Recurrence</label>
            <select
              value={
                ciIntervalType === "JustPurchase" ? "unscheduled" : "repeat"
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "unscheduled") {
                  setCiIntervalType("JustPurchase");
                } else {
                  if (
                    !["Daily", "Weekly", "Monthly", "Yearly"].includes(
                      ciIntervalType
                    )
                  ) {
                    setCiIntervalType("Weekly");
                    setCiIntervalValue(1);
                  }
                  setCiEndMode("endDate");
                }
              }}
            >
              <option value="unscheduled">Unscheduled</option>
              <option value="repeat">Repeating</option>
            </select>
            <p style={{ opacity: 0.6, marginTop: 4 }}>
              {ciIntervalType === "JustPurchase"
                ? "Only happens today (no tasks will be scheduled)."
                : "Repeating tasks will be generated on a cadence. Start date defaults to today."}
            </p>
          </div>

          {["Daily", "Weekly", "Monthly", "Yearly"].includes(
            ciIntervalType
          ) && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div>
                <label>Repeat every</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={ciIntervalValue}
                  onChange={(e) =>
                    setCiIntervalValue(Number(e.target.value) || 1)
                  }
                  style={{ width: 100 }}
                />
              </div>
              <div>
                <label>&nbsp;</label>
                <select
                  value={ciIntervalType}
                  onChange={(e) => setCiIntervalType(e.target.value)}
                >
                  <option value="Daily">
                    {`Day${ciIntervalValue > 1 ? "s" : ""}`}
                  </option>
                  <option value="Weekly">
                    {`Week${ciIntervalValue > 1 ? "s" : ""}`}
                  </option>
                  <option value="Monthly">
                    {`Month${ciIntervalValue > 1 ? "s" : ""}`}
                  </option>
                  <option value="Yearly">
                    {`Year${ciIntervalValue > 1 ? "s" : ""}`}
                  </option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* End conditions (repeating only) */}
        {["Daily", "Weekly", "Monthly", "Yearly"].includes(ciIntervalType) && (
          <>
            <div className="row">
              <div>
                <label>End condition</label>
                <select
                  value={ciEndMode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCiEndMode(v);
                    if (v === "yearEnd") {
                      setCiEndDate("");
                      setCiOccurrenceCount("");
                    }
                  }}
                >
                  <option value="endDate">End by date</option>
                  <option value="count">End after some occurrences</option>
                  <option value="yearEnd">
                    Until end of current year (copy next year later)
                  </option>
                </select>
              </div>
            </div>

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
                <label>Number of occurrences</label>
                <input
                  type="number"
                  min="1"
                  value={ciOccurrenceCount}
                  onChange={(e) => setCiOccurrenceCount(e.target.value)}
                />
              </div>
            )}
          </>
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
        </div>

        {/* Attach receipt */}
        <hr />
        <label>Attach Receipt/Record/Photograph</label>
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
          <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
            <div className="row" style={{ alignItems: "end", gap: 12 }}>
              <div>
                <label>Pick a day</label>
                <input
                  type="date"
                  value={refPickDate}
                  onChange={(e) => setRefPickDate(e.target.value)}
                  style={{ width: 180 }}
                />
              </div>

              <div>
                <label>Load scope</label>
                <div style={{ display: "flex", gap: 12 }}>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <input
                      type="radio"
                      name="refScope"
                      value="day"
                      checked={refMode === "day"}
                      onChange={() => setRefMode("day")}
                    />
                    That exact day
                  </label>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <input
                      type="radio"
                      name="refScope"
                      value="month"
                      checked={refMode === "month"}
                      onChange={() => setRefMode("month")}
                    />
                    Whole month (of that day)
                  </label>
                </div>
              </div>

              <div>
                <label>&nbsp;</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={pickBucketByDate}
                    disabled={!ciPersonId || refLoading}
                    title="Load the bucket for the chosen date"
                  >
                    {refLoading ? "Loading…" : "Load"}
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={quickPickTodayBucket}
                    disabled={!ciPersonId || refLoading}
                    title="Jump to this month’s bucket"
                  >
                    Use today’s bucket
                  </button>
                </div>
              </div>
            </div>

            {refErr && <div style={{ color: "#b91c1c" }}>Error: {refErr}</div>}

            <div>
              <label>Select receipt</label>
              <select
                value={refSelectedFileId}
                onChange={(e) => setRefSelectedFileId(e.target.value)}
                disabled={visibleReceipts.length === 0}
                style={{ minWidth: 520 }}
              >
                <option value="">
                  {visibleReceipts.length === 0
                    ? "— No receipts found —"
                    : "— Choose a receipt —"}
                </option>
                {visibleReceipts.map((f) => (
                  <option key={f._id} value={f._id}>
                    {`${f.filename}${
                      f.description ? " • " + f.description : ""
                    } • ${new Date(
                      f.effectiveDate || f.createdAt
                    ).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              {refMode === "day" &&
                refFiles.length > 0 &&
                visibleReceipts.length === 0 && (
                  <div style={{ marginTop: 6, opacity: 0.7 }}>
                    No receipts on {refPickDate}. Try “Whole month”.
                  </div>
                )}
            </div>
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
