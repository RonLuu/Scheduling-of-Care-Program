import React from "react";
import CareTaskCalendar from "./CareTaskCalendar";
import { useTasksData } from "../hooks/useTasksData";

function CareTasks({ jwt, clients }) {
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
      </div>

      {tasksLoading && <p>Loading…</p>}
      {tasksErr && <p style={{ color: "#b91c1c" }}>Error: {tasksErr}</p>}

      {!tasksLoading && !tasksErr && tasks.length === 0 && (
        <p>No tasks found for this client.</p>
      )}

      {!tasksLoading && !tasksErr && tasks.length > 0 && (
        <CareTaskCalendar tasks={tasks} />
      )}
    </div>
  );
}

export default CareTasks;
