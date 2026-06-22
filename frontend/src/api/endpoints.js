// src/api/endpoints.js
//
// Code smell avoided: "magic strings". Without this file, every page would
// hardcode its own copy of "/patient/prescriptions" etc., and a single typo
// or backend path change means hunting through every page in the app.
// With this file, the path exists in exactly ONE place.
//
// SRP: this file's only job is to know the URL paths. It doesn't know how
// to call them (that's client.js) or what to do with the response (that's
// the page component).

export const ENDPOINTS = {
  // Auth
  signup: "/auth/signup",
  login: "/auth/login",

  // User / profile
  profile: "/user/profile",
  doctors: "/user/doctors",

  // Patient
  appointments: "/patient/appointments",
  prescriptions: "/patient/prescriptions",
  prescriptionsByDoctor: (doctorId) => `/patient/prescriptions/doctor/${doctorId}`,

  // Doctor
  doctorPrescription: (prescriptionId) => `/doctor/prescriptions/${prescriptionId}`,
  doctorPrescriptionsByPatient: (patientId) => `/doctor/prescriptions/patient/${patientId}`,
  doctorAppointments: "/doctor/appointments",

  // Admin
  approveDoctor: (doctorId) => `/admin/approve-doctor/${doctorId}`,

  // Pharmacist
  medicines: "/pharmacist/medicines",
  medicineById: (medicineId) => `/pharmacist/medicines/${medicineId}`,

  // Chat
  chatSend: "/chat/send",
  chatMessages: (doctorId, patientId) =>
    `/chat/messages?doctorId=${doctorId}&patientId=${patientId}`,

  // Bloodbank
  donorRegister: "/bloodbank/donor/register",
  donorsByGroup: (bloodGroup) => `/bloodbank/donors?bloodGroup=${encodeURIComponent(bloodGroup)}`,
};
