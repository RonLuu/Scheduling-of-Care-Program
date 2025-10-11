// TaskCompletionPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import NavigationTab from "../../NavigationTab";

function TaskCompletionPage() {
  const { taskId } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const [task, setTask] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [cost, setCost] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [receipts, setReceipts] = React.useState([]);
  const [otherFiles, setOtherFiles] = React.useState([]);

  // Receipt selection state
  const [receiptMode, setReceiptMode] = React.useState("upload"); // "upload" or "select"
  const [timeRange, setTimeRange] = React.useState("30"); // days
  const [existingReceipts, setExistingReceipts] = React.useState([]);
  const [selectedExistingReceipts, setSelectedExistingReceipts] =
    React.useState([]);
  const [loadingReceipts, setLoadingReceipts] = React.useState(false);

  // Load task details
  React.useEffect(() => {
    const loadTask = async () => {
      if (!jwt || !taskId) return;

      try {
        const response = await fetch(`/api/care-tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (!response.ok) {
          throw new Error("Failed to load task");
        }

        const data = await response.json();
        setTask(data);
      } catch (err) {
        setError(err.message || "Failed to load task");
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, jwt]);

  // Load existing receipts when user switches to "select" mode
  React.useEffect(() => {
    const loadExistingReceipts = async () => {
      if (receiptMode !== "select" || !task || !jwt) return;

      setLoadingReceipts(true);
      try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));

        // Fetch receipts from ReceiptBuckets
        const url = `/api/file-upload/shared?personId=${
          task.personId
        }&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (response.ok) {
          const data = await response.json();
          setExistingReceipts(data);
        } else {
          setExistingReceipts([]);
        }
      } catch (err) {
        console.error("Error loading receipts:", err);
        setExistingReceipts([]);
      } finally {
        setLoadingReceipts(false);
      }
    };

    loadExistingReceipts();
  }, [receiptMode, timeRange, task, jwt]);

  const handleReceiptChange = (e) => {
    const files = Array.from(e.target.files);
    setReceipts((prev) => [...prev, ...files]);
  };

  const handleOtherFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setOtherFiles((prev) => [...prev, ...files]);
  };

  const removeReceipt = (index) => {
    setReceipts((prev) => prev.filter((_, i) => i !== index));
  };

  const removeOtherFile = (index) => {
    setOtherFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleExistingReceipt = (receiptId) => {
    setSelectedExistingReceipts((prev) => {
      if (prev.includes(receiptId)) {
        return prev.filter((id) => id !== receiptId);
      } else {
        return [...prev, receiptId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const costValue = parseFloat(cost);
    if (cost && (isNaN(costValue) || costValue < 0)) {
      alert("Please enter a valid cost amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Mark task as complete
      const completeResponse = await fetch(`/api/care-tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          status: "Completed",
          cost: cost ? costValue : undefined,
        }),
      });

      if (!completeResponse.ok) {
        throw new Error("Failed to complete task");
      }

      // 2. Add comment if provided
      if (comments.trim()) {
        await fetch(`/api/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            careTaskId: taskId,
            text: comments.trim(),
          }),
        });
      }

      // 3. Upload new receipts to Shared bucket and reference them
      for (const file of receipts) {
        // Upload to Shared bucket
        const formData = new FormData();
        formData.append("file", file);

        // Use task's due date to determine bucket
        const dueDate = new Date(task.dueDate);
        const effectiveDateStr = dueDate.toISOString().split("T")[0];

        formData.append("scope", "Shared");
        formData.append("personId", task.personId);
        formData.append("year", dueDate.getFullYear().toString());
        formData.append("month", (dueDate.getMonth() + 1).toString());
        formData.append("effectiveDate", effectiveDateStr);
        formData.append("description", "Receipt");

        const uploadResponse = await fetch("/api/file-upload/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadedFile = await uploadResponse.json();

          // Reference the uploaded file to this task
          await fetch("/api/file-upload/shared/reference-to-task", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
              careTaskId: taskId,
              fileId: uploadedFile._id,
            }),
          });
        }
      }

      // 3b. Reference selected existing receipts
      for (const fileId of selectedExistingReceipts) {
        await fetch("/api/file-upload/shared/reference-to-task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            careTaskId: taskId,
            fileId: fileId,
          }),
        });
      }

      // 4. Upload other files
      for (const file of otherFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("scope", "CareTask");
        formData.append("targetId", taskId);
        formData.append("description", "Document");

        await fetch("/api/file-upload/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        });
      }

      // Success - navigate back to tasks page
      navigate("/tasks-new");
    } catch (err) {
      alert("Error completing task: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="loading-state">Loading task...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="page">
        <NavigationTab />
        <div className="error-state">{error || "Task not found"}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <div className="completion-container">
          {/* Page Header */}
          <div className="page-header">
            <h1>Complete Task</h1>
            <p className="page-description">
              Mark this task as complete and add any associated costs, receipts,
              or notes.
            </p>
          </div>

          <div className="page-content">
            {/* Task Details Section */}
            <div className="task-details-section">
              <h2>Task Details</h2>
              <div className="detail-row">
                <span className="label">Task:</span>
                <span className="value">{task.title}</span>
              </div>
              <div className="detail-row">
                <span className="label">Due Date:</span>
                <span className="value">{formatDate(task.dueDate)}</span>
              </div>
            </div>

            {/* Completion Form */}
            <form onSubmit={handleSubmit} className="completion-form">
              {/* Cost Section */}
              <div className="form-section">
                <h3>Cost (Optional)</h3>
                <p className="section-description">
                  Enter the total cost for this task if applicable.
                </p>
                <div className="input-group">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="cost-input"
                  />
                </div>
              </div>

              {/* Receipts Section */}
              <div className="form-section">
                <h3>Receipts (Optional)</h3>
                <p className="section-description">
                  Upload new receipts or select from previously uploaded
                  receipts.
                </p>

                {/* Receipt Mode Selector */}
                <div className="receipt-mode-selector">
                  <button
                    type="button"
                    className={`mode-btn ${
                      receiptMode === "upload" ? "active" : ""
                    }`}
                    onClick={() => setReceiptMode("upload")}
                  >
                    Upload New
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${
                      receiptMode === "select" ? "active" : ""
                    }`}
                    onClick={() => setReceiptMode("select")}
                  >
                    Select Existing
                  </button>
                </div>

                {/* Upload Mode */}
                {receiptMode === "upload" && (
                  <>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleReceiptChange}
                      className="file-input"
                      id="receipts-input"
                    />
                    <label
                      htmlFor="receipts-input"
                      className="file-input-label"
                    >
                      Choose Files
                    </label>
                    {receipts.length > 0 && (
                      <div className="file-list">
                        {receipts.map((file, index) => (
                          <div key={index} className="file-item">
                            <span className="file-name">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeReceipt(index)}
                              className="remove-file-btn"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Select Mode */}
                {receiptMode === "select" && (
                  <>
                    {/* Time Range Selector */}
                    <div className="time-range-selector">
                      <label htmlFor="time-range">Show receipts from:</label>
                      <select
                        id="time-range"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="time-range-select"
                      >
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 3 months</option>
                        <option value="180">Last 6 months</option>
                        <option value="365">Last year</option>
                        <option value="3650">All time</option>
                      </select>
                    </div>

                    {/* Existing Receipts List */}
                    {loadingReceipts ? (
                      <div className="loading-receipts">
                        Loading receipts...
                      </div>
                    ) : existingReceipts.length === 0 ? (
                      <div className="no-receipts">
                        No receipts found in this time range.
                      </div>
                    ) : (
                      <div className="existing-receipts-grid">
                        {existingReceipts.map((receipt) => (
                          <div
                            key={receipt._id}
                            className={`receipt-card ${
                              selectedExistingReceipts.includes(receipt._id)
                                ? "selected"
                                : ""
                            }`}
                          >
                            <div
                              className="receipt-card-main"
                              onClick={() => toggleExistingReceipt(receipt._id)}
                            >
                              <div className="receipt-checkbox">
                                {selectedExistingReceipts.includes(
                                  receipt._id
                                ) && "✓"}
                              </div>
                              <div className="receipt-info">
                                <div className="receipt-filename">
                                  {receipt.filename}
                                </div>
                                <div className="receipt-date">
                                  Uploaded:{" "}
                                  {new Date(
                                    receipt.createdAt || receipt.uploadedAt
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <a
                              href={receipt.urlOrPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="receipt-view-btn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedExistingReceipts.length > 0 && (
                      <div className="selected-count">
                        {selectedExistingReceipts.length} receipt(s) selected
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Comments Section */}
              <div className="form-section">
                <h3>Comments (Optional)</h3>
                <p className="section-description">
                  Add any notes or comments about this task.
                </p>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter your comments here..."
                  rows="4"
                  className="comments-textarea"
                />
              </div>

              {/* Other Files Section */}
              <div className="form-section">
                <h3>Other Documents (Optional)</h3>
                <p className="section-description">
                  Upload any other relevant documents (e.g., medical
                  certificates, forms).
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleOtherFilesChange}
                  className="file-input"
                  id="other-files-input"
                />
                <label htmlFor="other-files-input" className="file-input-label">
                  Choose Files
                </label>
                {otherFiles.length > 0 && (
                  <div className="file-list">
                    {otherFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeOtherFile(index)}
                          className="remove-file-btn"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-complete"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Completing..." : "Mark as Complete"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate("/tasks-new")}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .page-main {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .completion-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .page-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2.5rem 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 600;
        }

        .page-description {
          margin: 0;
          opacity: 0.95;
          font-size: 1rem;
          line-height: 1.6;
        }

        .loading-state,
        .error-state {
          padding: 3rem;
          text-align: center;
          color: #6b7280;
        }

        .error-state {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          margin: 1rem;
          border-radius: 8px;
        }

        .page-content {
          padding: 2rem;
        }

        .task-details-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .task-details-section h2 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          font-weight: 600;
          color: #6b7280;
        }

        .detail-row .value {
          color: #1f2937;
        }

        .completion-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-section h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .section-description {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .currency-symbol {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
        }

        .cost-input {
          flex: 1;
          max-width: 200px;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .cost-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .file-input {
          display: none;
        }

        .file-input-label {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .file-input-label:hover {
          border-color: #667eea;
          background: #f9fafb;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .file-name {
          color: #1f2937;
          font-size: 0.875rem;
        }

        .remove-file-btn {
          padding: 0.25rem 0.75rem;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .remove-file-btn:hover {
          background: #fecaca;
        }

        .comments-textarea {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .comments-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .btn-complete {
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-complete:hover:not(:disabled) {
          background: #059669;
        }

        .btn-complete:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-cancel {
          padding: 0.75rem 1.5rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #4b5563;
        }

        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .receipt-mode-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .mode-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #e5e7eb;
          border: 2px solid #9ca3af;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #000000 !important;
        }

        .mode-btn:hover {
          border-color: #667eea;
          background: #d1d5db;
          color: black;
        }

        .mode-btn.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .time-range-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .time-range-selector label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .time-range-select {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .time-range-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .loading-receipts,
        .no-receipts {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .existing-receipts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .receipt-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .receipt-card:hover {
          border-color: #667eea;
          background: white;
        }

        .receipt-card.selected {
          background: #eef2ff;
          border-color: #667eea;
        }

        .receipt-card-main {
          display: flex;
          gap: 0.75rem;
          cursor: pointer;
          flex: 1;
        }

        .receipt-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: white;
          color: #667eea;
          font-weight: bold;
          font-size: 1rem;
        }

        .receipt-card.selected .receipt-checkbox {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .receipt-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
          min-width: 0;
        }

        .receipt-filename {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .receipt-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .selected-count {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 6px;
          color: #4338ca;
          font-weight: 500;
          text-align: center;
        }

        .receipt-view-btn {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          text-align: center;
          transition: background-color 0.2s;
          display: block;
        }

        .receipt-view-btn:hover {
          background: #5a67d8;
        }

        @media (max-width: 768px) {
          .page-main {
            padding: 1rem 0.5rem;
          }

          .page-header {
            padding: 1.5rem;
          }

          .page-header h1 {
            font-size: 1.5rem;
          }

          .page-content {
            padding: 1rem;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
          }

          .existing-receipts-grid {
            grid-template-columns: 1fr;
          }

          .receipt-mode-selector {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default TaskCompletionPage;
