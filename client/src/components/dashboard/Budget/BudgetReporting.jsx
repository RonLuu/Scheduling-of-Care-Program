import React from "react";
import { aud } from "../utils/formatters";

function Badge({ level, children }) {
  const style = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
    marginLeft: 6,
    background:
      level === "serious"
        ? "#fee2e2"
        : level === "medium"
        ? "#fef3c7"
        : level === "light"
        ? "#fef3c7"
        : "#eee",
    color:
      level === "serious"
        ? "#991b1b"
        : level === "medium"
        ? "#92400e"
        : level === "light"
        ? "#92400e"
        : "#444",
  };
  return <span style={style}>{children}</span>;
}

function BudgetReporting({ jwt, clients }) {
  const [reportClientId, setReportClientId] = React.useState("");
  const [reportYear, setReportYear] = React.useState(new Date().getFullYear());
  const [report, setReport] = React.useState(null);
  const [reportErr, setReportErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Which categories are expanded
  const [openCats, setOpenCats] = React.useState({}); // { [category]: boolean }

  // Inline budget editor state: { [itemId]: { editing: boolean, draft: string, saving: boolean, err?: string } }
  const [editByItem, setEditByItem] = React.useState({});

  // NEW: predefined client budget inline editor
  const [editPredef, setEditPredef] = React.useState({
    editing: false,
    draft: "",
    saving: false,
    err: "",
  });

  const loadBudgetReport = async () => {
    try {
      setReportErr("");
      setReport(null);
      setLoading(true);
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!reportClientId) throw new Error("Please choose a client");

      const r = await fetch(
        `/api/reports/budget?personId=${encodeURIComponent(
          reportClientId
        )}&year=${encodeURIComponent(reportYear)}`,
        { headers: { Authorization: "Bearer " + jwt } }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load report");
      setReport(d);
    } catch (e) {
      setReportErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleCat = (cat) => setOpenCats((p) => ({ ...p, [cat]: !p[cat] }));

  const startEdit = (itemId, currentAmount) => {
    setEditByItem((p) => ({
      ...p,
      [itemId]: {
        editing: true,
        draft:
          currentAmount !== undefined && currentAmount !== null
            ? String(currentAmount)
            : "",
        saving: false,
        err: "",
      },
    }));
  };

  const cancelEdit = (itemId) => {
    setEditByItem((p) => ({
      ...p,
      [itemId]: { editing: false, draft: "", saving: false, err: "" },
    }));
  };

  const changeDraft = (itemId, value) => {
    setEditByItem((p) => ({
      ...p,
      [itemId]: { ...(p[itemId] || {}), draft: value },
    }));
  };

  const saveBudget = async (itemId) => {
    const row = editByItem[itemId];
    if (!row) return;
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      const amt = Number(row.draft);
      if (!Number.isFinite(amt) || amt < 0) {
        throw new Error("Please enter a non-negative number.");
      }

      setEditByItem((p) => ({
        ...p,
        [itemId]: { ...row, saving: true, err: "" },
      }));

      // PATCH per-year budget for this item
      const r = await fetch(
        `/api/care-need-items/${encodeURIComponent(
          itemId
        )}/budgets/${encodeURIComponent(reportYear)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({ amount: amt }),
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update budget");

      // After success, close editor and refresh report so rollups update
      setEditByItem((p) => ({
        ...p,
        [itemId]: { editing: false, draft: "", saving: false, err: "" },
      }));
      await loadBudgetReport();
    } catch (e) {
      setEditByItem((p) => ({
        ...p,
        [itemId]: {
          ...(p[itemId] || {}),
          saving: false,
          err: e.message || String(e),
        },
      }));
    }
  };
  const beginEditPredef = () => {
    setEditPredef({
      editing: true,
      draft:
        report && report.predefinedAnnualBudget != null
          ? String(report.predefinedAnnualBudget)
          : "",
      saving: false,
      err: "",
    });
  };
  const cancelEditPredef = () =>
    setEditPredef({ editing: false, draft: "", saving: false, err: "" });

  const savePredefBudget = async () => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!reportClientId) throw new Error("No client selected.");
      const amt = Number(editPredef.draft);
      if (!Number.isFinite(amt) || amt < 0)
        throw new Error("Please enter a non-negative number.");

      setEditPredef((p) => ({ ...p, saving: true, err: "" }));

      const r = await fetch(
        `/api/person-with-needs/${encodeURIComponent(reportClientId)}/budget`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({ amount: amt }),
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update client budget");

      // refresh the report so warnings/comparisons update
      await loadBudgetReport();
      setEditPredef({ editing: false, draft: "", saving: false, err: "" });
    } catch (e) {
      setEditPredef((p) => ({
        ...p,
        saving: false,
        err: e.message || String(e),
      }));
    }
  };

  return (
    <div className="card">
      <h3>Budget Reporting</h3>

      <div className="row">
        <div>
          <label>Client</label>
          <select
            value={reportClientId}
            onChange={(e) => setReportClientId(e.target.value)}
          >
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Year</label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
          />
        </div>
      </div>

      <button onClick={loadBudgetReport} disabled={loading}>
        {loading ? "Running…" : "Run report"}
      </button>
      {reportErr && <p style={{ color: "#b91c1c" }}>Error: {reportErr}</p>}

      {report && (
        <div style={{ marginTop: 12 }}>
          <p>
            {/* Predefined client budget with inline editor */}
            <strong>Client’s predefined annual budget:</strong>{" "}
            {!editPredef.editing ? (
              <>
                {aud.format(report.predefinedAnnualBudget || 0)}{" "}
                {report.warnings?.budgetVsPredefined && (
                  <Badge level={report.warnings.budgetVsPredefined.level}>
                    {report.warnings.budgetVsPredefined.message}
                  </Badge>
                )}
                <button
                  className="secondary"
                  style={{ marginLeft: 8 }}
                  onClick={beginEditPredef}
                >
                  Edit predefined annual budget
                </button>
              </>
            ) : (
              <span style={{ display: "inline-flex", gap: 6, marginLeft: 6 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPredef.draft}
                  onChange={(e) =>
                    setEditPredef((p) => ({ ...p, draft: e.target.value }))
                  }
                  style={{ width: 140 }}
                />
                <button onClick={savePredefBudget} disabled={editPredef.saving}>
                  {editPredef.saving ? "Saving…" : "Save"}
                </button>
                <button
                  className="secondary"
                  onClick={cancelEditPredef}
                  disabled={editPredef.saving}
                >
                  Cancel
                </button>
                {editPredef.err && (
                  <span style={{ color: "#b91c1c" }}>{editPredef.err}</span>
                )}
              </span>
            )}
            <br />
            <strong>Annual budget (sum of categories):</strong>{" "}
            {aud.format(report.annualBudget)}
            <br />
            <strong>Already spent:</strong> {aud.format(report.spent.total)}{" "}
            <span style={{ opacity: 0.7 }}>
              (purchase {aud.format(report.spent.purchase)} + completed tasks{" "}
              {aud.format(report.spent.completed)})
            </span>{" "}
            {report.warnings?.spentVsReportBudget && (
              <Badge level={report.warnings.spentVsReportBudget.level}>
                {report.warnings.spentVsReportBudget.message}
              </Badge>
            )}
            <br />
            <strong>Current balance:</strong>{" "}
            {aud.format(report.balance.current)}
            <br />
            <strong>Expected remaining (uncompleted tasks):</strong>{" "}
            {aud.format(report.expected.remaining)}{" "}
            {report.warnings?.projectedVsReportBudget && (
              <Badge level={report.warnings.projectedVsReportBudget.level}>
                {report.warnings.projectedVsReportBudget.message}
              </Badge>
            )}
            <br />
            <strong>Expected balance at year end:</strong>{" "}
            {aud.format(report.balance.expectedAtYearEnd)}
          </p>

          <h4>By category</h4>
          {report.categories.length === 0 ? (
            <p>No category data.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "left" }}>Annual Budget</th>
                  <th style={{ textAlign: "left" }}>Already Spent</th>
                  <th style={{ textAlign: "left" }}>Current Balance</th>
                  <th style={{ textAlign: "left" }}>
                    Expected to Spend (rest of year)
                  </th>
                  <th style={{ textAlign: "left" }}>
                    Expected Balance (year-end)
                  </th>
                  {/* <th style={{ textAlign: "left" }}>% Spent</th>
                  <th style={{ textAlign: "left" }}>% Expected</th> */}
                  <th style={{ textAlign: "left" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((c) => (
                  <React.Fragment key={c.category}>
                    <tr>
                      <td>{c.category}</td>
                      <td>{aud.format(c.annualBudget || 0)}</td>
                      <td>{aud.format(c.totalSpent || 0)}</td>
                      <td>{aud.format(c.currentBalance || 0)}</td>
                      <td>{aud.format(c.expected || 0)}</td>
                      <td>{aud.format(c.expectedBalanceAtYearEnd || 0)}</td>
                      {/* <td>{((c.spentPct || 0) * 100).toFixed(1)}%</td>
                      <td>{((c.expectedPct || 0) * 100).toFixed(1)}%</td> */}
                      <td>
                        <button
                          className="secondary"
                          onClick={() => toggleCat(c.category)}
                        >
                          {openCats[c.category] ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>

                    {openCats[c.category] && (
                      <tr>
                        <td
                          colSpan={9}
                          style={{ background: "#fafafa", padding: 8 }}
                        >
                          {!c.items || c.items.length === 0 ? (
                            <div style={{ opacity: 0.7 }}>
                              No items for this category in {report.year}.
                            </div>
                          ) : (
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left" }}>
                                    Care need item
                                  </th>
                                  <th style={{ textAlign: "left" }}>
                                    Annual Budget
                                  </th>
                                  <th style={{ textAlign: "left" }}>
                                    Already Spent
                                  </th>
                                  <th style={{ textAlign: "left" }}>
                                    Current Balance
                                  </th>
                                  <th style={{ textAlign: "left" }}>
                                    Expected to Spend (rest of year)
                                  </th>
                                  <th style={{ textAlign: "left" }}>
                                    Expected Balance (year-end)
                                  </th>
                                  <th style={{ textAlign: "left" }}>Warning</th>
                                  <th style={{ textAlign: "left" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.items.map((it) => {
                                  const ed = editByItem[it.itemId];
                                  const isEditing = !!ed?.editing;
                                  const saving = !!ed?.saving;
                                  return (
                                    <tr
                                      key={it.itemId}
                                      style={{ borderTop: "1px solid #eee" }}
                                    >
                                      <td>{it.name}</td>

                                      <td>
                                        {isEditing ? (
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: 6,
                                              alignItems: "center",
                                            }}
                                          >
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={ed.draft}
                                              onChange={(e) =>
                                                changeDraft(
                                                  it.itemId,
                                                  e.target.value
                                                )
                                              }
                                              style={{ width: 120 }}
                                            />
                                            <button
                                              onClick={() =>
                                                saveBudget(it.itemId)
                                              }
                                              disabled={saving}
                                            >
                                              {saving ? "Saving…" : "Save"}
                                            </button>
                                            <button
                                              className="secondary"
                                              onClick={() =>
                                                cancelEdit(it.itemId)
                                              }
                                              disabled={saving}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <strong>
                                            {aud.format(it.annualBudget || 0)}
                                          </strong>
                                        )}
                                        {ed?.err && (
                                          <div
                                            style={{
                                              color: "#b91c1c",
                                              marginTop: 4,
                                            }}
                                          >
                                            {ed.err}
                                          </div>
                                        )}
                                      </td>

                                      <td>
                                        {aud.format(it.alreadySpent || 0)}
                                      </td>
                                      <td>
                                        {aud.format(it.currentBalance || 0)}
                                      </td>
                                      <td>
                                        {aud.format(it.expectedRemaining || 0)}
                                      </td>
                                      <td>
                                        {aud.format(
                                          it.expectedBalanceAtYearEnd || 0
                                        )}
                                      </td>

                                      <td>
                                        {it.warning ? (
                                          <Badge level={it.warning.level}>
                                            {it.warning.message}
                                          </Badge>
                                        ) : (
                                          <span style={{ opacity: 0.6 }}>
                                            —
                                          </span>
                                        )}
                                      </td>

                                      <td>
                                        {!isEditing && (
                                          <button
                                            className="secondary"
                                            onClick={() =>
                                              startEdit(
                                                it.itemId,
                                                it.annualBudget || 0
                                              )
                                            }
                                          >
                                            Edit budget
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default BudgetReporting;
