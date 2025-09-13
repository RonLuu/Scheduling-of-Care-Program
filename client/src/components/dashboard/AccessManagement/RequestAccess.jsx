import React from "react";

function RequestAccess({ jwt }) {
  const [token, setToken] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token.trim()) {
      setFeedback("Please enter a token.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      // Optional: Verify token first to give immediate feedback
      const verifyRes = await fetch("/api/tokens/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ token }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid token");
      }

      // Submit the access request
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          token: token.trim(),
          message: message.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      // Success - clear form and show success message
      setFeedback("Request submitted successfully. Please wait for approval.");
      setToken("");
      setMessage("");
    } catch (error) {
      // Error handling
      setFeedback(`Error: ${error.message || "Failed to submit request"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTokenChange = (e) => {
    setToken(e.target.value);
    // Clear error message when user starts typing
    if (feedback.startsWith("Error:") || feedback.startsWith("Please")) {
      setFeedback("");
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  return (
    <div className="card">
      <h3>Request access with a token</h3>
      <p>
        Paste the invite token you received, add an optional message, and
        request access. The issuer will review and approve your request.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="access-token">Invite Token *</label>
          <input
            id="access-token"
            type="text"
            placeholder="Enter your invite token"
            value={token}
            onChange={handleTokenChange}
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="access-message">Message (optional)</label>
          <input
            id="access-message"
            type="text"
            placeholder="Add a message for the approver"
            value={message}
            onChange={handleMessageChange}
            disabled={isSubmitting}
          />
          <small style={{ opacity: 0.7 }}>
            Let the approver know who you are or why you need access
          </small>
        </div>

        <button type="submit" disabled={isSubmitting || !token.trim()}>
          {isSubmitting ? "Submitting..." : "Request access"}
        </button>
      </form>

      {feedback && (
        <p
          style={{
            color:
              feedback.startsWith("Error:") || feedback.startsWith("Please")
                ? "#b91c1c"
                : "#065f46",
            marginTop: 12,
          }}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}

export default RequestAccess;
