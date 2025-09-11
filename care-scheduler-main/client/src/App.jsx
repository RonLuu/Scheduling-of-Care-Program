import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Welcome from './pages/welcome'

// The central to direct pages
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
    </Routes>
  )
}

export default App