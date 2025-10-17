import React, { useState, useEffect } from "react";
import { BiUser, BiCalendar, BiPhone, BiEnvelope, BiTime, BiChevronRight } from "react-icons/bi";

const AllocatedStaffWidget = ({ jwt, clientId, clientName }) => {
  const [allocatedStaff, setAllocatedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jwt || !clientId) return;

    const fetchAllocatedStaff = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch recent and upcoming shift allocations for this client
        const response = await fetch(
          `/api/shift-allocations?personId=${clientId}&include=staff`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch staff allocations");
        }

        const data = await response.json();
        
        // Filter for today's shifts only
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const staffMap = new Map();

        data.forEach((allocation) => {
          if (allocation.staff) {
            const shiftStart = new Date(allocation.start);
            const shiftEnd = new Date(allocation.end);
            
            // Check if shift overlaps with today (shift starts before end of today and ends after start of today)
            const isToday = shiftStart < todayEnd && shiftEnd > todayStart;
            
            if (isToday) {
              const staffId = allocation.staff._id;
              if (!staffMap.has(staffId)) {
                staffMap.set(staffId, {
                  ...allocation.staff,
                  todayShifts: [],
                  currentShift: null,
                });
              }
              
              const staff = staffMap.get(staffId);
              staff.todayShifts.push(allocation);
              
              // Find current or next shift for today
              if (!staff.currentShift || new Date(allocation.start) < new Date(staff.currentShift.start)) {
                staff.currentShift = allocation;
              }
            }
          }
        });

        const staffList = Array.from(staffMap.values());
        setAllocatedStaff(staffList);
      } catch (err) {
        setError(err.message || "Failed to load staff allocations");
      } finally {
        setLoading(false);
      }
    };

    fetchAllocatedStaff();
  }, [jwt, clientId]);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-AU", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const getDisplayRole = (staff) => {
    if (staff.role === "Admin") {
      return staff.roleTitle || "Organization Representative";
    } else if (staff.role === "GeneralCareStaff") {
      return "Carer";
    }
    return staff.role;
  };

  if (loading) {
    return (
      <div className="widget">
        <div className="widget-header">
          <BiUser className="widget-icon" />
          <h3>Care Staff</h3>
        </div>
        <div className="loading-message">Loading staff information...</div>
        
        <style jsx>{`
          .widget {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
          }
          .widget-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #f3f4f6;
          }
          .widget-icon {
            color: #8189d2;
            font-size: 1.25rem;
          }
          .widget-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 1.125rem;
            font-weight: 600;
          }
          .loading-message {
            text-align: center;
            color: #6b7280;
            padding: 1rem;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget">
        <div className="widget-header">
          <BiUser className="widget-icon" />
          <h3>Care Staff</h3>
        </div>
        <div className="error-message">{error}</div>
        
        <style jsx>{`
          .widget {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
          }
          .widget-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #f3f4f6;
          }
          .widget-icon {
            color: #8189d2;
            font-size: 1.25rem;
          }
          .widget-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 1.125rem;
            font-weight: 600;
          }
          .error-message {
            color: #dc2626;
            text-align: center;
            padding: 1rem;
            background: #fef2f2;
            border-radius: 8px;
            border: 1px solid #fecaca;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <BiUser className="widget-icon" />
        <h3>Today's Carer for {clientName}</h3>
        <a href="/shift-allocation" className="view-link">View More →</a>
      </div>

      {allocatedStaff.length === 0 ? (
        <div className="no-staff">
          <p>No carers scheduled for today.</p>
          <small>Today's carer assignments will appear here when shifts are scheduled.</small>
        </div>
      ) : (
        <div className="staff-list">
          {allocatedStaff.map((staff) => {
            
            return (
              <div key={staff._id} className="staff-card">
                <div className="staff-info">
                  <div className="staff-header">
                    <h4 className="staff-name">{staff.name}</h4>

                  </div>
                  
                  {staff.email && (
                    <div className="contact-info">
                      <BiEnvelope className="contact-icon" />
                      <span>{staff.email}</span>
                    </div>
                  )}
                  
                  {staff.phone && (
                    <div className="contact-info">
                      <BiPhone className="contact-icon" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                  
                  <div className="shift-info">
                    {staff.currentShift ? (
                      <div className="next-shift">
                        <BiCalendar className="shift-icon" />
                        <div className="shift-details">
                          <span className="shift-label">Today's shift:</span>
                          <span className="shift-time">
                            {formatDateTime(staff.currentShift.start).time} - {formatDateTime(staff.currentShift.end).time}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="no-upcoming">
                        <BiTime className="shift-icon" />
                        <span>No shift today</span>
                      </div>
                    )}
                    
                    <div className="shift-count">
                      {staff.todayShifts.length} shift{staff.todayShifts.length !== 1 ? 's' : ''} today
                    </div>
                  </div>
                </div>
                
                <BiChevronRight className="arrow-icon" />
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
          justify-content: flex-start;
        }

        .widget-icon {
          color: #8189d2;
          font-size: 1.25rem;
        }

        .widget-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
          text-align: left !important;
          flex: 1;
        }

        .view-link {
          color: #8189d2;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          transition: color 0.2s;
        }

        .view-link:hover {
          color: #6366f1;
          text-decoration: underline;
        }

        .no-staff {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
        }

        .no-staff p {
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .no-staff small {
          color: #9ca3af;
        }

        .staff-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .staff-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .staff-card:hover {
          background: #f3f4f6;
          border-color: #8189d2;
        }

        .staff-info {
          flex: 1;
        }

        .staff-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .staff-name {
          margin: 0;
          color: #1f2937;
          font-size: 1rem;
          font-weight: 600;
        }

        .staff-role {
          background: #8189d2;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .contact-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .contact-icon {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .shift-info {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .next-shift {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .no-upcoming {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .shift-icon {
          color: #8189d2;
          font-size: 1rem;
          margin-top: 0.125rem;
        }

        .shift-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .shift-label {
          color: #6b7280;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .shift-time {
          color: #1f2937;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .shift-count {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .arrow-icon {
          color: #d1d5db;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .staff-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .contact-info {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AllocatedStaffWidget;