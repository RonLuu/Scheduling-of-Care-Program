import React from "react";

function decodeUserIdFromJwt(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1] || ""));
    return (
      payload?.id || payload?._id || payload?.userId || payload?.sub || null
    );
  } catch {
    return null;
  }
}

export function useTasksData(jwt, clients) {
  const [currentUserId] = React.useState(() =>
    jwt ? String(decodeUserIdFromJwt(jwt) || "") : ""
  );
  const [tasksClientId, setTasksClientId] = React.useState("");
  const [tasks, setTasks] = React.useState([]);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [tasksErr, setTasksErr] = React.useState("");

  // NEW: assignable users (by current client/person)
  const [assignableUsers, setAssignableUsers] = React.useState([]);

  // Comments / Files state
  const [openCommentsFor, setOpenCommentsFor] = React.useState(null);
  const [openFilesFor, setOpenFilesFor] = React.useState(null);
  const [commentsByTask, setCommentsByTask] = React.useState({});
  const [filesByTask, setFilesByTask] = React.useState({});
  const [newCommentText, setNewCommentText] = React.useState("");
  const [newFile, setNewFile] = React.useState({
    filename: "",
    urlOrPath: "",
    fileType: "",
    size: "",
    description: "",
  });

  // Cost management
  const [costDraftByTask, setCostDraftByTask] = React.useState({});
  const [costEditorHiddenByTask, setCostEditorHiddenByTask] = React.useState(
    {}
  );

  // ---- helpers ----
  const reload = React.useCallback(async () => {
    if (tasksClientId) await loadTasksFor(tasksClientId);
  }, [tasksClientId]);

  const loadAssignable = React.useCallback(
    async (personId) => {
      try {
        if (!jwt || !personId) {
          setAssignableUsers([]);
          return;
        }
        const r = await fetch(
          `/api/person-user-links/assignable-users?personId=${encodeURIComponent(
            personId
          )}`,
          { headers: { Authorization: "Bearer " + jwt } }
        );
        const d = await r.json();
        setAssignableUsers(Array.isArray(d) ? d : []);
      } catch {
        setAssignableUsers([]);
      }
    },
    [jwt]
  );

  const loadTasksFor = React.useCallback(
    async (personId) => {
      try {
        setTasksLoading(true);
        setTasksErr("");
        if (!jwt) throw new Error("UNAUTHENTICATED");

        const r = await fetch(
          `/api/care-tasks?personId=${encodeURIComponent(
            personId
          )}&sort=dueDate`,
          { headers: { Authorization: "Bearer " + jwt } }
        );
        let data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load tasks");

        data = data.filter((t) => t.status !== "Cancelled");
        data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        setTasks(data);

        // cost editor visibility
        const hidden = {};
        const drafts = {};
        for (const t of data) {
          hidden[t._id] =
            t.status === "Completed"
              ? t.cost !== undefined && t.cost !== null
              : true;
          drafts[t._id] = "";
        }
        setCostEditorHiddenByTask(hidden);
        setCostDraftByTask(drafts);

        // also refresh assignable users for this person
        await loadAssignable(personId);
      } catch (e) {
        setTasksErr(e.message || String(e));
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    },
    [jwt, loadAssignable]
  );

  // === BUGFIX: when unchecking a completed task that is past-due, return to Missed (not Scheduled) ===
  const toggleTaskComplete = async (task, checked) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");

      let newStatus;
      if (checked) {
        newStatus = "Completed";
      } else {
        const now = new Date();
        const due = new Date(task.dueDate);
        newStatus = due < now ? "Missed" : "Scheduled";
      }

      const r = await fetch(`/api/care-tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");

      if (checked) {
        setCostEditorHiddenByTask((prev) => ({ ...prev, [task._id]: false }));
        setCostDraftByTask((prev) => ({ ...prev, [task._id]: "" }));
      } else {
        setCostEditorHiddenByTask((prev) => ({ ...prev, [task._id]: false }));
      }

      if (tasksClientId) loadTasksFor(tasksClientId);
    } catch (e) {
      alert("Failed to update task: " + (e.message || e));
    }
  };

  const loadComments = async (taskId) => {
    if (!jwt) return;
    const r = await fetch(
      `/api/comments?careTaskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: "Bearer " + jwt } }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to load comments");
    setCommentsByTask((prev) => ({
      ...prev,
      [taskId]: data.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  };

  const addComment = async (taskId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!newCommentText.trim()) return;

      const r = await fetch(`/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          careTaskId: taskId,
          text: newCommentText.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to add comment");

      setNewCommentText("");
      await loadComments(taskId);
    } catch (e) {
      alert("Failed to add comment: " + (e.message || e));
    }
  };

  const loadFiles = async (taskId) => {
    if (!jwt) return;
    const r = await fetch(
      `/api/file-upload?scope=CareTask&targetId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: "Bearer " + jwt } }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to load files");
    setFilesByTask((prev) => ({
      ...prev,
      [taskId]: data.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  };

  const addFile = async (taskId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!newFile.filename || !newFile.urlOrPath) {
        alert("Please provide filename and URL/path.");
        return;
      }

      const payload = {
        scope: "CareTask",
        targetId: taskId,
        filename: newFile.filename,
        urlOrPath: newFile.urlOrPath,
        fileType: newFile.fileType || undefined,
        size: newFile.size ? Number(newFile.size) : undefined,
        description: newFile.description || undefined,
      };
      const r = await fetch(`/api/file-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to add file");

      setNewFile({
        filename: "",
        urlOrPath: "",
        fileType: "",
        size: "",
        description: "",
      });
      await loadFiles(taskId);
    } catch (e) {
      alert("Failed to add file: " + (e.message || e));
    }
  };

  const toggleComments = (taskId) => {
    if (openCommentsFor === taskId) {
      setOpenCommentsFor(null);
    } else {
      setOpenCommentsFor(taskId);
      loadComments(taskId);
    }
  };

  const toggleFiles = (taskId) => {
    if (openFilesFor === taskId) {
      setOpenFilesFor(null);
    } else {
      setOpenFilesFor(taskId);
      loadFiles(taskId);
    }
  };

  const saveTaskCost = async (taskId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      const raw = costDraftByTask[taskId];
      const num =
        raw === "" || raw === undefined || raw === null ? 0 : Number(raw);
      if (Number.isNaN(num) || num < 0) {
        alert("Please enter a valid non-negative amount.");
        return;
      }

      const r = await fetch(`/api/care-tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({ status: "Completed", cost: num }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");

      setCostEditorHiddenByTask((prev) => ({ ...prev, [taskId]: true }));
      setCostDraftByTask((prev) => ({ ...prev, [taskId]: "" }));

      if (tasksClientId) await loadTasksFor(tasksClientId);
    } catch (e) {
      alert("Failed to save cost: " + (e.message || String(e)));
    }
  };

  // Initialize tasks when clients change
  React.useEffect(() => {
    if (clients && clients.length > 0) {
      const firstId = clients[0]._id;
      setTasksClientId(firstId);
      loadTasksFor(firstId);
    } else {
      setTasksClientId("");
      setTasks([]);
      setAssignableUsers([]);
    }
  }, [clients, loadTasksFor]);

  // Sweep overdue tasks on mount
  React.useEffect(() => {
    if (!jwt) return;
    fetch("/api/care-tasks/sweep-overdue", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwt },
    })
      .then(() => {
        if (tasksClientId) loadTasksFor(tasksClientId);
      })
      .catch(() => {});
  }, [jwt, tasksClientId, loadTasksFor]);

  // Ensure rolling horizon
  React.useEffect(() => {
    if (!jwt) return;
    fetch("/api/scheduling/ensure-horizon?horizonDays=730", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwt },
    })
      .then(() => {
        if (tasksClientId) loadTasksFor(tasksClientId);
      })
      .catch(() => {});
  }, [jwt, tasksClientId, loadTasksFor]);

  return {
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

    // NEW:
    assignableUsers,
    reloadAfterEdit: reload,
    currentUserId,
  };
}
