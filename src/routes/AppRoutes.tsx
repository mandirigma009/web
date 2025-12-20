import { Routes, Route } from "react-router-dom";

import App from "../pages/App";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import AdminDashboard from "../pages/AdminDashboard";
import { ProtectedRoute } from "../components/ProtectedRoute";
import NotFound from "../pages/NotFound";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";


export default function AppRoutes() {

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/unauthorized" element={<h1>🚫 Unauthorized</h1>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />


      {/* Protected Dashboards */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
     
  
 {/* Catch-all route → Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
