import React, { useState, useEffect, useMemo } from "react";
import { BiBuilding, BiEdit, BiLogOut } from "react-icons/bi";
import Select from 'react-select';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
// import NavigationTab from "../../NavigationTab";
import Header from "../../Header"
import useAuth from "../hooks/useAuth";

function OrganizationPage() {
  const { me, setMe } = useAuth();
  const jwt = localStorage.getItem("jwt");

  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgErr, setOrgErr] = useState("");
  const [pendingOrgId, setPendingOrgId] = useState("");
  const [orgSaveMsg, setOrgSaveMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // for the select 
  const [isOrgOpen, setIsOrgOpen] = useState(false);  
  const orgOptions = orgs.map((o) => ({
  value: o._id,
  label: o.name,
  }));

  const selectedOrgOption = orgOptions.find(
    (option) => option.value === pendingOrgId
  );
  // end edit

  const refreshMe = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
  };

  // Load organizations on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingOrgs(true);
        setOrgErr("");
        const r = await fetch("/api/organizations");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load organizations");
        if (!active) return;
        setOrgs(d);

        // Set initial pending org ID
        if (me?.organizationId) {
          setPendingOrgId(String(me.organizationId));
        }
      } catch (e) {
        if (active) setOrgErr(e.message || String(e));
      } finally {
        if (active) setLoadingOrgs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [me?.organizationId]);

  const currentOrg = useMemo(() => {
    if (!me?.organizationId) return null;
    return orgs.find((o) => o._id === String(me.organizationId));
  }, [orgs, me?.organizationId]);

  const handleSaveOrganization = async () => {
    try {
      setOrgSaveMsg("");
      setIsProcessing(true);

      if (!pendingOrgId) {
        setOrgSaveMsg("Please select an organisation.");
        setIsProcessing(false);
        return;
      }

      // No-op if same org selected
      if (me?.organizationId && pendingOrgId === String(me.organizationId)) {
        setOrgSaveMsg("You're already in this organisation. No changes made.");
        setEditing(false);
        setIsProcessing(false);
        return;
      }

      let migrateClients = false;

      if (me.role === "Family" || me.role === "PoA") {
        const ok = window.confirm(
          "Are you sure to change organization?\n\nClick OK to proceed."
        );
        if (!ok) {
          setOrgSaveMsg("Change cancelled. No updates made.");
          setIsProcessing(false);
          return;
        }
        migrateClients = true;
      }

      const r = await fetch("/api/users/me/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
        body: JSON.stringify({
          organizationId: pendingOrgId,
          migrateClients,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to save organisation");

      // Success
      const chosenName =
        orgs.find((o) => o._id === pendingOrgId)?.name || "Organisation";

      if (d.cascade) {
        const c = d.cascade;
        setOrgSaveMsg(
          `Successfully changed to "${chosenName}". ` +
            `Moved: ${c.personsMoved} clients, ${c.itemsMoved} items, ${c.tasksMoved} tasks. ` +
            `${c.familyMoved} family/PoA moved, ${c.staffRevoked} staff/admin access revoked.`
        );
      } else {
        setOrgSaveMsg(`Successfully joined "${chosenName}".`);
      }

      // Refresh user data
      await refreshMe();
      setEditing(false);
    } catch (e) {
      setOrgSaveMsg("Error: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveOrganization = async () => {
    const confirmLeave = window.confirm(
      "Are you sure you want to leave this organisation? " +
        "This will remove your access to all clients and data associated with this organisation."
    );

    if (!confirmLeave) return;

    try {
      setIsProcessing(true);
      setOrgSaveMsg("");

      const r = await fetch("/api/users/me/leave-organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to leave organisation");

      setOrgSaveMsg("You have successfully left the organisation.");
      setPendingOrgId("");

      // Refresh user data
      await refreshMe();
    } catch (e) {
      setOrgSaveMsg("Error leaving organisation: " + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setPendingOrgId(me?.organizationId ? String(me.organizationId) : "");
    setOrgSaveMsg("");
  };

  return (
    <div className="access-page" >

      <Header title="Organization Settings" />
      <div className="container">
        <div className="card_res">
      
          {/* Current Organization Status */}
          <div>
            <h2>Current Organization</h2>
            {currentOrg ? (
              <div className="">
                <div className="">
                  <span className="">Organization:</span>
                  <span className="value">{currentOrg.name}</span>
                </div>
                <div className="">
                  <span className="">ID:</span>
                  <code className="">{currentOrg._id}</code>
                </div>
                {!editing && (
                  <div className="">
                    <button
                      className="btn"
                      onClick={() => setEditing(true)}
                      disabled={isProcessing}
                    >
                      <BiEdit /> Change Organization
                    </button>
                    <button
                      className="btn"
                      onClick={handleLeaveOrganization}
                      disabled={isProcessing}
                    >
                      <BiLogOut /> Leave Organization
                    </button>
                  </div>
                )}
              </div>
            ) : (
              //when user not have organization
              <div className="">
                <p className="">
                  You are not currently associated with any organization.
                </p>
                <p className="">
                  You must set your organization before you can add or manage
                  clients.
                </p>
                {!editing && (
                  <button
                    className="btn"
                    onClick={() => setEditing(true)}
                    disabled={isProcessing}
                  >
                    <BiBuilding /> Join Organization
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Edit Organization Section */}
          {editing && (
            <div className="">
              <h3>
                {currentOrg ? "Change Organization" : "Join Organization"}
              </h3>

              {loadingOrgs ? (
                <div className="loading">Loading organizations...</div>
              ) : orgErr ? (
                // main content
                <div className="error">Error: {orgErr}</div>
              ) : (
                <>
                  <div className="">
                    <label htmlFor="">Select Organization</label>
                    <div className="select-container access-select">
                    <Select
                      options={orgOptions}
                      value={selectedOrgOption || null}
                      onChange={(option) => setPendingOrgId(option ? option.value : "")}
                      onMenuOpen={() => setIsOrgOpen(true)}
                      onMenuClose={() => setIsOrgOpen(false)}
                      classNamePrefix="org-select"
                      placeholder="— Select organization —"
                      isClearable
                      unstyled
                      isDisabled={isProcessing}
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
                      className={`icon access-icon ${isOrgOpen ? "open" : "close"}`}
                    />
                     </div>
                  </div>             

                  {(me?.role === "Family" || me?.role === "PoA") &&
                    currentOrg &&
                    pendingOrgId &&
                    pendingOrgId !== String(me.organizationId) && (
                      <div className="migration-warning">
                        <strong>Important:</strong> Changing organizations will:
                        <ul>
                          <li>Move all your clients to the new organization</li>
                          <li>Transfer associated family/PoA members</li>
                          <li>Revoke all staff/admin access to your clients</li>
                        </ul>
                      </div>
                    )}

                  <div className="edit-actions">
                    <button
                      className="btn"
                      onClick={handleSaveOrganization}
                      disabled={!pendingOrgId || isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Save"}
                    </button>
                    <button
                      className="btn"
                      onClick={handleCancelEdit}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Status Messages */}
          {orgSaveMsg && (
            <div
              className={`status-message ${
                orgSaveMsg.includes("Error") ? "error" : "success"
              }`}
            >
              {orgSaveMsg}
            </div>
          )}

          {/* Information Section */}
          <div className="info-card">
            <h3>About Organizations</h3>
            <div className="info-content">
              <p>
                Organizations help take care clients, manage workers and
                organize resources.
              </p>

              <h4>Your Role: {me?.role || "Not Set"}</h4>
              {(me?.role === "Family" || me?.role === "PoA") && (
                <ul>
                  <li>You can grant access to manager of the organization.</li>
                  <li>Changing organizations will migrate all your clients</li>
                  <li>
                    You can grant or revoke access to any worker and staff of
                    the organization
                  </li>
                </ul>
              )}
              {me?.role === "Admin" && (
                <ul>
                  <li>You can manage organization-wide settings</li>
                  <li>You can oversee clients within the organization</li>
                  <li>
                    You can manage grant access and allocating shifts for
                    workers in organization
                  </li>
                </ul>
              )}
              {me?.role === "GeneralCareStaff" && (
                <ul>
                  <li>
                    You can view and assist care tasks associated to the client
                  </li>
                  <li>Your access is managed by organization manager users</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    
    </div>
  );
}

export default OrganizationPage;
