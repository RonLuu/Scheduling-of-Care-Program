import React from "react";
import { formatDate } from "../utils/formatters";

function ClientList({ clients }) {
  return (
    <div className="card">
      <h3>My Clients</h3>
      {clients.length === 0 ? (
        <p>No linked clients.</p>
      ) : (
        <ul>
          {clients.map((c) => (
            <li key={c._id}>
              <strong>{c.name}</strong>
              {c.dateOfBirth && <span> · DOB {formatDate(c.dateOfBirth)}</span>}
              {c.medicalInfo && <span> · {c.medicalInfo}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClientList;
