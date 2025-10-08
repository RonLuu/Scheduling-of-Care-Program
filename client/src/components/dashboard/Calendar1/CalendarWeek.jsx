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
        // {
        //     "start": "2025-09-30T01:00:00.000Z",
        //     "end": "2025-09-30T03:00:00.000Z",
        //     "notes": "Task4",
        // },
        // {
        //     "start": "2025-09-30T01:00:00.000Z",
        //     "end": "2025-09-30T04:00:00.000Z",
        //     "notes": "Task3",
        // },
        // {
        //     "start": "2025-09-29T23:00:00.000Z",
        //     "end": "2025-09-30T02:00:00.000Z",
        //     "notes": "Task1",
        // },

        // {
        //     "start": "2025-09-30T00:00:00.000Z",
        //     "end": "2025-09-30T04:00:00.000Z",
        //     "notes": "Task2",
        // },
        // {
        //     "start": "2025-09-30T07:00:00.000Z",
        //     "end": "2025-09-30T08:00:00.000Z",
        //     "notes": "Task5",
        // },
        // {
        //     "start": "2025-09-29T21:00:00.000Z",
        //     "end": "2025-09-29T22:00:00.000Z",
        //     "notes": "Task8",
        // },
        // {
        //     "start": "2025-09-30T04:30:00.000Z",
        //     "end": "2025-09-30T05:30:00.000Z",
        //     "notes": "Task9",
        // },
        // {
        //     "start": "2025-09-30T05:00:00.000Z",
        //     "end": "2025-09-30T06:00:00.000Z",
        //     "notes": "Task10",
        // },

        {
            "start": "2025-10-02T23:00:00.000Z",
            "end": "2025-10-03T01:00:00.000Z",
            "notes": "Task6",
        },
        // {
        //     "start": "2025-10-03T00:00:00.000Z",
        //     "end": "2025-10-03T01:00:00.000Z",
        //     "notes": "Task7",
        // },
        // {
        //     "start": "2025-10-06T00:00:00.000Z",
        //     "end": "2025-10-06T02:00:00.000Z",
        //     "notes": "Team Sync",
        // },
        // {
        //     "start": "2025-10-06T04:30:00.000Z",
        //     "end": "2025-10-06T06:00:00.000Z",
        //     "notes": "Design Review",
        // },
        // {
        //     "start": "2025-10-07T01:00:00.000Z",
        //     "end": "2025-10-07T03:00:00.000Z",
        //     "notes": "Client Presentation",
        // },
        // {
        //     "start": "2025-10-07T05:00:00.000Z",
        //     "end": "2025-10-07T06:30:00.000Z",
        //     "notes": "Documentation",
        // },
        // {
        //     "start": "2025-10-08T02:00:00.000Z",
        //     "end": "2025-10-08T04:00:00.000Z",
        //     "notes": "Product Demo",
        // },
        // {
        //     "start": "2025-10-09T00:30:00.000Z",
        //     "end": "2025-10-09T02:30:00.000Z",
        //     "notes": "Team Brainstorm",
        // },
        // {
        //     "start": "2025-10-09T06:00:00.000Z",
        //     "end": "2025-10-09T07:00:00.000Z",
        //     "notes": "Sprint Retrospective",
        // },
        // {
        //     "start": "2025-10-10T01:00:00.000Z",
        //     "end": "2025-10-10T03:00:00.000Z",
        //     "notes": "1:1 Meeting",
        // },
        // {
        //     "start": "2025-10-11T04:00:00.000Z",
        //     "end": "2025-10-11T05:30:00.000Z",
        //     "notes": "Tech Deep Dive",
        // },
        // {
        //     "start": "2025-10-12T22:00:00.000Z",
        //     "end": "2025-10-12T23:30:00.000Z",
        //     "notes": "Weekly Wrap-Up",
        // },
    ];

    function processEvents(events) {
        const dayTaskOverlapped = {};
        // A map that takes the event number, returns true if the event overlapped
        const eventOverlapped = {};
        // Sort the events
        let processedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
        // A map that takes a date, and return every slots that have events in that date
        const dateTimeEvent = {};
        // A number that identifies dates WITHIN a day
        const taskNumberToPosition = {}
        // A map that takes an event number, and return the number of overlapping events
        const eventNumOverLapped = {}

        // Add a day to the events
        processedEvents = processedEvents.map(event => {
            const startDate = new Date(event.start);
            const day = daysOfWeek[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1];
            return { ...event, day };
        });

        // console.log("Processing events")

        // For every event
        for (let i = 0; i < processedEvents.length; i++) {
            const curEvent = processedEvents[i];
            const eventStartDate = new Date(curEvent.start);
            const eventEndDate = new Date(curEvent.end);

            const diffMinutes = (eventEndDate - eventStartDate) / (1000 * 60);
            const slotDuration = 30;
            const slots = diffMinutes / slotDuration;

            // Get the date of that event
            const date = `${eventStartDate.getDate()}/${eventStartDate.getMonth() + 1}/${eventStartDate.getFullYear()}`;
            
            let timeEvent;
            // If the entire event's date already in the dateTimeEvent
            // (There appears an event before)
            if (dateTimeEvent[date]) {
                timeEvent = dateTimeEvent[date];
                // eventNumber += 1;
            } else {
                timeEvent = {};
                // eventNumber = 0;
            }

            for (let j = 0; j < slots; j++) {
                const start = new Date(eventStartDate.getTime() + j * 30 * 60 * 1000);
                let slot = start.getMinutes() === 0 ? start.getHours() + ":00" : start.getHours() + ":30";
                const slotEvent = {
                    notes: curEvent.notes,
                    slot: slot,
                    eventNumber: i,
                };

                // console.log("Current date", date, "\nSlot", slot,"\nEvent", slotEvent)
                // If there's an event that has the same slot (overlapping event)
                if (slot in timeEvent) {
                    // console.log("Current date", date, "\nSlot", slot,"\nEvent", slotEvent)
                    // Get the list of all the events in that slot
                    const listOfEventsInASlot = timeEvent[slot]
                    // Push the new event in that list
                    // console.log("Before: ", listOfEventsInASlot)
                    listOfEventsInASlot.push(slotEvent);
                    // console.log("Oh there's an event here before")
                    // console.log("After: ",listOfEventsInASlot)

                    // timeEvent[id].forEach(e => eventOverlapped[e.eventNumber] = true);

                    // console.log("Processing each event ")
                    // For all the events (including the current event)
                    for (let i = 0; i < listOfEventsInASlot.length; i++) {
                        // Get the current event 
                        const currentEvent = listOfEventsInASlot[i]
                        if (!(currentEvent.eventNumber in eventNumOverLapped)) {
                            eventNumOverLapped[currentEvent.eventNumber] = listOfEventsInASlot.length;
                        }
                        else {
                            eventNumOverLapped[currentEvent.eventNumber] = Math.max(eventNumOverLapped[currentEvent.eventNumber], listOfEventsInASlot.length)
                            // console.log("Inside the if eventNumOverLapped", eventNumOverLapped)
                            // console.log("Inside the if eventNumOverLapped", eventNumOverLapped[currentEvent.eventNumber])
                        }
                        // console.log("currentEvent", currentEvent, "at slot", slot)
                        // Remember the current event is overlapped by its event number 
                        eventOverlapped[currentEvent.eventNumber] = true

                        if (!(currentEvent.eventNumber in taskNumberToPosition)) {
                            // console.log("listOfEventsInASlot", listOfEventsInASlot)
                            const prevEvent = listOfEventsInASlot[i - 1]
                            // console.log("prev Event is ", prevEvent)
                            const prevEventPosition = taskNumberToPosition[prevEvent.eventNumber]
                            // console.log("prev Event position is ", prevEventPosition)
                            taskNumberToPosition[slotEvent.eventNumber] = prevEventPosition + 1
                            // console.log("current Event position is ", taskNumberToPosition[slotEvent.eventNumber])
                            // console.log("Updateing taskNumberToPosition:", taskNumberToPosition)
                        }
                    }
                    // Take the current date and store all the overlapped tasks
                    dayTaskOverlapped[date] = { ...eventOverlapped };
                }
                else {
                    // A new event in a new slot
                    // Create a list for that slot with the event                    
                    timeEvent[slot] = [slotEvent]
                    // console.log("timeEvent", timeEvent)

                    // If the current event doesn't have a position yet
                    if (!(slotEvent.eventNumber in taskNumberToPosition)) {
                        // Set the position of that event to be zero, in respect to the current slot
                        taskNumberToPosition[slotEvent.eventNumber] = 0
                        eventOverlapped[slotEvent.eventNumber] = false
                    }
                }
            }
            // Take the date and store all the slots that has an event 
            dateTimeEvent[date] = timeEvent;
            // console.log("After taskNumberToPosition:", taskNumberToPosition)
        }
        // console.log("taskNumberToPosition", taskNumberToPosition)
        // For all the date that has events
        for (const date in dateTimeEvent) {
            if (!Object.hasOwn(dateTimeEvent, date)) continue;
            // Get the current date
            const curDate = dateTimeEvent[date];
            // The maximum number of overlapped IN a day
            let maxNumberOverlappedInDay = 0;
            for (const slot in curDate) {
                if (!Object.hasOwn(curDate, slot)) continue;
                maxNumberOverlappedInDay = Math.max(maxNumberOverlappedInDay, curDate[slot].length);
            }

            // For every slot that HAS events in the current date
            for (const slot in curDate) {
                if (!Object.hasOwn(curDate, slot)) continue;
                // Get the list of events in that slot
                const listOfEvents = curDate[slot];
                // Continue if the list of events filled the slot
                // if (listOfTasks.length === numberOfOverlapped) continue
                // Fill an array with "empty"
                // let currentNumberOverlappedInDay = 0
                let list = Array(eventNumOverLapped[listOfEvents[0].eventNumber]).fill({
                    notes: "empty",
                    maxNumberOverlappedInDay: eventNumOverLapped[listOfEvents[0].eventNumber]
                });
                // For every event in the list of events
                for (const event of listOfEvents) {
                    // Get the event position of the event
                    const eventPosition = taskNumberToPosition[event.eventNumber]
                    console.log("Current event", event, "event position", eventPosition)
                    console.log(dayTaskOverlapped)
                    // If the current event is overlapped
                    if (dayTaskOverlapped[date][event.eventNumber]) {
                        // Set the maximum number of overlapped in a day to the event
                        event.maxNumberOverlappedInDay = maxNumberOverlappedInDay
                        list[eventPosition] = event;
                    }
                    else {
                        // There's exactly one event
                        // console.log(event, "not overlapped")
                        list = [event];

                    }
                }
                // console.log("Before listOfEvents", listOfEvents, "\nAfter listOfEvents", list)

                for (const event of list) {

                }
                curDate[slot] = list;
            }
        }
        // console.log("eventNumOverLapped", eventNumOverLapped)
        return { dateTimeEvent, dayTaskOverlapped, taskNumberToPosition, eventNumOverLapped };
    }

    const { dateTimeEvent, dayTaskOverlapped, taskNumberToPosition, eventNumOverLapped } = processEvents(events);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(calendarDate.getMonth());
    const [calendarYear, setCalendarYear] = useState(calendarDate.getFullYear());
    console.log("dateTimeEvent", dateTimeEvent)
    console.log("dayTaskOverlapped", dayTaskOverlapped)
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
                <div className="calendarweek-content">
                    <div className="calendarweek-content-time-wrapper">
                        <div style={{
                            height: "60px",
                            width: "100%",
                            border: "3px solid #DBE6F6",
                            color: "#2C3F70", fontSize: "18px", fontWeight: "1000",
                            display: "flex",
                            justifyContent: "center",
                        }}>Time</div>
                        {slots.map((slot) => (
                            slot.minute === "00"
                                ? <div className="slotTime-fullTime" style={{ color: "#8189D2", fontSize: "18px", fontWeight: "1000" }} key={slot.label}>{slot.label}</div>
                                : <div className="slotTime-halfTime" key={slot.label}></div>
                        ))}
                    </div>
                    <div className="calendarweek-content-day">
                        {calendarWeek.map((date) => {
                            const dateMonthYear = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            const dayWeek = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]
                            return <div className="day" key={dateMonthYear}>
                                <div className="headerDay">
                                    <div className="dayWeek"
                                        style={{
                                            height: "30px",
                                        }}>{dayWeek}</div>
                                    <div className="dateWeek"
                                        style={{
                                            height: "30px",
                                        }}>{date.getDate()}</div>
                                </div>
                                <div className="bodyDay">
                                    {
                                        slots.map((slot) => {
                                            if (dateMonthYear in dateTimeEvent && slot.label in dateTimeEvent[dateMonthYear]) {
                                                const listOfEvents = dateTimeEvent[dateMonthYear][slot.label]
                                                console.log("current list", listOfEvents)
                                                return <div className={`slotTime-${slot.minute === "00" ? "fullTime" : "halfTime"}Event`}
                                                    key={dateMonthYear + slot.label}
                                                    style={{ borderColor: "white" }}>
                                                    {listOfEvents.map((event, i) => {
                                                        if (event.notes === "empty") {
                                                            return <div className="emptyEvent" style={{ }}></div>
                                                        }
                                                        else {
                                                            return <div className="event">{event.notes}</div>
                                                        }
                                                    })}
                                                </div>
                                            }

                                            return <div className={`slotTime-${slot.minute === "00" ? "fullTime" : "halfTime"}Event`} key={dateMonthYear + slot.label} />
                                        }
                                        )}
                                </div>
                            </div>
                        }
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarWeek;
