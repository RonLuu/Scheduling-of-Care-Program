import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "./components/dashboard/hooks/useAuth";

// Public pages
import Welcome from "./components/welcome/Welcome";
import RegisterUser from "./components/register/RegisterUser";
import LogIn from "./components/login/LogIn";
import RegisterOrganization from "./components/register/RegisterOrganization";

// Authenticated route pages (create these as shown earlier)
import ProfilePage from "./components/dashboard/pages/ProfilePage";
import AccessPage from "./components/dashboard/pages/AccessPage";
import ClientsPage from "./components/dashboard/pages/ClientsPage";
import ShiftPage from "./components/dashboard/pages/ShiftPage";
import SubElementsPage from "./components/dashboard/pages/SubElementsPage";
import TasksPage from "./components/dashboard/pages/TasksPage";
import BudgetPage from "./components/dashboard/pages/BudgetPage";
import FAQPage from "./components/dashboard/pages/FAQPage";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";

/* import all the icons in Free Solid, Free Regular, and Brands styles */
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

const App = () => {
  const { me, isReady } = useAuth();
  const RequireAuth = ({ children }) => {
    if (!isReady) return null; // or a spinner component
    return me ? children : <Navigate to="/login" replace />;
  };
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/registeruser" element={<RegisterUser />} />
      <Route path="/registerorganization" element={<RegisterOrganization />} />
      <Route path="/login" element={<LogIn />} />

      {/* Authenticated app routes */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/access"
        element={
          <RequireAuth>
            <AccessPage />
          </RequireAuth>
        }
      />
      <Route
        path="/clients"
        element={
          <RequireAuth>
            <ClientsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/shift-allocation"
        element={
          <RequireAuth>
            <ShiftPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sub-elements"
        element={
          <RequireAuth>
            <SubElementsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks"
        element={
          <RequireAuth>
            <TasksPage />
          </RequireAuth>
        }
      />
      <Route
        path="/budget-reports"
        element={
          <RequireAuth>
            <BudgetPage />
          </RequireAuth>
        }
      />
      <Route
        path="/faq"
        element={
          <RequireAuth>
            <FAQPage />
          </RequireAuth>
        }
      />
      <Route path="/faq" element={<FAQPage />} />

      {/* Redirects */}
      {/* If logged in and they hit root again, push to /profile */}
      <Route
        path="*"
        element={
          me ? (
            <Navigate to="/profile" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
