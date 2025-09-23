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

export function useCareNeedItemsData(jwt, clients) {
  const [currentUserId] = React.useState(() =>
    jwt ? String(decodeUserIdFromJwt(jwt) || "") : ""
  );
  const [cniClientId, setCniClientId] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [filesByItem, setFilesByItem] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [categoryOrder, setCategoryOrder] = React.useState([]);

  // Return-panel state (comments & files)
  const [openCommentsForItem, setOpenCommentsForItem] = React.useState(null);
  const [openFilesForItem, setOpenFilesForItem] = React.useState(null);
  const [commentsByItem, setCommentsByItem] = React.useState({});
  const [panelFilesByItem, setPanelFilesByItem] = React.useState({});
  const [newCommentTextItem, setNewCommentTextItem] = React.useState("");
  const [newFileItem, setNewFileItem] = React.useState({
    filename: "",
    urlOrPath: "",
    fileType: "",
    size: "",
    description: "",
  });

  const loadCategoryOrder = async (personId) => {
    if (!jwt || !personId) return;
    try {
      const r = await fetch(
        `/api/person-with-needs/${encodeURIComponent(personId)}/categories`,
        { headers: { Authorization: "Bearer " + jwt } }
      );
      const d = await r.json();
      if (r.ok && Array.isArray(d.categories)) {
        setCategoryOrder(d.categories);
      } else {
        setCategoryOrder([]);
      }
    } catch {
      setCategoryOrder([]);
    }
  };

  const loadFilesThumbsFor = async (itemId) => {
    // for row attachments (direct + shared references)
    try {
      const r = await fetch(`/api/file-upload/by-care-need-item/${itemId}`, {
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load files");
      setFilesByItem((prev) => ({ ...prev, [itemId]: d }));
    } catch {
      setFilesByItem((prev) => ({ ...prev, [itemId]: [] }));
    }
  };

  const loadItemsFor = React.useCallback(
    async (personId) => {
      try {
        setLoading(true);
        setErr("");
        setItems([]);
        setFilesByItem({});
        if (!jwt) throw new Error("UNAUTHENTICATED");
        if (!personId) return;

        await loadCategoryOrder(personId);

        const r = await fetch(
          `/api/care-need-items?personId=${encodeURIComponent(personId)}`,
          { headers: { Authorization: "Bearer " + jwt } }
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load items");

        const orderIndex = (cat) => {
          const idx = categoryOrder.indexOf(cat);
          return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
        };

        d.sort((a, b) => {
          const ca = orderIndex(a.category || "Other");
          const cb = orderIndex(b.category || "Other");
          if (ca !== cb) return ca - cb;

          const as = a.frequency?.startDate
            ? new Date(a.frequency.startDate).getTime()
            : 0;
          const bs = b.frequency?.startDate
            ? new Date(b.frequency.startDate).getTime()
            : 0;
          if (as !== bs) return as - bs;

          return (a.name || "").localeCompare(b.name || "");
        });

        setItems(d);
        d.forEach((it) => loadFilesThumbsFor(it._id));
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [jwt, categoryOrder]
  );

  // Initialize selected client + items
  React.useEffect(() => {
    if (clients && clients.length > 0 && !cniClientId) {
      const first = clients[0]._id;
      setCniClientId(first);
      loadItemsFor(first);
    }
  }, [clients, cniClientId, loadItemsFor]);

  const handleClientChange = async (v) => {
    setCniClientId(v);
    if (v) {
      await loadCategoryOrder(v);
      loadItemsFor(v);
    }
  };

  // ------ Return actions for an item ------
  const returnItem = async (itemId) => {
    if (!jwt) return;
    if (
      !window.confirm(
        "Mark this care need item as Returned and cancel all its tasks?"
      )
    )
      return;
    try {
      const r = await fetch(`/api/care-need-items/${itemId}/return`, {
        method: "PATCH",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to return item");
      if (cniClientId) await loadItemsFor(cniClientId);
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const deleteItem = async (itemId) => {
    if (!jwt) return;
    if (
      !window.confirm(
        "Delete this care need item and ALL its tasks, files and comments? This cannot be undone."
      )
    )
      return;
    try {
      const r = await fetch(`/api/care-need-items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + jwt },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to delete item");
      if (cniClientId) await loadItemsFor(cniClientId);
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  // ------ Comments (item scope) ------
  const loadItemComments = async (itemId) => {
    if (!jwt) return;
    const r = await fetch(
      `/api/comments?careNeedItemId=${encodeURIComponent(itemId)}`,
      { headers: { Authorization: "Bearer " + jwt } }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to load comments");
    setCommentsByItem((prev) => ({
      ...prev,
      [itemId]: data.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  };

  const addItemComment = async (itemId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!newCommentTextItem.trim()) return;

      const r = await fetch(`/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          careNeedItemId: itemId,
          text: newCommentTextItem.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to add comment");

      setNewCommentTextItem("");
      await loadItemComments(itemId);
    } catch (e) {
      alert("Failed to add comment: " + (e.message || e));
    }
  };

  // ------ Files (item scope) for the panel (direct uploads only) ------
  const loadItemFilesPanel = async (itemId) => {
    if (!jwt) return;
    const r = await fetch(
      `/api/file-upload?scope=CareNeedItem&targetId=${encodeURIComponent(
        itemId
      )}`,
      { headers: { Authorization: "Bearer " + jwt } }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to load files");
    setPanelFilesByItem((prev) => ({
      ...prev,
      [itemId]: data.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    }));
  };

  const addItemFile = async (itemId) => {
    try {
      if (!jwt) throw new Error("UNAUTHENTICATED");
      if (!newFileItem.filename || !newFileItem.urlOrPath) {
        alert("Please provide filename and URL/path.");
        return;
      }

      const payload = {
        scope: "CareNeedItem",
        targetId: itemId,
        filename: newFileItem.filename,
        urlOrPath: newFileItem.urlOrPath,
        fileType: newFileItem.fileType || undefined,
        size: newFileItem.size ? Number(newFileItem.size) : undefined,
        description: newFileItem.description || undefined,
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

      setNewFileItem({
        filename: "",
        urlOrPath: "",
        fileType: "",
        size: "",
        description: "",
      });
      await loadItemFilesPanel(itemId);
      // Also refresh thumbnail list
      await loadFilesThumbsFor(itemId);
    } catch (e) {
      alert("Failed to add file: " + (e.message || e));
    }
  };

  // Toggle helpers
  const toggleItemComments = (itemId) => {
    if (openCommentsForItem === itemId) {
      setOpenCommentsForItem(null);
    } else {
      setOpenCommentsForItem(itemId);
      loadItemComments(itemId);
    }
  };

  const toggleItemFiles = (itemId) => {
    if (openFilesForItem === itemId) {
      setOpenFilesForItem(null);
    } else {
      setOpenFilesForItem(itemId);
      loadItemFilesPanel(itemId);
    }
  };

  return {
    // data
    cniClientId,
    items,
    filesByItem, // row thumbnails (direct + shared refs)
    panelFilesByItem, // panel files (direct uploads only)
    loading,
    err,

    // client switching & reload
    setCniClientId,
    handleClientChange,
    loadItemsFor,

    // return/delete
    returnItem,
    deleteItem,

    // return-panel state & actions
    openCommentsForItem,
    openFilesForItem,
    commentsByItem,
    newCommentTextItem,
    setNewCommentTextItem,
    newFileItem,
    setNewFileItem,
    toggleItemComments,
    toggleItemFiles,
    addItemComment,
    addItemFile,
    loadItemFilesPanel,
    currentUserId,
  };
}
