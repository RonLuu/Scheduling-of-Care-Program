import React, { useState } from 'react'
import '../css/global_style.css'
import { Link, useNavigate } from "react-router-dom";

function Header({me}) {
    const navigate = useNavigate();
    return (
        <header className='header'>
            <div>Menu</div>
            <p>hello</p>

            <Link to='/dashboard'>{me.name}</Link>
        </header>
    )
}

export default Header