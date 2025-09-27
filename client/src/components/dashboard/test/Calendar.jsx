import React, { useState } from 'react'
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import { BiX } from "react-icons/bi";
import CalendarMonth from "./CalendarMonth"
import "./Calendar.css"
import CalendarWeek from './CalendarWeek';
const Calendar = () => {
    return (
    <div className="calendar-wrapper">
        <div className="calendar-header">

        </div>
        
        <div className="calendar-body">
            <div className="calendar-body-month">
                <CalendarMonth></CalendarMonth>
            </div>
            <div className="calendar-body-week">
                <CalendarWeek></CalendarWeek>
            </div>

        </div>
        
    </div>)
}

export default Calendar