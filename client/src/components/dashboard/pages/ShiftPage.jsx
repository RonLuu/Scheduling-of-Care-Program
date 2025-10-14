import React from "react";
import NavigationTab from "../../NavigationTab";
import ShiftScheduler from "../Shift1/ShiftScheduler";
import "../../../styles/ShiftPage.css"
function ShiftPage() {
  return (
    <div className="shiftpage">
      <NavigationTab />
      <ShiftScheduler/>
      {/* <div className="page-main">
        <h2>Shift Allocation</h2>

        {loading && <p>Loading clients…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {jwt && me && <ShiftScheduler jwt={jwt} me={me} clients={clients} />}
        {jwt1 && me1 && <ShiftScheduler jwt={jwt1} me={me1} clients={clients1} />}
      </div> */}
    </div>
  );
}

export default ShiftPage;
