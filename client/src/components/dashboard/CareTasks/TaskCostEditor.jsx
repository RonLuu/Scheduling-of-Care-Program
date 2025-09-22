import React from "react";

function TaskCostEditor({ currentCost, draftValue, onDraftChange, onSave }) {
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <label style={{ minWidth: 120 }}>Budget spent (AUD)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={
          draftValue !== undefined
            ? draftValue
            : currentCost !== undefined && currentCost !== null
            ? currentCost
            : 0
        }
        onChange={(e) => onDraftChange(e.target.value)}
        style={{ maxWidth: 160 }}
      />
      <button onClick={onSave}>Save</button>
    </div>
  );
}

export default TaskCostEditor;
