import React, { useState } from 'react'
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import { BiX } from "react-icons/bi";
import "./CalendarMonth.css"
const CalendarMonth = () => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const monthsOfYear = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentDate = new Date()
    const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
    const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const prevMonth = () => {
        setCurrentMonth((prevMonth) => (prevMonth === 0 ? 11 : prevMonth - 1))
        setCurrentYear((prevYear) => (currentMonth === 0 ? prevYear - 1 : prevYear))
    }

    const nextMonth = () => {
        setCurrentMonth((nextMonth) => (nextMonth === 11 ? 0 : nextMonth + 1))
        setCurrentYear((nextYear) => (currentMonth === 11 ? nextYear + 1 : nextYear))
    }
    return (
        <div className="calendar">
            <div className="navigate-date">
                <h2 className="month">{monthsOfYear[currentMonth]}</h2>
                <h2 className="year">{currentYear}</h2>
                <div className="buttons">
                    <SlArrowLeft className='icon' onClick={prevMonth} />
                    <SlArrowRight className='icon' onClick={nextMonth} />
                </div>
            </div>
            <div className="month-view">
                <div className="weekdays">
                    {daysOfWeek.map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="days">
                    {[...Array(firstDayOfMonth).keys()].map((_, index) => <span key={`empty-${index}`}></span>)}
                    {[...Array(daysInMonth).keys()].map((day) =>
                        <span key={day + 1} className={day + 1 === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear() ? 'current-day' : ''}>{day + 1}</span>)}
                </div>
            </div>
        </div>
    )
}

export default CalendarMonth