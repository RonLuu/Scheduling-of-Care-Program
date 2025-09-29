import { React, useState } from "react";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import "./CalendarWeek.css"
const CalendarWeek = () => {

    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const monthsOfYear = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const date = new Date()
    const [currentDate, setCurrentDate] = useState(date)
    const [currentMonth, setCurrentMonth] = useState(date.getMonth());
    const [currentYear, setCurrentYear] = useState(date.getFullYear());
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const getCurrentWeek = () => {
        // Shift the date to have monday as the zero index
        const shiftedDay = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
        // Get the monday date in the current week
        const mondayDate = currentDate.getDate() - shiftedDay;
        // Return the list of date in the current week
        return Array.from({ length: 7 }, (_, i) => {
            // Current date
            const date = mondayDate + i;
            if (date > daysInMonth) {
                // Reset the date if it's over the number of day in month
                return date - daysInMonth;
            }

            // if (date < 1) {
            //     const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
            //     return prevMonthDays + day;
            // }
            return date;
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
        setCurrentWeek(getCurrentWeek(currentDate))
        setCurrentMonth(currentDate.getMonth())
        setCurrentYear(currentDate.getFullYear())
    }

    const nextWeek = () => {
        currentDate.setDate(currentDate.getDate() + 7);
        setCurrentWeek(getCurrentWeek(currentDate))
        setCurrentMonth(currentDate.getMonth())
        setCurrentYear(currentDate.getFullYear())
    }

    return (
        <div className="calendarweek-container">
            <div className="calendarweek-title">
                <h2 className="calendarweek-title-month" style={{ marginRight: "1%", fontSize:"30px"}}>{monthsOfYear[currentMonth]}</h2>
                <div className="calendarweek-title-button">
                    <SlArrowLeft className="calendarweek-title-icon" onClick={prevWeek}/>
                </div>
                <div className="calendarweek-title-button">
                    <SlArrowRight className="calendarweek-title-icon" onClick={nextWeek}/>
                </div>
            </div>
            <div className="calendarweek-content-wrapper">
                <table className="calendarweek-content">
                    <thead className="calendarweek-header">
                        <tr className="calendarweek-header-row">
                            <th className="calendarweek-header-row-time">Time</th>
                            {daysOfWeek.map((day, idx) => (
                                <th key={day} className="calendarweek-header-row-day">
                                    <div>{day}</div>
                                    <div>{currentWeek[idx]}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="calendarweek-body">
                        {slots.map((slot, i) => (
                            <tr className="calendarweek-body-row">
                                {slot.minute === "00" && <td className="calendarweek-body-row-time" rowSpan="2">{`${slot.hour}:${slot.minute}`}</td>}
                                {daysOfWeek.map((day) => {
                                    // const event = events.find(
                                    //     (e) => e.day === day && e.time === slot.label
                                    // );
                                    return (
                                        <td className="calendarweek-body-row-day">
                                            {/* {event ? (
                                                <div className={`event`}>{event.title}</div>
                                            ) : null} */}
                                        </td>
                                    )
                                }
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                
            </div>
        </div>
    );
};

export default CalendarWeek;
