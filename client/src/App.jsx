import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Welcome from './components/welcome/Welcome'
import RegisterUser from './components/register/RegisterUser'
import LogIn from './components/login/LogIn'
import RegisterOrganization from './components/register/RegisterOrganization'
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
      <Route path='/registeruser' element={<RegisterUser/>}/>
      <Route path='/login' element={<LogIn/>}/>
      <Route path='/registerorganization' element={<RegisterOrganization/>}/>
    </Routes>
  )
}

export default App