// src/App.jsx
//
// Two things happen here:
// 1. Routes are declared — every page is registered here with its
//    ProtectedRoute wrapper specifying which role(s) can access it.
// 2. The root div gets a role class (e.g. "role-doctor") derived from
//    the logged-in user's JWT. This is what makes every button, badge,
//    and accent line switch color automatically — one class, whole app.


import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DoctorDirectory from "./pages/patient/DoctorDirectory";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import WritePrescription from "./pages/doctor/WritePrescription";
import PatientHistory from "./pages/doctor/PatientHistory";

// TODO (Person A): import BookAppointment, Prescriptions, Chat, BloodDonor
// TODO (Person B): import DoctorDashboard, WritePrescription, PatientHistory, ApproveDoctors
// TODO (Person C): import Medicines, Chat

// Inner wrapper reads the auth user and applies the role class.
// It's a separate component so it can call useAuth() (which needs
// to be inside <AuthProvider>).
function RoleWrapper({ children }) {
  const { user } = useAuth();
  const roleClass = user ? `role-${user.role}` : "";
  return <div className={roleClass}>{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoleWrapper>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Patient routes */}
            <Route
              path="/patient"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <DoctorDirectory />
                </ProtectedRoute>
              }
            />

            {/* Doctor routes */}
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRoles={["doctor"]}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/prescriptions/:prescriptionId"
              element={
                <ProtectedRoute allowedRoles={["doctor"]}>
                  <WritePrescription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/patient/:patientId"
              element={
                <ProtectedRoute allowedRoles={["doctor"]}>
                  <PatientHistory />
                </ProtectedRoute>
              }
            />

            {/* TODO: Add routes below following the same pattern:
                <Route path="/doctor" element={
                  <ProtectedRoute allowedRoles={["doctor"]}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                } />
                ... and so on for /pharmacist, /admin
            */}
          </Routes>
        </RoleWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}
