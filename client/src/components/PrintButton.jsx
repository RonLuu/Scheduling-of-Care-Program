import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "../styles/PrintButton.css";

const PrintButton = ({
  targetId = "printable-content",
  fileName = "page-capture",
  buttonStyle = {},
  buttonClassName = "",
  position = "fixed", // or "absolute"
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const captureAndDownload = async (format = "pdf") => {
    setIsCapturing(true);
    setShowOptions(false);

    try {
      // Find the element to capture
      const element = document.getElementById(targetId);
      if (!element) {
        console.error(`Element with id "${targetId}" not found`);
        return;
      }

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true, // Handle cross-origin images
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      if (format === "png") {
        // Download as PNG
        const link = document.createElement("a");
        link.download = `${fileName}-${
          new Date().toISOString().split("T")[0]
        }.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (format === "pdf") {
        // Download as PDF
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName}-${new Date().toISOString().split("T")[0]}.pdf`);
      } else if (format === "print") {
        // Print directly
        const printWindow = window.open("", "_blank");
        const imgData = canvas.toDataURL("image/png");
        printWindow.document.write(`
          <html>
            <head>
              <title>Print</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; }
                img { max-width: 100%; height: auto; }
                @media print {
                  body { margin: 0; }
                  img { width: 100%; }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error capturing page:", error);
      alert("Failed to capture the page. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const defaultStyles = {
    position: position,
    top: "20px",
    right: "10px", 
    zIndex: 1000,
  };

  return (
    <div
      style={{ ...defaultStyles, ...buttonStyle }}
      className={buttonClassName}
    >
      <div
        style={{
          position: "relative",
          minWidth: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={isCapturing}
          style={{
            backgroundColor: "#1c7246ff",
            color: "white",
            border: "none",
            borderRadius: "10%",
            width: "48px",
            height: "48px",
            cursor: isCapturing ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) =>
            !isCapturing && (e.target.style.backgroundColor = "#1c7246ff")
          }
          onMouseLeave={(e) =>
            !isCapturing && (e.target.style.backgroundColor = "#1c7246ff")
          }
        >
          {isCapturing ? (
            <FontAwesomeIcon icon="spinner" spin />
          ) : (
            <FontAwesomeIcon icon="print" />
          )}
        </button>

        {showOptions && !isCapturing && (
          <div
            style={{
              position: "absolute",
              top: "52px",
              right: "0",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              minWidth: "200px",
            }}
          >
            <button
              onClick={() => captureAndDownload("pdf")}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 0px",
                margin: "0px",
                border: "1px solid black",
                background: "none",
                textAlign: "center",
                cursor: "pointer",
                transition: "background-color 0.2s",
                color: "#333",
                fontSize: "1.2em",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "transparent")
              }
            >
              <FontAwesomeIcon icon="file-pdf" style={{ marginRight: "8px" }} />
              Save as PDF
            </button>
            <button
              onClick={() => captureAndDownload("png")}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 0px",
                margin: "0px",
                border: "1px solid black",
                background: "none",
                textAlign: "center",
                cursor: "pointer",
                transition: "background-color 0.2s",
                color: "#333",
                fontSize: "1.2em",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "transparent")
              }
            >
              <FontAwesomeIcon
                icon="file-image"
                style={{ marginRight: "8px" }}
              />
              Save as Image
            </button>
            <button
              onClick={() => captureAndDownload("print")}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 0px",
                margin: "0px",
                border: "1px solid black",
                background: "none",
                textAlign: "center",
                cursor: "pointer",
                transition: "background-color 0.2s",
                color: "#333",
                fontSize: "1.2em",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "transparent")
              }
            >
              <FontAwesomeIcon icon="print" style={{ marginRight: "8px" }} />
              Print
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintButton;
