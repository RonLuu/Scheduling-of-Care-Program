import { React, useState } from "react";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import "./CalendarWeek.css"
const CalendarWeek = () => {
    // TODO: bug on the date sep 2026
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const monthsOfYear = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const events = [
        {
            // "_id": "651f3b8f9a3b2f001234abcd",
            // "organizationId": "651f2e4c8a2a1f0011223344",
            // "personId": "651f2fdd8a2a1f0011223345",
            // "staffUserId": "651f30108a2a1f0011223346",
            "shiftType": "morning",
            "start": "2025-09-30T08:00:00.000Z",
            "end": "2025-09-30T12:00:00.000Z",
            "notes": "Assist with breakfast and morning medication",
            // "createdByUserId": "651f30108a2a1f0011223347",
            // "createdAt": "2025-09-28T10:12:34.567Z",
            // "updatedAt": "2025-09-28T10:12:34.567Z"
        },
        // {
        //     // "_id": "651f3c249a3b2f001234abce",
        //     // "organizationId": "651f2e4c8a2a1f0011223344",
        //     // "personId": "651f2fdd8a2a1f0011223348",
        //     // "staffUserId": "651f30108a2a1f0011223349",
        //     "shiftType": "custom",
        //     "start": "2025-09-30T13:30:00.000Z",
        //     "end": "2025-09-30T16:00:00.000Z",
        //     "notes": "Accompany to doctor’s appointment",
        //     // "createdByUserId": "651f30108a2a1f0011223347",
        //     // "createdAt": "2025-09-28T10:15:00.000Z",
        //     // "updatedAt": "2025-09-28T10:15:00.000Z"
        // },
        {
            // "_id": "651f3c6e9a3b2f001234abcf",
            // "organizationId": "651f2e4c8a2a1f0011223344",
            // "personId": "651f2fdd8a2a1f0011223350",
            // "staffUserId": "651f30108a2a1f0011223351",
            // "shiftType": "evening",
            // "start": "2025-09-30T20:00:00.000Z",
            // "end": "2025-10-01T06:00:00.000Z",
            // "notes": "Overnight supervision and morning handover",
            // "createdByUserId": "651f30108a2a1f0011223347",
            // "createdAt": "2025-09-28T10:17:45.000Z",
            // "updatedAt": "2025-09-28T10:17:45.000Z"
        }
    ];
    const date = new Date()
    const [currentDate, setCurrentDate] = useState(date)
    const [currentMonth, setCurrentMonth] = useState(date.getMonth());
    const [currentYear, setCurrentYear] = useState(date.getFullYear());
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    function getMondayDate(currentDate) {
        // Convert the day index such that Monday is at the zero index
        const dayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
        const currentMonday = new Date(currentDate);
        currentMonday.setDate(currentDate.getDate() - dayIndex)
        return currentMonday
    }

    const getCurrentWeek = () => {
        // Return the list of date in the current week
        const currentMondayDate = getMondayDate(currentDate)
        return Array.from({ length: 7 }, (_, i) => {
            const currentDayDate = new Date(currentMondayDate)
            currentDayDate.setDate(currentMondayDate.getDate() + i);
            return currentDayDate;
        });
    };

    const [currentWeek, setCurrentWeek] = useState(getCurrentWeek(currentDate))

    const slots = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return { hour: h, minute: m, label: `${h}:${m}` };
    });

    const prevWeek = () => {
        currentDate.setDate(currentDate.getDate() - 7);
        const currentMondayDate = getMondayDate(currentDate)
        setCurrentWeek(getCurrentWeek())
        setCurrentMonth(currentMondayDate.getMonth())
        setCurrentYear(currentMondayDate.getFullYear())
    }

    const nextWeek = () => {
        currentDate.setDate(currentDate.getDate() + 7);
        const currentMondayDate = getMondayDate(currentDate)
        setCurrentWeek(getCurrentWeek())
        setCurrentMonth(currentMondayDate.getMonth())
        setCurrentYear(currentMondayDate.getFullYear())
    }
    
    return (
        <div className="calendarweek">
            <div className="calendarweek-title">
                <div className="calendarweek-title-button-wrapper">
                    <button className="calendarweek-title-button">
                        <SlArrowLeft className="calendarweek-title-icon" onClick={prevWeek} />
                    </button>
                </div>
                <div className="calendarweek-title-month-wrapper">
                    <h2 className="calendarweek-title-month">{currentDate.getFullYear()}</h2>
                    <h2 className="calendarweek-title-month">{monthsOfYear[getMondayDate(currentDate).getMonth()]}</h2>
                </div>
                <div className="calendarweek-title-button-wrapper">
                    <button className="calendarweek-title-button">
                        <SlArrowRight className="calendarweek-title-icon" onClick={nextWeek} />
                    </button>
                </div>
            </div>
            <div className="calendarweek-content-wrapper">
                <table className="calendarweek-content">
                    <thead className="calendarweek-header">
                        <tr className="calendarweek-header-row">
                            <th className="calendarweek-header-row-time">Time</th>
                            { currentWeek.map(date => (
                                <th className="calendarweek-header-row-day">
                                    <div>{date.getDay() - 1 >= 0 ? daysOfWeek[date.getDay() - 1] : daysOfWeek[6]}</div>
                                    <div>{date.getDate()}</div>
                                </th>
                            ))
                            }

                        </tr>
                    </thead>
                    <tbody className="calendarweek-body">
                        {slots.map((slot, i) => (
                            <tr className="calendarweek-body-row">
                                {slot.minute === "00" && <td className="calendarweek-body-row-time" rowSpan="2">{`${slot.hour}:${slot.minute}`}</td>}
                                {currentWeek.map((day) => {
                                    const event = events.find((e) => {
                                        const eventStartDate = new Date(e.start);
                                        return (eventStartDate.getDate() === day.getDate() && 
                                                eventStartDate.getHours() == slot.hour && 
                                                eventStartDate.getMinutes() == parseInt(slot.minute,10))
                                    });

                                    if (event) {
                                        const eventStartDate = new Date(event.start);
                                        const eventEndDate = new Date(event.end);
                                        const diffMinutes = (eventEndDate - eventStartDate) / (1000 * 60);
                                        const slotDuration = 30;
                                        const slots = diffMinutes / slotDuration;

                                        return (
                                            <td className="calendarweek-body-row-day" rowSpan={8}>
                                                <div className="event" style={{height: `${8*40}px`}}>{event.notes}</div>
                                            </td>
                                        );
                                    }

                                    const insideEvent = events.some((e) =>{
                                        const eventStartDate = new Date(e.start);
                                        const eventEndDate = new Date(e.end);
                                        
                                        return eventStartDate.getDate() === day.getDate() &&
                                        (
                                            (slot.hour > eventStartDate.getHours() && slot.hour < eventEndDate.getHours()) ||
                                            (slot.hour === eventStartDate.getHours() && parseInt(slot.minute) > eventStartDate.getMinutes()) ||
                                            (slot.hour === eventEndDate.getHours() && parseInt(slot.minute) < eventEndDate.getMinutes())
                                        )
                                    });

                                    if (insideEvent) {
                                        return null; // skip this slot, since rowspan cell already covers it
                                    }

                                    // Default empty cell
                                    return <td className="calendarweek-body-row-day"></td>;
                                     
                                    
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CalendarWeek;
