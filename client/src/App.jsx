import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Welcome from './components/welcome/Welcome'
import RegisterUser from './components/register/RegisterUser'
import LogIn from './components/login/LogIn'
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
      <Route path='/registeruser' element={<RegisterUser/>}/>
      <Route path='/login' element={<LogIn/>}/>
    </Routes>
  )
}

export default App