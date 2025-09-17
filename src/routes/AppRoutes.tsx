import { Routes, Route } from "react-router-dom";

import App from "../pages/App";
import Login from "../pages/Login";
import Policy from "../pages/Policy";
import SignUp from "../pages/SignUp";
import Dashboard from "../pages/Dashboard";
import { ProtectedRoute } from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<App />} />
      <Route path="/policy" element={<Policy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
