import React from "react";
import NavigationTab from "../../NavigationTab";
import Dropdown from "./Dropdown"
import "../../../styles/FAQPage.css";
function FAQ() {
    return (
        <div className="FAQ-wrapper">
            <h2 style={{ color: "#2C3F70", fontSize: "50px", marginTop: "5%" }}>Frequently Asked Questions</h2>
            <div className="FAQ-questions-answers">
                <Dropdown question={"How do I log out?"} answer={"Use the log out button in the navigation tab"} />
                <Dropdown
                    question={"How do I add a client?"}
                    answer={"Navigate to the Clients page and use the Add Client form."} />
                <Dropdown question={"How do I log out?"} answer={"Use the log out button in the navigation tab"} />
                <Dropdown question={"Where can I see budget reports?"} answer={"Go to the Budget Reports section from the navigation tab."} />
                <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
                    More FAQs coming soon...
                </p>
            </div>

        </div>
    );
}

export default FAQ;
