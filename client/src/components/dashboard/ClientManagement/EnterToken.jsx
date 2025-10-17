import React from "react";

function EnterToken({ me, jwt, onSuccess }) {
  const [token, setToken] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setFeedback({ type: "error", text: "Please enter a token" });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          token: token.trim(),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit access request");
      }

      setFeedback({
        type: "success",
        text: "Access request submitted successfully!",
      });
      setToken("");
      setMessage("");

      // Wait a bit to show success message, then call onSuccess
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enter-token-container">
      <form onSubmit={handleSubmit} className="enter-token-form">
        <div className="form-group">
          <label htmlFor="token-input">Invite Token *</label>
          <input
            id="token-input"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your invite token here"
            className="token-input"
            required
          />
          <p className="help-text">
            Enter the invite token shared with you by a family member or power of attorney
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="message-input">Message</label>
          <textarea
            id="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message to your access request"
            rows="3"
            className="message-input"
          />
        </div>

        {feedback.text && (
          <div className={`feedback ${feedback.type}`}>{feedback.text}</div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || !token.trim()}
        >
          {isSubmitting ? "Requesting Access..." : "Request Access"}
        </button>
      </form>

      <style jsx>{`
        .enter-token-container {
          background: transparent;
          padding: 0;
          margin: 0;
        }

        .enter-token-form {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .token-input,
        .message-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .token-input:focus,
        .message-input:focus {
          outline: none;
          border-color: #8189d2;
          box-shadow: 0 0 0 3px rgba(129, 137, 210, 0.1);
        }

        .help-text {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .message-input {
          resize: vertical;
          min-height: 80px;
        }

        .feedback {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .feedback.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .feedback.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submit-btn {
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: #8189d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0;
          display: block;
        }

        .submit-btn:hover:not(:disabled) {
          background: #6d76c4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(129, 137, 210, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}

export default EnterToken;
