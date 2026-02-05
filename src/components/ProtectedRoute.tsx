// src/components/protetcedRoutes 

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRoles?: number[]; // Array of allowed roles
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<{ id: number; role: number } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
      // eds  const res = await fetch("http://localhost:5000/api/me", {
            const res = await fetch("/api/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (isChecking) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If requiredRoles is provided, check if user's role is included
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
