import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, redirect, Navigate} from 'react-router-dom'
import App from './App'
import Login from "./pages/Login";

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },  // root shows login
  { path: '/login', element: <Login /> },
  { path: '/app', element: <App /> },                        // main app here
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
