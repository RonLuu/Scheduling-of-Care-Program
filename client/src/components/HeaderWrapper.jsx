import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import WebsiteHeader from "./WebsiteHeader";
import NavigationTab from "./NavigationTab";
import PrintButton from "./PrintButton";
import useAuth from "./dashboard/hooks/useAuth";

const HeaderWrapper = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { me } = useAuth();
  const location = useLocation();

  // Don't show header on login/register pages
  const shouldShowHeader = me && !["/login", "/registeruser", "/registerorganization"].includes(location.pathname);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handlePrintClick = () => {
    setShowPrintOptions(!showPrintOptions);
  };

  const captureAndDownload = async (format = "pdf") => {
    setIsPrinting(true);
    setShowPrintOptions(false);

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      // Find the element to capture
      const element = document.getElementById("app-content");
      if (!element) {
        console.error('Element with id "app-content" not found');
        return;
      }

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      if (format === "png") {
        // Download as PNG
        const link = document.createElement("a");
        link.download = `${location.pathname.slice(1) || "page"}-capture-${
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
        pdf.save(`${location.pathname.slice(1) || "page"}-capture-${new Date().toISOString().split("T")[0]}.pdf`);
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
      setIsPrinting(false);
    }
  };

  return (
    <>
      {shouldShowHeader && (
        <WebsiteHeader
          onMenuClick={handleMenuToggle}
          showPrintButton={true}
          onPrintClick={handlePrintClick}
          isPrinting={isPrinting}
        />
      )}

      <NavigationTab isOpen={isMenuOpen} onToggle={setIsMenuOpen} />

      {/* Print options dropdown */}
      {showPrintOptions && !isPrinting && (
        <div className="print-options-dropdown">
          <button onClick={() => captureAndDownload("pdf")}>
            Save as PDF
          </button>
          <button onClick={() => captureAndDownload("png")}>
            Save as Image
          </button>
          <button onClick={() => captureAndDownload("print")}>
            Print
          </button>
        </div>
      )}

      {/* Main content with proper spacing */}
      <div className={`main-content ${shouldShowHeader ? 'with-header' : ''}`}>
        {children}
      </div>

      <style jsx>{`
        .main-content {
          min-height: 100vh;
        }

        .main-content.with-header {
          padding-top: 50px; /* Height of the header */
        }

        .print-options-dropdown {
          position: fixed;
          top: 56px;
          right: 20px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1003;
          min-width: 180px;
          overflow: hidden;
        }

        .print-options-dropdown button {
          display: block;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
          color: #333;
          font-size: 14px;
          border-bottom: 1px solid #eee;
        }

        .print-options-dropdown button:last-child {
          border-bottom: none;
        }

        .print-options-dropdown button:hover {
          background-color: #f5f5f5;
        }
      `}</style>
    </>
  );
};

export default HeaderWrapper;