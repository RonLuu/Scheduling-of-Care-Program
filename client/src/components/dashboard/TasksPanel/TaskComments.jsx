import React from "react";

function TaskComments({
  comments,
  newCommentText,
  onCommentTextChange,
  onAddComment,
}) {
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
              <li key={c._id}>
                <strong>
                  {(c.author && (c.author.name || c.author.email)) || "Unknown"}
                </strong>
                {" · "}
                {new Date(c.createdAt).toLocaleString()}
                <div>{c.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="row">
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

export default TaskComments;
