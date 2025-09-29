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

  // Inline budget editor state for items
  const [editByItem, setEditByItem] = React.useState({});

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

      // After success, close editor and refresh report
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

  return (
    <div className="budget-report-card">
      <h3>Budget Reporting</h3>

      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
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
          <div className="filter-group">
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
        <button
          className="run-report-btn"
          onClick={loadBudgetReport}
          disabled={loading}
        >
          {loading ? "Running…" : "Run Report"}
        </button>
      </div>

      {reportErr && <p className="error-message">Error: {reportErr}</p>}

      {report && (
        <div className="report-content">
          <div className="summary-section">
            <h4>Summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Annual Budget:</span>
                <span className="summary-value">
                  {aud.format(report.annualBudget)}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Already Spent:</span>
                <span className="summary-value">
                  {aud.format(report.spent.total)}
                  <span className="summary-detail">
                    (Purchases: {aud.format(report.spent.purchase)}, Tasks:{" "}
                    {aud.format(report.spent.completed)})
                  </span>
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Current Balance:</span>
                <span className="summary-value">
                  {aud.format(report.balance.current)}
                </span>
              </div>
              {report.warnings?.summary && (
                <div className="summary-item">
                  <Badge level={report.warnings.summary.level}>
                    {report.warnings.summary.message}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="monthly-section">
            <h4>Monthly Breakdown</h4>
            <table className="monthly-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Spent</th>
                  <th>Purchases</th>
                  <th>Completed Tasks</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyBreakdown &&
                  report.monthlyBreakdown.map((month) => (
                    <tr key={month.month}>
                      <td className="month-name">
                        {month.monthName} {month.year}
                      </td>
                      <td>{aud.format(month.total)}</td>
                      <td>{aud.format(month.purchase)}</td>
                      <td>{aud.format(month.completed)}</td>
                    </tr>
                  ))}
                {(!report.monthlyBreakdown ||
                  report.monthlyBreakdown.length === 0) && (
                  <tr>
                    <td colSpan={4} className="no-data">
                      No spending data for this year
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="categories-section">
            <h4>Budget by Category</h4>
            {report.categories.length === 0 ? (
              <p className="no-data">No category data available.</p>
            ) : (
              <table className="budget-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Annual Budget</th>
                    <th>Already Spent</th>
                    <th>Current Balance</th>
                    <th>Warning</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((c) => (
                    <React.Fragment key={c.category}>
                      <tr className="category-row">
                        <td className="category-name">{c.category}</td>
                        <td>{aud.format(c.annualBudget || 0)}</td>
                        <td>{aud.format(c.totalSpent || 0)}</td>
                        <td>{aud.format(c.currentBalance || 0)}</td>
                        <td>
                          {c.warning ? (
                            <Badge level={c.warning.level}>
                              {c.warning.message}
                            </Badge>
                          ) : (
                            <span className="no-warning">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="toggle-btn"
                            onClick={() => toggleCat(c.category)}
                          >
                            {openCats[c.category] ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>

                      {openCats[c.category] && (
                        <tr>
                          <td colSpan={6} className="items-container">
                            {!c.items || c.items.length === 0 ? (
                              <div className="no-items">
                                No items for this category in {report.year}.
                              </div>
                            ) : (
                              <>
                                <table className="items-table">
                                  <thead>
                                    <tr>
                                      <th>Care Need Item</th>
                                      <th>Annual Budget</th>
                                      <th>Already Spent</th>
                                      <th>Current Balance</th>
                                      <th>Warning</th>
                                      <th>Actions</th>
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
                                          className="item-row"
                                        >
                                          <td>{it.name}</td>
                                          <td>
                                            {isEditing ? (
                                              <div className="edit-controls">
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
                                                  className="budget-input"
                                                />
                                                <button
                                                  className="save-btn"
                                                  onClick={() =>
                                                    saveBudget(it.itemId)
                                                  }
                                                  disabled={saving}
                                                >
                                                  {saving ? "Saving…" : "Save"}
                                                </button>
                                                <button
                                                  className="cancel-btn"
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
                                                {aud.format(
                                                  it.annualBudget || 0
                                                )}
                                              </strong>
                                            )}
                                            {ed?.err && (
                                              <div className="edit-error">
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
                                            {it.warning ? (
                                              <Badge level={it.warning.level}>
                                                {it.warning.message}
                                              </Badge>
                                            ) : (
                                              <span className="no-warning">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            {!isEditing && (
                                              <button
                                                className="edit-btn"
                                                onClick={() =>
                                                  startEdit(
                                                    it.itemId,
                                                    it.annualBudget || 0
                                                  )
                                                }
                                              >
                                                Edit Budget
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>

                                {c.monthlyBreakdown &&
                                  c.monthlyBreakdown.length > 0 && (
                                    <div className="category-monthly">
                                      <h5>Monthly Spending - {c.category}</h5>
                                      <table className="monthly-detail-table">
                                        <thead>
                                          <tr>
                                            <th>Month</th>
                                            <th>Total</th>
                                            <th>Purchases</th>
                                            <th>Tasks</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {c.monthlyBreakdown.map((m) => (
                                            <tr
                                              key={`${c.category}-${m.month}`}
                                            >
                                              <td>{m.monthName}</td>
                                              <td>{aud.format(m.total)}</td>
                                              <td>{aud.format(m.purchase)}</td>
                                              <td>{aud.format(m.completed)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                              </>
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
        </div>
      )}

      <style jsx>{`
        .budget-report-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          width: 1000px;
          max-width: 1000px;
        }

        .budget-report-card h3 {
          margin: 0 0 1.5rem 0;
          color: #111827;
          font-size: 1.5rem;
        }

        .filter-section {
          margin-bottom: 1.5rem;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-group select,
        .filter-group input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .run-report-btn {
          padding: 0.625rem 1.25rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
        }

        .run-report-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .run-report-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }

        .report-content {
          margin-top: 2rem;
        }

        .summary-section {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }

        .summary-section h4 {
          margin: 0 0 1rem 0;
          color: #111827;
        }

        .summary-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .summary-item {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .summary-label {
          font-weight: 600;
          color: #4b5563;
        }

        .summary-value {
          color: #111827;
          font-weight: 500;
        }

        .summary-detail {
          color: #6b7280;
          font-size: 0.875rem;
          margin-left: 0.5rem;
        }

        .categories-section h4 {
          margin: 0 0 1rem 0;
          color: #111827;
        }

        .budget-table {
          width: 100%;
          border-collapse: collapse;
        }

        .budget-table th {
          padding: 0.75rem;
          background: #f3f4f6;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          text-align: left;
        }

        .budget-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }

        .category-row {
          background: white;
        }

        .category-row:hover {
          background: #f9fafb;
        }

        .category-name {
          font-weight: 600;
          color: #111827;
        }

        .no-warning {
          color: #9ca3af;
          font-style: italic;
        }

        .toggle-btn {
          padding: 0.375rem 0.75rem;
          background: #f3f4f6;
          color: #374151 !important;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .toggle-btn:hover {
          background: #e5e7eb;
        }

        .items-container {
          background: #fafafa;
          padding: 1rem;
        }

        .no-items {
          color: #6b7280;
          font-style: italic;
          padding: 1rem;
          text-align: center;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 0.375rem;
          overflow: hidden;
        }

        .items-table th {
          padding: 0.625rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 500;
          font-size: 0.813rem;
          color: #4b5563;
          text-align: left;
        }

        .item-row td {
          padding: 0.625rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.813rem;
        }

        .edit-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .budget-input {
          width: 120px;
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          font-size: 0.813rem;
        }

        .save-btn,
        .cancel-btn,
        .edit-btn {
          padding: 0.25rem 0.625rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
          border: none;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #059669;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151 !important;
          border: 1px solid #d1d5db;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .edit-btn {
          background: #3b82f6;
          color: white;
        }

        .edit-btn:hover {
          background: #2563eb;
        }

        .edit-error {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .monthly-section {
          margin-top: 2rem;
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }

        .monthly-section h4 {
          margin: 0 0 1rem 0;
          color: #111827;
        }

        .monthly-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 0.375rem;
        }

        .monthly-table th {
          padding: 0.625rem;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          text-align: left;
        }

        .monthly-table td {
          padding: 0.625rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
        }

        .month-name {
          font-weight: 500;
          color: #111827;
        }

        .category-monthly {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .category-monthly h5 {
          margin: 0 0 0.75rem 0;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .monthly-detail-table {
          width: 100%;
          border-collapse: collapse;
          background: #fafafa;
          border-radius: 0.25rem;
          font-size: 0.813rem;
        }

        .monthly-detail-table th {
          padding: 0.5rem;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 500;
          color: #6b7280;
          text-align: left;
        }

        .monthly-detail-table td {
          padding: 0.5rem;
          border-bottom: 1px solid #fff;
          color: #374151;
        }

        @media (max-width: 768px) {
          .filter-row {
            grid-template-columns: 1fr;
          }

          .budget-table {
            font-size: 0.75rem;
          }

          .budget-table th,
          .budget-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default BudgetReporting;
