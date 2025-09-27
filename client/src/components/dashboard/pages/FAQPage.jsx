import React from "react";
import NavigationTab from "../../NavigationTab/NavigationTab";
import Dropdown from "./dropdown";
import "../../../styles/FAQPage.css"
function FAQPage() {
  return (
    <div className>
      <NavigationTab />
      <div className="FAQ-wrapper">
        <h2 style={{ color: "#2C3F70", fontSize:"50px", marginTop:"5%"}}>Frequently Asked Questions</h2>
        <div className="FAQ-questions-answers">
          <Dropdown question={"How do I log out?"} answer={"Use the log out button in the navigation tab"}/>
          {/* <li>
            <strong>Q:</strong> How do I log out? <br />
            <strong>A:</strong> Use the <em>Log Out</em> button in the
            navigation tab.
          </li>
          <li>
            <strong>Q:</strong> How do I add a client? <br />
            <strong>A:</strong> Navigate to the <em>Clients</em> page and use
            the <em>Add Client</em> form.
          </li>
          <li>
            <strong>Q:</strong> Where can I see budget reports? <br />
            <strong>A:</strong> Go to the <em>Budget Reports</em> section from
            the navigation tab.
          </li> */}
        </div>

        <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
          More FAQs coming soon...
        </p>
      </div>
    </div>
  );
}

export default FAQPage;
