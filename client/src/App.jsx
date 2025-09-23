import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Welcome from './components/welcome/Welcome'
import RegisterUser from './components/register/RegisterUser'
import LogIn from './components/login/LogIn'
import RegisterOrganization from './components/register/RegisterOrganization'
import Dashboard from './components/dashboard/Dashboard'
import NavigationTab from './components/NavigationTab'
import UserProfile from './components/dashboard/Profile/UserProfile'
import BudgetReport from './components/dashboard/Budget/BudgetReporting'
import Header from './components/Header'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'

/* import all the icons in Free Solid, Free Regular, and Brands styles */
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

library.add(fas, far, fab)

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<LogIn/>}/>
      <Route path='/registeruser' element={<RegisterUser/>}/>
      <Route path='/login' element={<LogIn/>}/>
      <Route path='/registerorganization' element={<RegisterOrganization/>}/>
      <Route path='/dashboard' element={<Dashboard/>}/>
      {/* TODO: remove this route */}
      <Route path='/navigationtab' element={<NavigationTab/>}/>
      <Route path='/header' element={<Header/>}></Route>
      <Route path='/budgetReport' element={<BudgetReport/>}/>
      <Route path='/userprofile' element={<UserProfile/>}/>
    </Routes>
  )
}

export default App