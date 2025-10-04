import React, {useState} from "react";
import Select from 'react-select';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
function CreateToken({ me, jwt, clients }) {
  const initialType =
    me && me.role === "Admin" ? "STAFF_TOKEN" : "MANAGER_TOKEN";
  const [type, setType] = React.useState(initialType);
  const [expiresInDays, setExpiresInDays] = React.useState(7);
  const [selectedPersonId, setSelectedPersonId] = React.useState("");
  const [tokenResult, setTokenResult] = React.useState(null);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const allowedTypesFor = (role) => {
    if (role === "Admin") return [["STAFF_TOKEN", "Staff invite"]];
    if (role === "Family" || role === "PoA")
      return [
        ["FAMILY_TOKEN", "Family invite"],
        ["MANAGER_TOKEN", "Manager invite"],
      ];
    return [];
  };
  //  react select part I edit in 

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const selectedClientOption = clientOptions.find(
    (option) => option.value === selectedPersonId
  );
  const typeOptions = allowedTypesFor(me.role).map(([v,label]) => ({
    value: v,
    label: label,
  }));
  const selectedTypeOption = typeOptions.find(
    (option) => option.value == type
  );
  // end new part

  const createToken = async (e) => {
    e.preventDefault();
    if (!selectedPersonId) {
      setTokenResult({ error: "Please select a client." });
      return;
    }

    const r = await fetch("/api/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
      },
      body: JSON.stringify({
        type,
        organizationId: me.organizationId,
        personIds: [selectedPersonId],
        expiresInDays: Number(expiresInDays),
        maxUses: 1, // 🔒 always 1
      }),
    });

    const d = await r.json();
    setTokenResult(r.ok ? d : { error: d.error || "Failed" });


  };


  return (
    <div className="card_res">
      <h3>Create invite token</h3>

          <label htmlFor="access-token">Type of Invitaion
            <div className="help-wrapper">
              <span className="important-info"> * </span>
              <span className="tool-tip">Required</span>
            </div>

            <div className="help-wrapper">
              <span className="help-icon " >?</span>
              <span className="tool-tip">This is given to you via email</span>
            </div>
          </label>
       <div className="select-container access-select">
          <Select
            options={typeOptions}
            value={selectedTypeOption || null}
            onChange={(option) => setType(option ? option.value : "")}
            onMenuOpen={() => setIsTypeOpen(true)}
            onMenuClose={() => setIsTypeOpen(false)}
            classNamePrefix="type-select"
            placeholder="— Select a type —"
            isClearable
            unstyled
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
            }}
            classNames={{
            control: () => 'select__control',
            menu: () => 'select__menu',
            option: ({ isFocused, isSelected }) => 
              `select__option ${isFocused ? 'select__option--is-focused' : ''}${isSelected ? ' select__option--is-selected' : ''}`,
            placeholder: () => 'select__placeholder',
            singleValue: () => 'select__single-value',
            clearIndicator: () => 'client-select__clear-indicator',

            }}
            />
          <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`icon access-icon ${isTypeOpen ? "open" : "close"}`}
                />
          </div>

      {/* Client + Expires in (days) on the same row */}
      <div className="access-token-row">
        <div className="block">
          <label>Client Name <span className="important-info">*</span> </label>
          <div className="select-container access-select">
          <Select
            options={clientOptions}
            value={selectedClientOption || null}
            onChange={(option) => setSelectedPersonId(option ? option.value : "")}
            onMenuOpen={() => setIsClientOpen(true)}
            onMenuClose={() => setIsClientOpen(false)}
            classNamePrefix="client-select"
            placeholder="— Select a client —"
            isClearable
            unstyled
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
            }}
            classNames={{
            control: () => 'select__control',
            menu: () => 'select__menu',
            option: ({ isFocused, isSelected }) => 
              `select__option ${isFocused ? 'select__option--is-focused' : ''}${isSelected ? ' select__option--is-selected' : ''}`,
            placeholder: () => 'select__placeholder',
            singleValue: () => 'select__single-value',
            clearIndicator: () => 'client-select__clear-indicator',
            }}
            />
          <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`icon access-icon ${isClientOpen ? "open" : "close"}`}
                />
          </div>
        </div>

        <div className="block">
          <label>Day(s) till expiration</label>
          <div className="select-container access-input">
            <input
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />
          </div>
        </div>
      </div>

      <button className="btn" onClick={createToken} disabled={!selectedPersonId}>
        Create token
      </button>

      {tokenResult &&
        (tokenResult.token ? (
          <p>
            Share code: <code>{tokenResult.token}</code> (expires{" "}
            {new Date(tokenResult.expiresAt).toLocaleString()})
          </p>
        ) : (
          <p style={{ color: "#b91c1c" }}>Error: {tokenResult.error}</p>
        ))}
    </div>
  );
}

export default CreateToken;
