import { React, useState } from "react";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import "./CalendarWeek.css"
const CalendarWeek = () => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const monthsOfYear = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const events = [
        {
            "start": "2025-09-30T01:00:00.000Z",
            "end": "2025-09-30T02:00:00.000Z",
            "notes": "Task4",
        },
        {
            "start": "2025-09-30T01:00:00.000Z",
            "end": "2025-09-30T03:00:00.000Z",
            "notes": "Task3",
        },
        {
            "start": "2025-09-29T23:00:00.000Z",
            "end": "2025-09-30T02:00:00.000Z",
            "notes": "Task1",
        },

        {
            "start": "2025-09-30T00:00:00.000Z",
            "end": "2025-09-30T04:00:00.000Z",
            "notes": "Task2",
        },
        // {
        //     "start": "2025-09-30T04:00:00.000Z",
        //     "end": "2025-09-30T08:00:00.000Z",
        //     "notes": "Task3",
        // },

        // {
        //     "start": "2025-10-02T02:00:00.000Z",
        //     "end": "2025-10-02T05:00:00.000Z",
        //     "notes": "Task4",
        // },
    ];

    function processEvents(events) {
        // Sort the events
        let processedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
        // Add a day to the events
        processedEvents = processedEvents.map(event => {
            const startDate = new Date(event.start);
            const day = daysOfWeek[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1];
            return { ...event, day };
        });

        const dayTimeEvent = {};
        let taskNumber = 0
        // For every event
        for (let i = 0; i < processedEvents.length; i++) {
            const curEvent = processedEvents[i];
            const eventStartDate = new Date(curEvent.start);
            const eventEndDate = new Date(curEvent.end);

            const diffMinutes = (eventEndDate - eventStartDate) / (1000 * 60);
            const slotDuration = 30;
            const slots = diffMinutes / slotDuration;

            // Either get existing timeEvent or make a new one
            const date = eventStartDate.getDate().toString() + "/" + eventStartDate.getMonth().toString() + "/" + eventStartDate.getFullYear().toString()
            let timeEvent;
            if (dayTimeEvent[date]) {
                timeEvent = dayTimeEvent[date];
                taskNumber += 1
            } else {
                timeEvent = {};
                taskNumber = 0
            }   

            // Slice the current event into slots
            for (let j = 0; j < slots; j++) {
                const start = new Date(eventStartDate.getTime() + j * 30 * 60 * 1000);
                let id = start.getHours();

                if (start.getMinutes() === 0) {
                    id = id + ":00";
                } else {
                    id = id + ":30";
                }

                const object = {
                    notes: curEvent.notes,
                    id: id,
                    taskNumber: taskNumber,
                };

                if (id in timeEvent) {
                    timeEvent[id].push(object);
                } else {
                    timeEvent[id] = [object];
                }
            }

            dayTimeEvent[date] = timeEvent;
        }
        for (const day in dayTimeEvent) {
            if (!Object.hasOwn(dayTimeEvent, day)) continue;
            const curDay = dayTimeEvent[day]
            let numberOfOverlapped = 0
            // Finding the maximum number of overlapping events in a day
            for (const slot in curDay) {
                if (!Object.hasOwn(curDay, slot)) continue;
                numberOfOverlapped = Math.max(numberOfOverlapped, curDay[slot].length)
            }
            
            // For every slot in the current day
            for (const slot in curDay) {
                if (!Object.hasOwn(curDay, slot)) continue;
                // Get the list of tasks in that slot
                const listOfTasks = curDay[slot];
                // Continue if the list of tasks filled the slot
                if (listOfTasks.length === numberOfOverlapped) continue

                // Fill an array with "empty"
                const list = Array(numberOfOverlapped).fill("empty");

                for (const task of listOfTasks) {
                    list[task.taskNumber] = task;
                }

                curDay[slot] = list;
            }
        }

        return dayTimeEvent
    }

    const processedEvents = processEvents(events)
    const currentDate = new Date()
    const [calendarDate, setCalendarDate] = useState(currentDate)
    const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
    const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

    function getMondayDate() {
        // Convert the day index such that Monday is at the zero index
        const dayIndex = calendarDate.getDay() === 0 ? 6 : calendarDate.getDay() - 1;
        const calendarMonday = new Date(calendarDate);
        calendarMonday.setDate(calendarDate.getDate() - dayIndex)
        return calendarMonday
    }

    const getCalendarWeek = (date) => {
        // Return the list of date in the calendar week
        const calendarMondayDate = getMondayDate(date)
        return Array.from({ length: 7 }, (_, i) => {
            const calendarDayDate = new Date(calendarMondayDate)
            calendarDayDate.setDate(calendarMondayDate.getDate() + i);
            return calendarDayDate;
        });
    };

    const [calendarWeek, setCalendarWeek] = useState(getCalendarWeek())

    const slots = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return { hour: h, minute: m, label: `${h}:${m}` };
    });

    const prevWeek = () => {
        const newDate = new Date(calendarDate)
        newDate.setDate(newDate.getDate() - 7)
        setCalendarDate(newDate)

        const calendarMondayDate = getMondayDate(newDate)
        setCalendarWeek(getCalendarWeek(newDate))
        setCalendarMonth(calendarMondayDate.getMonth())
        setCalendarYear(calendarMondayDate.getFullYear())
    }

    const nextWeek = () => {
        console.log("Before: ",calendarDate)
        const newDate = new Date(calendarDate)
        newDate.setDate(newDate.getDate() + 7)
        setCalendarDate(newDate)
        
        const calendarMondayDate = getMondayDate(newDate)
        setCalendarWeek(getCalendarWeek(newDate))
        setCalendarMonth(calendarMondayDate.getMonth())
        setCalendarYear(calendarMondayDate.getFullYear())
        console.log("After: ",calendarDate)
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
                    <h2 className="calendarweek-title-month">{getMondayDate(calendarDate).getFullYear()}</h2>
                    <h2 className="calendarweek-title-month">{monthsOfYear[getMondayDate(calendarDate).getMonth()]}</h2>
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
                                calendarWeek.map(date => (
                                    <th className="calendarweek-header-row-day" colSpan="1">
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
                                {calendarWeek.map((date) => {
                                    const dateMonthYear = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear() 
                                    if (dateMonthYear in processedEvents && slot.label in processedEvents[dateMonthYear]) {
                                        return <td style={{ background: "red", borderBottom:"none" }} className="calendarweek-body-row-day" id={`${date.getDate()}-${slot.label}`}></td>;
                                    }

                                    return <td className="calendarweek-body-row-day" id={`${dateMonthYear}-${slot.label}`}></td>;


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
