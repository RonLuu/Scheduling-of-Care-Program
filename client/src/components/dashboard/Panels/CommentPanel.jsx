import React from "react";

function CommentPanel({
  comments,
  newCommentText,
  onCommentTextChange,
  onAddComment,
  // NEW:
  currentUserId,
  onReload, // callback to reload the comments list
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [busyId, setBusyId] = React.useState(null);

  const beginEdit = (c) => {
    setEditingId(c._id);
    setEditDraft(c.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (commentId) => {
    try {
      setBusyId(commentId);
      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");
      const r = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ text: editDraft }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      cancelEdit();
      await onReload?.();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      setBusyId(commentId);
      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");
      const r = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Delete failed");
      await onReload?.();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const isOwner = (c) =>
    currentUserId &&
    c?.author?.id &&
    String(c.author.id) === String(currentUserId);

  return (
    <div
      style={{
        marginTop: 8,
        background: "#fafafa",
        borderRadius: 8,
        padding: 8,
      }}
    >
      <h4 style={{ margin: "4px 0" }}>Comments</h4>

      <div>
        {comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul>
            {comments.map((c) => (
              <li key={c._id} style={{ marginBottom: 6 }}>
                <strong>
                  {(c.author && (c.author.name || c.author.email)) || "Unknown"}
                </strong>
                {" · "}
                {new Date(c.createdAt).toLocaleString()}
                {c.edited && (
                  <em style={{ marginLeft: 6, opacity: 0.6 }}>(edited)</em>
                )}

                {/* Text or editor */}
                {editingId === c._id ? (
                  <div style={{ marginTop: 4 }}>
                    <input
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      style={{ width: "100%" }}
                    />
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={cancelEdit}
                        disabled={busyId === c._id}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(c._id)}
                        disabled={busyId === c._id}
                      >
                        {busyId === c._id ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}>{c.text}</div>
                )}

                {/* Owner controls */}
                {isOwner(c) && editingId !== c._id && (
                  <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                    <button
                      className="secondary"
                      onClick={() => beginEdit(c)}
                      disabled={busyId === c._id}
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() => deleteComment(c._id)}
                      disabled={busyId === c._id}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <input
          placeholder="Write a comment…"
          value={newCommentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
        />
        <button onClick={onAddComment}>Add</button>
      </div>
    </div>
  );
}

export default CommentPanel;
