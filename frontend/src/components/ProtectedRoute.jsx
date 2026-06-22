// src/components/ProtectedRoute.jsx
//
// Design pattern: this is a "wrapper"/"guard" component — a very common
// React pattern for the same problem middleware solves on the backend.
//
// SRP: its only job is "should this person see this page or not". It does
// not know or care what the page itself renders.
//
// LSP-style consistency: every page that needs protection wraps the SAME
// way, regardless of role — <ProtectedRoute allowedRoles={["doctor"]}>.
// You never need a different kind of guard for a different role; the
// component behaves identically no matter which roles you pass it.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but wrong role for this page (mirrors backend's 403)
    return <Navigate to="/" replace />;
  }

  return children;
}
