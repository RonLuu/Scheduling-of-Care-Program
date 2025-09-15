import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Welcome from './components/welcome/Welcome'
import RegisterUser from './components/register/RegisterUser'
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
      <Route path='/registeruser' element={<RegisterUser/>}/>
    </Routes>
  )
}

export default App