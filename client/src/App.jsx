import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Welcome from './components/welcome/Welcome'
import Register from './components/register/Register'
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
      <Route path='/api/register' element={<Register/>}/>
    </Routes>
  )
}

export default App