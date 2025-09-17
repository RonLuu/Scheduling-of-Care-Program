import React from "react";

function TaskFiles({
  taskId,
  files,
  newFile,
  onNewFileChange,
  onAddFile,
  onLoadFiles,
}) {
  const handleUpload = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      const jwt = localStorage.getItem("jwt");
      if (!jwt) throw new Error("UNAUTHENTICATED");

      const fd = new FormData();
      fd.append("scope", "CareTask");
      fd.append("targetId", taskId);
      fd.append("description", form.description.value);
      fd.append("file", form.file.files[0]);

      const r = await fetch("/api/file-upload/upload", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
        },
        body: fd,
      });

      const isJson = r.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson ? await r.json() : { error: await r.text() };

      if (!r.ok) throw new Error(data.error || "Upload failed");

      form.reset();
      await onLoadFiles();
    } catch (err) {
      alert("Upload failed: " + (err.message || String(err)));
    }
  };

  return (
    <div
      style={{
        marginTop: 8,
        background: "#fafafa",
        borderRadius: 8,
        padding: 8,
      }}
    >
      <h4 style={{ margin: "4px 0" }}>Files</h4>

      {/* Existing files list */}
      <div>
        {files.length === 0 ? (
          <p>No files yet.</p>
        ) : (
          <ul>
            {files.map((f) => (
              <li key={f._id} style={{ marginBottom: 6 }}>
                {f.fileType && f.fileType.startsWith("image/") ? (
                  <a href={f.urlOrPath} target="_blank" rel="noreferrer">
                    <img
                      src={f.urlOrPath}
                      alt={f.filename}
                      style={{
                        maxHeight: 64,
                        maxWidth: 96,
                        objectFit: "cover",
                        marginRight: 8,
                        verticalAlign: "middle",
                        borderRadius: 4,
                        border: "1px solid #ddd",
                      }}
                    />
                  </a>
                ) : (
                  <a href={f.urlOrPath} target="_blank" rel="noreferrer">
                    {f.filename}
                  </a>
                )}
                {" · "}
                {new Date(f.createdAt).toLocaleString()}
                {f.description ? <div>{f.description}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add by link */}
      <h5>Add by link</h5>
      <div className="row">
        <input
          placeholder="Filename (e.g., Pyjamas photo)"
          value={newFile.filename}
          onChange={(e) =>
            onNewFileChange((prev) => ({
              ...prev,
              filename: e.target.value,
            }))
          }
        />
        <input
          placeholder="URL or path (https://…)"
          value={newFile.urlOrPath}
          onChange={(e) =>
            onNewFileChange((prev) => ({
              ...prev,
              urlOrPath: e.target.value,
            }))
          }
        />
      </div>

      <input
        placeholder="Description (optional)"
        value={newFile.description}
        onChange={(e) =>
          onNewFileChange((prev) => ({
            ...prev,
            description: e.target.value,
          }))
        }
      />
      <button onClick={onAddFile}>Add file (link)</button>

      {/* Real file upload */}
      <h5 style={{ marginTop: 12 }}>Upload a file</h5>
      <form onSubmit={handleUpload}>
        <input type="file" name="file" required />
        <input name="description" placeholder="Description (optional)" />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
}

export default TaskFiles;
