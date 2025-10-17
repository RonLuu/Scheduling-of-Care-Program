import React from "react";
import { BiMenu } from "react-icons/bi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAuth from "./dashboard/hooks/useAuth";

const WebsiteHeader = ({ onMenuClick, showPrintButton = false, onPrintClick, isPrinting = false }) => {
  const { me } = useAuth();

  return (
    <header className="website-header">
      <div className="header-content">
        {/* Left section - Menu button */}
        <div className="header-left">
          <button
            className="header-menu-btn"
            onClick={onMenuClick}
            type="button"
            aria-label="Open navigation menu"
          >
            <BiMenu />
          </button>
        </div>

        {/* Center section - Logo/Title (optional) */}
        <div className="header-center">
          <h1 className="header-title">Scheduling of Care Program</h1>
        </div>

        {/* Right section - Print button and user info */}
        <div className="header-right">
          {me && (
            <div className="user-info">
              <span className="user-name">{me.name}</span>
            </div>
          )}
          
          {showPrintButton && (
            <button
              className="header-print-btn"
              onClick={onPrintClick}
              disabled={isPrinting}
              aria-label="Print page"
            >
              {isPrinting ? (
                <FontAwesomeIcon icon="spinner" spin />
              ) : (
                <FontAwesomeIcon icon="print" />
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .website-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
          color: #374151;
          z-index: 1002;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          flex: 0 0 auto;
        }

        .header-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 6px;
          color: #374151;
          font-size: 1.3rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-menu-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .header-center {
          flex: 1;
          text-align: center;
          margin: 0 2rem;
        }

        .header-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          text-shadow: none;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 0 0 auto;
        }

        .user-info {
          display: flex;
          align-items: center;
          text-align: right;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          line-height: 1.2;
        }

        .user-role {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.2;
        }

        .header-print-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 6px;
          color: #374151;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-print-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .header-print-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .header-content {
            padding: 0 1rem;
          }

          .header-title {
            font-size: 1.2rem;
          }

          .header-center {
            margin: 0 1rem;
          }

          .user-info {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 1rem;
          }
          
          .header-center {
            margin: 0 0.5rem;
          }
        }
      `}</style>
    </header>
  );
};

export default WebsiteHeader;