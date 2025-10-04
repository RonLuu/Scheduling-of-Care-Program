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
        // {
        //     "start": "2025-09-29T22:00:00.000Z",
        //     "end": "2025-09-30T04:00:00.000Z",
        //     "notes": "Task2",
        // },
        {
            "start": "2025-09-29T20:00:00.000Z",
            "end": "2025-09-30T00:00:00.000Z",
            "notes": "Task1",
        },
        // {
        //     "start": "2025-10-01T23:00:00.000Z",
        //     "end": "2025-10-02T03:00:00.000Z",
        //     "notes": "Task3",
        // },
        // {
        //     "start": "2025-10-02T02:00:00.000Z",
        //     "end": "2025-10-02T05:00:00.000Z",
        //     "notes": "Task4",
        // },
    ];
    function processEvents (events) {
        let processedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
        processedEvents = processedEvents.map(event => {
            const startDate = new Date(event.start);
            const day = daysOfWeek[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1]; // getDay returns 0–6
            return { ...event, day };
        });

        for (let i = 0; i < processedEvents.length; i++) {
            let extraSlots = 0
            let numberOfLeftOverlapped = 0
            let numberOfRightOverlapped = 0
            for (let j = 0; j < processedEvents.length; j++) {
                if (i === j)
                {
                    continue
                }
                
                if (processedEvents[i].day === processedEvents[j].day) 
                {
                    const currentStart = new Date(processedEvents[i].start);
                    const otherStart = new Date(processedEvents[j].start);
                    
                    const diffMs = otherStart - currentStart; 
                    if (diffMs > 0) {
                        numberOfRightOverlapped ++;
                    } 
                    else 
                    {
                        numberOfLeftOverlapped ++;
                    }

                    const diffMinutes = Math.abs(diffMs) / (1000 * 60); // convert to minutes
                    
                    const slotDuration = 30; // minutes
                    const slotsDiff = diffMinutes / slotDuration;
                    processedEvents[i]["numberOfLeftOverlapped"] = numberOfLeftOverlapped
                    processedEvents[i]["numberOfRightOverlapped"] = numberOfRightOverlapped
                    processedEvents[i]["extraSlots"] = slotsDiff
                }
            }

        }
        console.log(processedEvents)


        return processedEvents
    }
    const processedEvents = processEvents(events)
    
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
                            { 
                                currentWeek.map(date => (
                                    <th className="calendarweek-header-row-day" colSpan={2}>
                                        <div>{date.getDay() - 1 >= 0 ? daysOfWeek[date.getDay() - 1] : daysOfWeek[6]}</div>
                                        <div>{date.getDate()}</div>
                                    </th>
                                ))
                            }
                        </tr>
                    </thead>
                    <tbody className="calendarweek-body">
                        {slots.map((slot, i) => (
                            <tr className="calendarweek-body-row" id={slot.label}>
                                {slot.minute === "00" && <td className="calendarweek-body-row-time" rowSpan="2">{`${slot.hour}:${slot.minute}`}</td>}
                                {currentWeek.map((day) => 
                                {
                                    const event = processedEvents.find((e) => {
                                        const eventStartDate = new Date(e.start);
                                        return (eventStartDate.getDate() === day.getDate() && 
                                                eventStartDate.getHours() == slot.hour && 
                                                eventStartDate.getMinutes() == parseInt(slot.minute,10))
                                    });

                                    if (event) {
                                        console.log(event)
                                        const eventStartDate = new Date(event.start);
                                        const eventEndDate = new Date(event.end);
                                        const diffMinutes = (eventEndDate - eventStartDate) / (1000 * 60);
                                        const slotDuration = 30;
                                        const slots = diffMinutes / slotDuration;
                                        
                                        return (
                                            <>
                                                <td className="calendarweek-body-row-day" rowSpan={slots} >
                                                    <div  style={{height: `${slots*40}px`}}>{event.notes}</div>
                                                </td>
                                                {/* {event.numberOfRightOverlapped !== 0 && (
                                                    <td
                                                        className="calendarweek-body-row-day"
                                                        rowSpan={event.extraSlots}
                                                    ></td>
                                                )} */}
                                            </>
                                        );
                                    }
                                    
                                    const insideEvent = processedEvents.some((e) =>{
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
                                        console.log(insideEvent)
                                        return null
                                    }

                                    return <td className="calendarweek-body-row-day" id={`${day.getDate()}-${slot.label}`} colSpan={2}></td>;
                                     
                                    
                                })}
                            </tr>
                        ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CalendarWeek;
