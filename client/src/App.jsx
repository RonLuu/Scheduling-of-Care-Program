// App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuth from "./components/dashboard/hooks/useAuth";

// Public pages
import RegisterUser from "./components/register/RegisterUser";
import LogIn from "./components/login/LogIn";
import ForgotPassword from "./components/login/ForgotPassword";
import RegisterOrganization from "./components/register/RegisterOrganization";

// Authenticated route pages (create these as shown earlier)
import ProfilePage from "./components/dashboard/pages/ProfilePage";
import OrganizationPage from "./components/dashboard/pages/OrganizationPage";
import AccessPage from "./components/dashboard/pages/AccessPage";
import ClientsPage from "./components/dashboard/pages/ClientsPage";
import ShiftPage from "./components/dashboard/pages/ShiftPage";
import SubElementsPage from "./components/dashboard/pages/SubElementsPage";
import TasksPage from "./components/dashboard/pages/TasksPage";
import TasksPageNew from "./components/dashboard/pages/TasksPageNew";
import TaskCompletionPage from "./components/dashboard/pages/TaskCompletionPage";
import BudgetPage from "./components/dashboard/pages/BudgetPage";
import BudgetAndReportsPage from "./components/dashboard/pages/BudgetAndReportsPage";
import PlanForNextYear from "./components/dashboard/pages/PlanForNextYear";
import Dashboard from "./components/dashboard/pages/Dashboard";

import PrintButton from "./components/PrintButton";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";

/* import all the icons in Free Solid, Free Regular, and Brands styles */
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

const App = () => {
  const { me, isReady } = useAuth();

  const location = useLocation();
  // Don't show print button on login/register pages
  const shouldShowPrintButton =
    me &&
    ![
      "/login",
      "/register",
      "/registerorganization",
      "/forgot-password",
    ].includes(location.pathname);

  // Prevent mouse wheel from changing number input values
  React.useEffect(() => {
    const preventNumberInputScroll = (e) => {
      // Check if the active element is a number input
      if (document.activeElement.type === "number") {
        e.preventDefault();
      }
    };

    // Add event listener to prevent wheel events on focused number inputs
    document.addEventListener("wheel", preventNumberInputScroll, {
      passive: false,
    });

    return () => {
      document.removeEventListener("wheel", preventNumberInputScroll);
    };
  }, []);

  const RequireAuth = ({ children }) => {
    if (!isReady) return null; // or a spinner component
    return me ? children : <Navigate to="/login" replace />;
  };
  return (
    <>
      <div id="app-content">
        <Routes>
          {/* Root route */}
          <Route
            path="/"
            element={
              me ? (
                me.role === "Family" ||
                me.role === "Admin" ||
                me.role === "PoA" ||
                me.role === "GeneralCareStaff" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/profile" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Public routes */}
          <Route path="/register" element={<RegisterUser />} />
          <Route
            path="/registerorganization"
            element={<RegisterOrganization />}
          />
          <Route path="/login" element={<LogIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Authenticated app routes */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/organization"
            element={
              <RequireAuth>
                <OrganizationPage />
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
                <TasksPageNew />
              </RequireAuth>
            }
          />
          <Route
            path="/tasks-new"
            element={
              <RequireAuth>
                <TasksPageNew />
              </RequireAuth>
            }
          />
          <Route
            path="/tasks/:taskId/complete"
            element={
              <RequireAuth>
                <TaskCompletionPage />
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
            path="/budget-and-reports"
            element={
              <BudgetAndReportsPage />

              // <RequireAuth>
              //   <BudgetAndReportsPage />
              // </RequireAuth>
            }
          />
          <Route
            path="/budget-planning"
            element={
              <RequireAuth>
                <BudgetAndReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/budget-planning/plan-future"
            element={
              <RequireAuth>
                <PlanForNextYear />
              </RequireAuth>
            }
          />

          {/* Redirects */}
          {/* Catch-all route based on user role */}
          <Route
            path="*"
            element={
              me ? (
                me.role === "Family" ||
                me.role === "Admin" ||
                me.role === "PoA" ||
                me.role === "GeneralCareStaff" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/profile" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>

      {/* Global print button */}
      {shouldShowPrintButton && (
        <PrintButton
          targetId="app-content"
          fileName={`${location.pathname.slice(1) || "page"}-capture`}
        />
      )}
    </>
  );
};

export default App;
