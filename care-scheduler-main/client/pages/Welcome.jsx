import React from 'react'
import { Link } from 'react-router-dom'

const welcome = () => {
  return (
    <header>
      <div>
        <strong>Care Program</strong>
        <span style={{opacity: 0.7}}>· Care Item & Care Task</span>
      </div>
      <nav>
        <a href="#" id="nav-login">Login</a>
        {/* <a href="#" id="nav-register">Register</a> */}
        <Link to='/api/register'>Register</Link>
        <a href="#" id="nav-dashboard">Dashboard</a>
      </nav>
    </header>
  )
}

export default welcome