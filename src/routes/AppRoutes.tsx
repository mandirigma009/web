import { Routes, Route } from "react-router-dom";

import App from "../pages/App";
import Login from "../pages/Login";
import Policy from "../pages/Policy";
import SignUp from "../pages/SignUp";
import StudentDashboard from "../pages/StudentDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import { ProtectedRoute } from "../components/ProtectedRoute";
import NotFound from "../pages/NotFound";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<App />} />
      <Route path="/policy" element={<Policy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/unauthorized" element={<h1>🚫 Unauthorized</h1>} />

      {/* Protected Dashboards */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole={4}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole={1}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

 {/* Catch-all route → Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
