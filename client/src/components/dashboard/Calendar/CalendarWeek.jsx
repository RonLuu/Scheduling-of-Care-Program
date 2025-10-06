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

            const date = `${eventStartDate.getDate()}/${eventStartDate.getMonth()}/${ eventStartDate.getFullYear()}`;
            let timeEvent;
            if (dayTimeEvent[date]) {
                timeEvent = dayTimeEvent[date];
                taskNumber += 1;
            } else {
                timeEvent = {};
                taskNumber = 0;
            }

            for (let j = 0; j < slots; j++) {
                const start = new Date(eventStartDate.getTime() + j * 30 * 60 * 1000);
                let id = start.getHours();

                id = start.getMinutes() === 0 ? id + ":00" : id + ":30";

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
            const curDay = dayTimeEvent[day];
            let numberOfOverlapped = 0;

            for (const slot in curDay) {
                if (!Object.hasOwn(curDay, slot)) continue;
                numberOfOverlapped = Math.max(numberOfOverlapped, curDay[slot].length);
            }

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

    return dayTimeEvent;
}

    const processedEvents = processEvents(events);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(calendarDate.getMonth());
    const [calendarYear, setCalendarYear] = useState(calendarDate.getFullYear());

    function getMondayDate(date) {
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const calendarMonday = new Date(date);
        calendarMonday.setDate(date.getDate() - dayIndex);
        return calendarMonday;
    }

    const getCalendarWeek = (date) => {
        const calendarMondayDate = getMondayDate(date);
        return Array.from({ length: 7 }, (_, i) => {
            const calendarDayDate = new Date(calendarMondayDate);
            calendarDayDate.setDate(calendarMondayDate.getDate() + i);
            return calendarDayDate;
        });
    };

    const [calendarWeek, setCalendarWeek] = useState(getCalendarWeek(calendarDate));

    const slots = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return { hour: h, minute: m, label: `${h}:${m}` };
    });

    const prevWeek = () => {
        const newDate = new Date(calendarDate);
        newDate.setDate(newDate.getDate() - 7);
        setCalendarDate(newDate);

        const calendarMondayDate = getMondayDate(newDate);
        setCalendarWeek(getCalendarWeek(newDate));
        setCalendarMonth(calendarMondayDate.getMonth());
        setCalendarYear(calendarMondayDate.getFullYear());
    };

    const nextWeek = () => {
        const newDate = new Date(calendarDate);
        newDate.setDate(newDate.getDate() + 7);
        setCalendarDate(newDate);

        const calendarMondayDate = getMondayDate(newDate);
        setCalendarWeek(getCalendarWeek(newDate));
        setCalendarMonth(calendarMondayDate.getMonth());
        setCalendarYear(calendarMondayDate.getFullYear());
    };

    return (
        <div className="calendarweek">
            <div className="calendarweek-title">
                <div className="calendarweek-title-button-wrapper">
                    <button className="calendarweek-title-button" onClick={prevWeek}>
                        <SlArrowLeft className="calendarweek-title-icon" />
                    </button>
                </div>
                <div className="calendarweek-title-month-wrapper">
                    <h2 className="calendarweek-title-month">{calendarYear}</h2>
                    <h2 className="calendarweek-title-month">{monthsOfYear[calendarMonth]}</h2>
                </div>
                <div className="calendarweek-title-button-wrapper">
                    <button className="calendarweek-title-button" onClick={nextWeek}>
                        <SlArrowRight className="calendarweek-title-icon" />
                    </button>
                </div>
            </div>
            <div className="calendarweek-content-wrapper">
                <table className="calendarweek-content">
                    <thead className="calendarweek-header">
                        <tr className="calendarweek-header-row">
                            <th className="calendarweek-header-row-time">Time</th>
                            {
                                calendarWeek.map((date) => (
                                <th key={date.toISOString()} className="calendarweek-header-row-day">
                                    <div>{date.getDay() - 1 >= 0 ? daysOfWeek[date.getDay() - 1] : daysOfWeek[6]}</div>
                                    <div>{date.getDate()}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="calendarweek-body">
                        {slots.map((slot) => (
                            <tr key={slot.label} className="calendarweek-body-row" id={slot.label}>
                                {slot.minute === "00" && (
                                    <td className="calendarweek-body-row-time" rowSpan="2">{`${ slot.hour }:${ slot.minute } `}</td>
                                )}
                                {calendarWeek.map((date) => {
                                    const dateMonthYear = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`;
                                    if (dateMonthYear in processedEvents && slot.label in processedEvents[dateMonthYear]) {
                                        return (
                                            <td
                                                key={`${ dateMonthYear } -${ slot.label } `}
                                                style={{ background: "red", borderBottom: "none" }}
                                                className="calendarweek-body-row-day"
                                            ></td>
                                        );
                                    }
                                    return (
                                        <td
                                            key={`${ dateMonthYear } -${ slot.label } `}
                                            className="calendarweek-body-row-day"
                                        ></td>
                                    );
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
