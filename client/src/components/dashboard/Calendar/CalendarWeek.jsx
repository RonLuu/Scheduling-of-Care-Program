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
            "end": "2025-09-30T03:00:00.000Z",
            "notes": "Task4",
        },
        {
            "start": "2025-09-30T01:00:00.000Z",
            "end": "2025-09-30T04:00:00.000Z",
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
        {
            "start": "2025-09-30T07:00:00.000Z",
            "end": "2025-09-30T08:00:00.000Z",
            "notes": "Task5",
        },
        {
            "start": "2025-09-29T21:00:00.000Z",
            "end": "2025-09-29T22:00:00.000Z",
            "notes": "Task8",
        },
        {
            "start": "2025-09-30T04:30:00.000Z",
            "end": "2025-09-30T05:30:00.000Z",
            "notes": "Task9",
        },
        {
            "start": "2025-09-30T05:00:00.000Z",
            "end": "2025-09-30T06:00:00.000Z",
            "notes": "Task10",
        },

        {
            "start": "2025-10-02T23:00:00.000Z",
            "end": "2025-10-03T00:00:00.000Z",
            "notes": "Task6",
        },
        {
            "start": "2025-10-06T00:00:00.000Z",
            "end": "2025-10-06T01:00:00.000Z",
            "notes": "Task7",
        },
        {
            "start": "2025-10-06T10:00:00.000Z",
            "end": "2025-10-06T11:00:00.000Z",
            "notes": "Team Sync",
        },
        {
            "start": "2025-10-06T04:30:00.000Z",
            "end": "2025-10-06T06:00:00.000Z",
            "notes": "Design Review",
        },
        {
            "start": "2025-10-07T01:00:00.000Z",
            "end": "2025-10-07T03:00:00.000Z",
            "notes": "Client Presentation",
        },
        {
            "start": "2025-10-07T05:00:00.000Z",
            "end": "2025-10-07T06:30:00.000Z",
            "notes": "Documentation",
        },
        {
            "start": "2025-10-08T02:00:00.000Z",
            "end": "2025-10-08T04:00:00.000Z",
            "notes": "Product Demo",
        },
        {
            "start": "2025-10-09T00:30:00.000Z",
            "end": "2025-10-09T02:30:00.000Z",
            "notes": "Team Brainstorm",
        },
        {
            "start": "2025-10-09T06:00:00.000Z",
            "end": "2025-10-09T07:00:00.000Z",
            "notes": "Sprint Retrospective",
        },
        {
            "start": "2025-10-10T01:00:00.000Z",
            "end": "2025-10-10T03:00:00.000Z",
            "notes": "1:1 Meeting",
        },
        {
            "start": "2025-10-11T04:00:00.000Z",
            "end": "2025-10-11T05:30:00.000Z",
            "notes": "Tech Deep Dive",
        },
        {
            "start": "2025-10-13T10:00:00.000Z",
            "end": "2025-10-13T16:00:00.000Z",
            "notes": "Weekly Wrap-Up",
        },
    ];

    function processEvents(events) {
        const dayTaskOverlapped = {};
        // A map that takes the event number, returns true if the event overlapped
        const eventNumber_isOverlapped = {};
        // Sort the events
        let processedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
        // A map that takes a date, and return every slots that have events in that date
        const date_EventSlot = {};
        // A number that identifies dates WITHIN a day
        const taskNumberToPosition = {}
        // A map that takes an event number, and return the number of overlapping events
        const eventNumOverLapped = {}

        // For every event
        for (let i = 0; i < processedEvents.length; i++) {
            const curEvent = processedEvents[i];
            const eventStartDate = new Date(curEvent.start);
            const eventEndDate = new Date(curEvent.end);
            if (eventStartDate.getDate() != eventEndDate.getDate())
            {
                let eventEndWithinADate = new Date(eventStartDate)
                while (eventEndWithinADate.getDate() != eventEndDate.getDate())
                {
                    eventEndWithinADate = new Date(eventEndWithinADate.getTime() + 30 * 60 * 1000);
                }
                const secondHalf = structuredClone(curEvent);
                secondHalf.start = eventEndWithinADate.toISOString()
                processedEvents.splice(i+1, 0, secondHalf)
                console.log(eventEndWithinADate)
                curEvent.end = eventEndWithinADate.toISOString()
            }
        }
        
        // Add a day to the events
        processedEvents = processedEvents.map(event => {
            const startDate = new Date(event.start);
            const day = daysOfWeek[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1];
            return { ...event, day };
        });

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
            // A map that takes a slot, returns a list of tasks
            let eventSlot_listEvents;
            // If the entire event's date already in the date_EventSlot
            // (There appears an event before)
            if (date_EventSlot[date]) {
                eventSlot_listEvents = date_EventSlot[date];
            } else {
                eventSlot_listEvents = {};
            }

            for (let j = 0; j < slots; j++) {
                const start = new Date(eventStartDate.getTime() + j * 30 * 60 * 1000);
                const end = new Date(start.getTime() + 30 * 60 * 1000);
                let slot = start.getMinutes() === 0 ? start.getHours() + ":00" : start.getHours() + ":30";
                const slotEvent = {
                    notes: curEvent.notes,
                    slot: slot,
                    eventNumber: i,
                    isHead: eventStartDate.getTime() == start.getTime(),
                    isTail: eventEndDate.getTime() == end.getTime()
                };

                // console.log("Current date", date, "\nSlot", slot,"\nEvent", slotEvent)
                // If there's an event that has the same slot (overlapping event)
                if (slot in eventSlot_listEvents) {
                    // console.log("Current date", date, "\nSlot", slot,"\nEvent", slotEvent)
                    // Get the list of all the events in that slot
                    const listOfEventsInASlot = eventSlot_listEvents[slot]
                    // Push the new event in that list
                    // console.log("Before: ", listOfEventsInASlot)
                    listOfEventsInASlot.push(slotEvent);
                    // console.log("Oh there's an event here before")
                    // console.log("After: ",listOfEventsInASlot)

                    // eventSlot_listEvents[id].forEach(e => eventNumber_isOverlapped[e.eventNumber] = true);

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
                        eventNumber_isOverlapped[currentEvent.eventNumber] = true

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
                    dayTaskOverlapped[date] = { ...eventNumber_isOverlapped };
                }
                else 
                {
                    // A new event in a new slot
                    // Create a list for that slot with the event                    
                    eventSlot_listEvents[slot] = [slotEvent]
                    // console.log("eventSlot_listEvents", eventSlot_listEvents)

                    // If the current event doesn't have a position yet
                    if (!(slotEvent.eventNumber in taskNumberToPosition)) {
                        // Set the position of that event to be zero, in respect to the current slot
                        taskNumberToPosition[slotEvent.eventNumber] = 0
                        eventNumber_isOverlapped[slotEvent.eventNumber] = false
                    }
                }
            }
            // Take the date and store all the slots that has an event 
            date_EventSlot[date] = eventSlot_listEvents;
            // console.log("After taskNumberToPosition:", taskNumberToPosition)
        }

        // console.log("taskNumberToPosition", taskNumberToPosition)
        // console.log("dayTaskOverlapped", dayTaskOverlapped)
        // For all the date that has events
        for (const date in date_EventSlot) {
            if (!Object.hasOwn(date_EventSlot, date)) continue;
            // Get the current date
            const curDate = date_EventSlot[date];
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
                    // console.log("Current event", event, "event position", eventPosition)
                    // console.log(dayTaskOverlapped)
                    // If the current event is overlapped
                    if (date in dayTaskOverlapped && event.eventNumber in dayTaskOverlapped[date]) {
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

                curDate[slot] = list;
            }
        }
        // console.log("eventNumOverLapped", eventNumOverLapped)
        return { date_EventSlot, dayTaskOverlapped, taskNumberToPosition, eventNumOverLapped };
    }

    const { date_EventSlot, dayTaskOverlapped, taskNumberToPosition, eventNumOverLapped } = processEvents(events);
    console.log(date_EventSlot)
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

    const slots = Array.from({ length: 24 }, (_,i) => {
        const h = i
        return h;
    });

    const getBorderRadius = (event) => {
        let borderRadius = ""
        if (event.isHead && event.isTail) {
            borderRadius = "5px 5px 5px 5px"
        }
        else if (event.isHead) {
            borderRadius = "5px 5px 0px 0px"
        }
        else if (event.isTail) {
            borderRadius = "0px 0px 5px 5px"
        }
        else {
            borderRadius = ""
        }

        return borderRadius
    }

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
                    <h2 className="calendarweek-title-month" style={{fontSize:"25px"}}>{calendarYear}</h2>
                    <h2 className="calendarweek-title-month" style={{fontSize:"25px"}}>{monthsOfYear[calendarMonth]}</h2>
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
                        <div style={{height: "6vh",
                            width: "100%",
                            borderBottom: "3px solid #DBE6F6",
                            color: "#2C3F70", fontSize: "18px", fontWeight: "1000",
                            display: "flex",
                            justifyContent: "center",
                        }}>Time</div>
                        {slots.map((slot) => (
                            <div className="slotTime" key={slot}>
                                <div className="slotTime-fullTime" style={{ color: "#8189D2", fontSize: "18px", fontWeight: "1000" }} key={slot +`:00`}>{slot +`:00`}</div>
                                <div className="slotTime-halfTime" key={ slot + `:30`}></div>
                            </div> 
                        ))}
                    </div>
                    <div className="calendarweek-content-day-wrapper">
                    {calendarWeek.map((date) => {
                        const dateMonthYear = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                        const dayWeek = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]
                        return <div className="calendarweek-content-day" key={dateMonthYear}>
                            <div className="headerDay">
                                <div className="dayWeek">{dayWeek}</div>
                                <div className="dateWeek">{date.getDate()}</div>
                            </div>
                            <div className="bodyDay">
                                {
                                    slots.map((slot) => { 
                                        const slotTimeFull = slot + ":00"
                                        const slotTimeHalf = slot + ":30"

                                        if (dateMonthYear in date_EventSlot) 
                                        {

                                            if (slotTimeFull in date_EventSlot[dateMonthYear] && slotTimeHalf in date_EventSlot[dateMonthYear])
                                            {
                                                const listOfEventsFull = date_EventSlot[dateMonthYear][slotTimeFull]
                                                const listOfEventsHalf = date_EventSlot[dateMonthYear][slotTimeHalf]

                                                return <div className="slotTime" key={slot}>
                                                    <div className="slotTime-fullTime-event" key={slot + `:00`}>
                                                        {listOfEventsFull.map((event) => {
                                                            let borderRadius = getBorderRadius(event)
                                                            if (event.notes === "empty") {
                                                                return <div className="emptyEvent"></div>
                                                            }
                                                            else {
                                                                return <div className="event" style={{ borderRadius: borderRadius}}  key={event.eventNumber}>{event.isHead ? event.notes : ""} </div>
                                                            }
                                                        })}
                                                    </div>
                                                    <div className="slotTime-halfTime-event" key={slot + `:30`}>
                                                        {listOfEventsHalf.map((event) => {
                                                            let borderRadius = getBorderRadius(event)
                                                            if (event.notes === "empty") {
                                                                return <div className="emptyEvent" style={{}}></div>
                                                            }
                                                            else {
                                                                return <div className="event" style={{ borderRadius: borderRadius }} key={event.eventNumber}>{event.isHead ? event.notes : ""}</div>
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            }
                                            
                                            if (slotTimeFull in date_EventSlot[dateMonthYear])
                                            {
                                                const listOfEventsFull = date_EventSlot[dateMonthYear][slotTimeFull]
                                                return <div className="slotTime" key={slot}>
                                                    <div className="slotTime-fullTime-event" key={slot + `:00`}>
                                                        {listOfEventsFull.map((event) => {
                                                            let borderRadius = getBorderRadius(event)

                                                            if (event.notes === "empty") {
                                                                return <div className="emptyEvent"></div>
                                                            }
                                                            else {
                                                                return <div className="event" style={{ borderRadius: borderRadius }} key={event.eventNumber}>{event.isHead ? event.notes : ""}</div>
                                                            }
                                                        })}
                                                    </div>
                                                    <div className="slotTime-halfTime-event" key={slot + `:30`}></div>
                                                </div>
                                            }

                                            if (slotTimeHalf in date_EventSlot[dateMonthYear]) {
                                                const listOfEventsHalf = date_EventSlot[dateMonthYear][slotTimeHalf]

                                                return <div className="slotTime" key={slot}>
                                                    <div className="slotTime-fullTime-event" key={slot + `:00`}></div>
                                                    <div className="slotTime-halfTime-event" key={slot + `:30`}>
                                                        {listOfEventsHalf.map((event) => {
                                                            let borderRadius = getBorderRadius(event)

                                                            if (event.notes === "empty") {
                                                                return <div className="emptyEvent"></div>
                                                            }
                                                            else {
                                                                return <div className="event" style={{ borderRadius: borderRadius }} key={event.eventNumber}>{event.isHead ? event.notes : ""}</div>
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            }
                                            
                                        }
                                        
                                        return <div className="slotTime" key={slot}>
                                            <div className="slotTime-fullTime-event" key={slot + `:00`}></div>
                                            <div className="slotTime-halfTime-event" key={slot + `:30`}></div>
                                        </div>

                                    })
                                }
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
