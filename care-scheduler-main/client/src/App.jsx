import { Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Register from './pages/register'
// The central to access other pages
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Welcome/>}/>
      <Route path='/api/register' element={<Register/>}/>
    </Routes>
  )
}

export default App