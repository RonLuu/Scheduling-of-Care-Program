import React from "react";
import CareTaskList from "./CareTaskList";
import CareTaskCalendar from "./CareTaskCalendar";
import { useTasksData } from "../hooks/useTasksData";
import { aud, displayUser } from "../utils/formatters";

function CareTasks({ jwt, clients }) {
  const [viewMode, setViewMode] = React.useState("list");
  const {
    tasks,
    tasksLoading,
    tasksErr,
    tasksClientId,
    setTasksClientId,
    loadTasksFor,
    toggleTaskComplete,
    commentsByTask,
    filesByTask,
    openCommentsFor,
    openFilesFor,
    toggleComments,
    toggleFiles,
    addComment,
    addFile,
    loadFiles,
    newCommentText,
    setNewCommentText,
    newFile,
    setNewFile,
    costDraftByTask,
    setCostDraftByTask,
    costEditorHiddenByTask,
    setCostEditorHiddenByTask,
    saveTaskCost,
    assignableUsers,
    currentUserId,
  } = useTasksData(jwt, clients);

  const onChangeTasksClient = (e) => {
    const id = e.target.value;
    setTasksClientId(id);
    if (id) loadTasksFor(id);
  };

  // On dashboard load, mark past-due Scheduled tasks as Missed (server-side sweep)
  React.useEffect(() => {
    const jwtNow = localStorage.getItem("jwt");
    if (!jwtNow) return;
    fetch("/api/care-tasks/sweep-overdue", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwtNow },
    })
      .then(() => {
        // after sweep, refresh current client's tasks
        if (tasksClientId) loadTasksFor(tasksClientId);
      })
      .catch(() => {});
  }, [tasksClientId, loadTasksFor]); // re-run when switching client to keep list fresh

  // Ensure annual horizon up to Dec 31 of the current year (auto-renews each year)
  React.useEffect(() => {
    const jwtNow = localStorage.getItem("jwt");
    if (!jwtNow) return;
    fetch("/api/scheduling/ensure-annual", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwtNow },
    })
      .then(() => {
        if (tasksClientId) loadTasksFor(tasksClientId);
      })
      .catch(() => {});
  }, [tasksClientId, loadTasksFor]);

  return (
    <div className="card">
      <h3>My Tasks</h3>

      {clients.length > 1 && (
        <div>
          <label>Client</label>
          <select value={tasksClientId} onChange={onChangeTasksClient}>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {clients.length === 1 && (
        <p>
          Client: <strong>{clients[0].name}</strong>
        </p>
      )}

      <div style={{ margin: "8px 0" }}>
        <button
          className="secondary"
          onClick={() => tasksClientId && loadTasksFor(tasksClientId)}
          title="Reload tasks"
        >
          Refresh
        </button>

        <button
          className={viewMode === "list" ? "" : "secondary"}
          onClick={() => setViewMode("list")}
          style={{ marginRight: 8 }}
        >
          List
        </button>

        <button
          className={viewMode === "calendar" ? "" : "secondary"}
          onClick={() => setViewMode("calendar")}
        >
          Calendar
        </button>
      </div>

      {tasksLoading && <p>Loading…</p>}
      {tasksErr && <p style={{ color: "#b91c1c" }}>Error: {tasksErr}</p>}

      {!tasksLoading && !tasksErr && tasks.length === 0 && (
        <p>No tasks found for this client.</p>
      )}

      {!tasksLoading &&
        !tasksErr &&
        tasks.length > 0 &&
        (viewMode === "calendar" ? (
          <CareTaskCalendar tasks={tasks} />
        ) : (
          <CareTaskList
            tasks={tasks}
            toggleTaskComplete={toggleTaskComplete}
            displayUser={displayUser}
            aud={aud}
            costEditorHiddenByTask={costEditorHiddenByTask}
            setCostEditorHiddenByTask={setCostEditorHiddenByTask}
            costDraftByTask={costDraftByTask}
            setCostDraftByTask={setCostDraftByTask}
            saveTaskCost={saveTaskCost}
            toggleComments={toggleComments}
            toggleFiles={toggleFiles}
            openCommentsFor={openCommentsFor}
            openFilesFor={openFilesFor}
            commentsByTask={commentsByTask}
            filesByTask={filesByTask}
            newCommentText={newCommentText}
            setNewCommentText={setNewCommentText}
            addComment={addComment}
            newFile={newFile}
            setNewFile={setNewFile}
            addFile={addFile}
            loadFiles={loadFiles}
            assignableUsers={assignableUsers}
            reloadAfterEdit={() => tasksClientId && loadTasksFor(tasksClientId)}
            currentUserId={currentUserId}
          />
        ))}
    </div>
  );
}

export default CareTasks;
