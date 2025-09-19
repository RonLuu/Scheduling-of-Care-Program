import React, { useState } from 'react'
import { BiMenu, BiSolidDashboard, BiCalendar, BiGroup, BiTask, BiUser, BiExit } from "react-icons/bi";
import { Link } from 'react-router-dom';
import "../styles/NavigationTab.css"
const NavigationTab = () => {
    const [showTab, setShowTab] = useState(true)
    return (
        <div className={`navigationtab-panel ${showTab ? "on" : "off"}`}>
            <div className='navigationtab-button-menu-wrapper'>
                <button
                    // TODO change the size of the icon
                    className={`navigationtab-button-menu ${showTab ? "on" : "off"}`}
                    onClick={() => setShowTab(!showTab)}>
                    <BiMenu />
                </button>
            </div>
            {
                showTab ? 
                (
                    <div className='navigationtab-button-link-wrapper'>
                        {/* Add URL to these Link */}
                        <Link to="/faq" className='navigationtab-link'><BiSolidDashboard className='navigationtab-icon'/>FAQ</Link>
                        <Link to="/calendar" className='navigationtab-link'><BiCalendar className='navigationtab-icon'/>Calendar</Link>
                        <Link to="/budgetreport" className='navigationtab-link'><BiGroup className='navigationtab-icon'/>Budget reports</Link>
                        <Link to="/tasks" className='navigationtab-link'><BiTask className='navigationtab-icon'/>Tasks</Link>
                        <Link to="/profile" className='navigationtab-link'><BiUser className='navigationtab-icon'/>Profile</Link>
                        <Link to="/logout" className='navigationtab-link'><BiExit className='navigationtab-icon'/>Logout</Link>
                    </div>
                )
                :
                (
                    <></>
                )
            }
        </div>
    )
}

export default NavigationTab