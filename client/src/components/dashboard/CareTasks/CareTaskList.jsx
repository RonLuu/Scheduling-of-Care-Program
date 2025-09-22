import React from "react";
import FilePanel from "../Panels/FilePanel";
import CommentPanel from "../Panels/CommentPanel";
import { formatDate, formatTime } from "../utils/formatters";

function CareTaskList({
  tasks,
  toggleTaskComplete,
  displayUser,
  aud,
  costEditorHiddenByTask,
  setCostEditorHiddenByTask,
  costDraftByTask,
  setCostDraftByTask,
  saveTaskCost,
  toggleComments,
  toggleFiles,
  openCommentsFor,
  openFilesFor,
  commentsByTask,
  filesByTask,
  newCommentText,
  setNewCommentText,
  addComment,
  newFile,
  setNewFile,
  addFile,
  loadFiles,
}) {
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t._id}>
          <div>
            <div style={{ display: "inline", marginLeft: 8 }}>
              <strong>{t.title}</strong>
              {" · "}
              {formatDate(t.dueDate)}
              {t.scheduleType === "Timed" && t.startAt && t.endAt && (
                <React.Fragment>
                  {" · "}
                  {formatTime(t.startAt)}
                  {" – "}
                  {formatTime(t.endAt)}
                </React.Fragment>
              )}
              {" · "}
              <span className="badge">
                {t.scheduleType === "AllDay" ? "All-day" : "Timed"}
              </span>
              {" · "}
              <span className="badge">{t.status}</span>
              <input
                style={{
                  display: "inline",
                  width: "auto",
                  marginLeft: 16,
                }}
                type="checkbox"
                checked={t.status === "Completed"}
                onChange={(e) => toggleTaskComplete(t, e.target.checked)}
                title={
                  t.status === "Completed"
                    ? "Unmark as completed"
                    : "Mark as completed"
                }
              />
              {t.assignedToUserId ? (
                <span title="Assigned to">
                  {" · "}Assigned:{" "}
                  <strong>{displayUser(t.assignedToUserId)}</strong>
                </span>
              ) : (
                <React.Fragment>
                  {" · "}
                  <span className="badge" title="No assignee">
                    Unassigned
                  </span>
                </React.Fragment>
              )}
              {t.completedByUserId && (
                <React.Fragment>
                  {" · "}
                  <span title="Completed by">
                    Completed by:{" "}
                    <strong>{displayUser(t.completedByUserId)}</strong>
                  </span>
                </React.Fragment>
              )}
            </div>

            {/* Show spent amount (read-only) if present */}
            {t.status === "Completed" &&
              t.cost !== undefined &&
              t.cost !== null && (
                <React.Fragment>
                  {" · "}Spent: <strong>{aud.format(t.cost)}</strong>{" "}
                  <button
                    className="secondary"
                    style={{
                      marginTop: 8,
                      borderRadius: 8,
                      padding: 10,
                    }}
                    onClick={() => {
                      setCostEditorHiddenByTask((prev) => ({
                        ...prev,
                        [t._id]: false,
                      }));
                      setCostDraftByTask((prev) => ({
                        ...prev,
                        [t._id]: String(t.cost || 0),
                      }));
                    }}
                  >
                    Change cost
                  </button>
                </React.Fragment>
              )}
            {" · "}

            <button className="secondary" onClick={() => toggleComments(t._id)}>
              Comments
            </button>
            <button className="secondary" onClick={() => toggleFiles(t._id)}>
              Files
            </button>
          </div>

          {/* Cost Editor */}
          {t.status === "Completed" && !costEditorHiddenByTask[t._id] && (
            <TaskCostEditor
              taskId={t._id}
              currentCost={t.cost}
              draftValue={costDraftByTask[t._id]}
              onDraftChange={(value) =>
                setCostDraftByTask((prev) => ({
                  ...prev,
                  [t._id]: value,
                }))
              }
              onSave={() => saveTaskCost(t._id)}
            />
          )}

          {/* Comments Panel */}
          {openCommentsFor === t._id && (
            <CommentPanel
              taskId={t._id}
              comments={commentsByTask[t._id] || []}
              newCommentText={newCommentText}
              onCommentTextChange={setNewCommentText}
              onAddComment={() => addComment(t._id)}
            />
          )}

          {/* Files Panel */}
          {openFilesFor === t._id && (
            <FilePanel
              scope="CareTask"
              targetId={t._id}
              files={filesByTask[t._id] || []}
              newFile={newFile}
              onNewFileChange={setNewFile}
              onAddFile={() => addFile(t._id)} // your existing JSON add
              onLoadFiles={() => loadFiles(t._id)} // reload after upload
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default CareTaskList;
