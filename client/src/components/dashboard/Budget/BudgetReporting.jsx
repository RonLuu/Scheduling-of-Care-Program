import React from "react";
import { aud } from "../utils/formatters";

function BudgetReporting({ jwt, clients }) {
  const [reportClientId, setReportClientId] = React.useState("");
  const [reportYear, setReportYear] = React.useState(new Date().getFullYear());
  const [report, setReport] = React.useState(null);
  const [reportErr, setReportErr] = React.useState("");

  const loadBudgetReport = async () => {
    try {
      setReportErr("");
      setReport(null);
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!reportClientId) throw new Error("Please choose a client");

      const r = await fetch(
        `/api/reports/budget?personId=${encodeURIComponent(
          reportClientId
        )}&year=${encodeURIComponent(reportYear)}`,
        {
          headers: { Authorization: "Bearer " + jwt },
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load report");
      setReport(d);
    } catch (e) {
      setReportErr(e.message || String(e));
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
      <button onClick={loadBudgetReport}>Run report</button>
      {reportErr && <p style={{ color: "#b91c1c" }}>Error: {reportErr}</p>}

      {report && (
        <div style={{ marginTop: 12 }}>
          <p>
            <strong>Annual budget:</strong> {aud.format(report.annualBudget)}
            <br />
            <strong>Already spent:</strong> {aud.format(report.spent.total)}{" "}
            <span style={{ opacity: 0.7 }}>
              (purchase {aud.format(report.spent.purchase)} + completed tasks{" "}
              {aud.format(report.spent.completed)})
            </span>
            <br />
            <strong>Current balance:</strong>{" "}
            {aud.format(report.balance.current)}
            <br />
            <strong>Expected remaining (uncompleted tasks):</strong>{" "}
            {aud.format(report.expected.remaining)}
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
                  <th style={{ textAlign: "right" }}>Annual Budget</th>
                  <th style={{ textAlign: "right" }}>Already Spent</th>
                  <th style={{ textAlign: "right" }}>Current Balance</th>
                  <th style={{ textAlign: "right" }}>Expected Remaining</th>
                  <th style={{ textAlign: "right" }}>Expected Balance</th>
                  <th style={{ textAlign: "right" }}>% Spent</th>
                  <th style={{ textAlign: "right" }}>% Expected</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((c) => (
                  <tr key={c.category}>
                    <td>{c.category}</td>
                    <td style={{ textAlign: "right" }}>
                      {aud.format(c.annualBudget || 0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {aud.format(c.totalSpent || 0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {aud.format(c.currentBalance || 0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {aud.format(c.expected || 0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {aud.format(c.expectedBalanceAtYearEnd || 0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {((c.spentPct || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {((c.expectedPct || 0) * 100).toFixed(1)}%
                    </td>
                  </tr>
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
