import React from "react";
import "./CalendarWeek.css"
const CalendarWeek = () => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }, (_, h) => `${h}:00`);

    const events = [
        { day: "Mon", hour: "9:00", title: "Team Meeting", urgency: "low" },
        { day: "Wed", hour: "14:00", title: "Doctor Appointment", urgency: "high" },
        { day: "Fri", hour: "18:00", title: "Dinner with Sarah", urgency: "medium" },
    ];

    return (
        <table className="calendarweek">
            <thead className="calendarweek-header">
                <tr>
                    <th className="time-col">Time</th>
                    {daysOfWeek.map((day) => (
                        <th key={day} className="day-col">
                            {day}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {hours.map((hour) => (
                    <tr key={hour}>
                        <td className="time-col">{hour}</td>
                        {daysOfWeek.map((day) => {
                            // const event = events.find((e) => e.day === day && e.hour === hour);
                            return (
                                <td key={`${day}-${hour}`} className="day-col">
                                    <div className="slot1"></div>
                                    <div className="slot2"></div>
                                    {/* {event ? (
                                        <div className={`event ${event.urgency}`}>{event.title}</div>
                                    ) : null} */}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default CalendarWeek;
