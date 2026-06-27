// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import DoctorDirectory from "./pages/patient/DoctorDirectory";
import BookAppointment from "./pages/patient/BookAppointment";
import Prescriptions from "./pages/patient/Prescriptions";
import PrescriptionsByDoctor from "./pages/patient/PrescriptionsByDoctor";
import Chat from "./pages/patient/Chat";
import Blooddonor from "./pages/patient/Blooddonor";
import MyAppointments from "./pages/patient/MyAppointments";

// Doctor pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import WritePrescription from "./pages/doctor/WritePrescription";
import PatientHistory from "./pages/doctor/PatientHistory";
import DoctorChat from "./pages/doctor/DoctorChat";

// Placeholder dashboards (create these files — see instructions below)
import PharmacistDashboard from "./pages/pharmacist/PharmacistDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDonors from "./pages/admin/AdminDonors";

function RoleWrapper({ children }) {
  const { user } = useAuth();
  const roleClass = user ? `role-${user.role}` : "";
  return <div className={roleClass}>{children}</div>;
}

// Redirect logged-in users to their dashboard from /
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Home />;
  const ROLE_HOME = {
    patient: "/patient",
    doctor: "/doctor",
    pharmacist: "/pharmacist",
    admin: "/admin",
  };
  return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoleWrapper>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Patient */}
            <Route path="/patient" element={
              <ProtectedRoute allowedRoles={["patient"]}><PatientDashboard /></ProtectedRoute>
            } />
            <Route path="/patient/doctors" element={
              <ProtectedRoute allowedRoles={["patient"]}><DoctorDirectory /></ProtectedRoute>
            } />
            <Route path="/patient/book" element={
              <ProtectedRoute allowedRoles={["patient"]}><BookAppointment /></ProtectedRoute>
            } />
            <Route path="/patient/appointments" element={
              <ProtectedRoute allowedRoles={["patient"]}><MyAppointments /></ProtectedRoute>
            } />
            <Route path="/patient/prescriptions" element={
              <ProtectedRoute allowedRoles={["patient"]}><Prescriptions /></ProtectedRoute>
            } />
            <Route path="/patient/prescriptions/:doctorId" element={
              <ProtectedRoute allowedRoles={["patient"]}><PrescriptionsByDoctor /></ProtectedRoute>
            } />
            <Route path="/patient/chat" element={
              <ProtectedRoute allowedRoles={["patient"]}><Chat /></ProtectedRoute>
            } />
            <Route path="/patient/donors" element={
              <ProtectedRoute allowedRoles={["patient"]}><Blooddonor /></ProtectedRoute>
            } />

            {/* Doctor */}
            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={["doctor"]}><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor/prescriptions/:prescriptionId" element={
              <ProtectedRoute allowedRoles={["doctor"]}><WritePrescription /></ProtectedRoute>
            } />
            <Route path="/doctor/patient/:patientId" element={
              <ProtectedRoute allowedRoles={["doctor"]}><PatientHistory /></ProtectedRoute>
            } />
            <Route path="/doctor/chat" element={
              <ProtectedRoute allowedRoles={["doctor"]}><DoctorChat /></ProtectedRoute>
            } />
            <Route path="/doctor/profile" element={
              <ProtectedRoute allowedRoles={["doctor"]}><Profile /></ProtectedRoute>
            } />
            {/* Pharmacist */}
            <Route path="/pharmacist" element={
              <ProtectedRoute allowedRoles={["pharmacist"]}><PharmacistDashboard /></ProtectedRoute>
            } />
            <Route path="/pharmacist/profile" element={
              <ProtectedRoute allowedRoles={["pharmacist"]}><Profile /></ProtectedRoute>
            } />
            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/doctors" element={
              <ProtectedRoute allowedRoles={["admin"]}><AdminDoctors /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/donors" element={
              <ProtectedRoute allowedRoles={["admin"]}><AdminDonors /></ProtectedRoute>
            } />
          </Routes>
        </RoleWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}