import React from "react";
import NavigationTab from "../../NavigationTab";

function FAQPage() {
  return (
    <div className="page">
      <NavigationTab />
      <div className="page-main">
        <h2>Frequently Asked Questions (FAQ)</h2>
        <p>This is a placeholder FAQ page. Content will be added here later.</p>

        <ul>
          <li>
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
          </li>
        </ul>

        <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
          More FAQs coming soon...
        </p>
      </div>
    </div>
  );
}

export default FAQPage;
