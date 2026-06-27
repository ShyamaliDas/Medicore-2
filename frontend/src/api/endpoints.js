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
  doctorsSearch: (specialization, location) => {
    const params = new URLSearchParams();
    if (specialization) params.set("specialization", specialization);
    if (location) params.set("location", location);
    const query = params.toString();
    return query ? `/user/doctors/search?${query}` : "/user/doctors/search";
  },

  // Patient
  appointments: "/patient/appointments",
  myAppointments: "/patient/myallappointments",
  prescriptions: "/patient/prescriptions",
  prescriptionsByDoctor: (doctorId) => `/patient/prescriptions/doctor/${doctorId}`,

  // Doctor
  doctorPrescription: (prescriptionId) => `/doctor/prescriptions/${prescriptionId}`,
  doctorGetPrescription: (prescriptionId) => `/doctor/prescriptions/${prescriptionId}`,
  doctorCompleteAppointment: (serialNo) => `/doctor/appointments/${serialNo}/complete`,
  doctorPrescriptionsByPatient: (patientId) => `/doctor/prescriptions/patient/${patientId}`,
  doctorAppointments: "/doctor/appointments",

  // Admin — Doctor approvals
  approveDoctor: (doctorId) => `/admin/approve-doctor/${doctorId}`,
  disapproveDoctor: (doctorId) => `/admin/disapprove-doctor/${doctorId}`,
  adminDoctors: "/admin/doctors",
  adminDoctorsPending: "/admin/doctors/pending",
  adminDoctorsApproved: "/admin/doctors/approved",

  // Admin — User management
  adminUsers: "/admin/users",
  adminChangeRole: (userId) => `/admin/users/${userId}/role`,
  adminDeleteUser: (userId) => `/admin/users/${userId}`,

  // Admin — Dashboard
  adminStats: "/user/admin/dashboard/stats",

  // Admin — Blood bank (donor oversight)
  adminDonors: (bloodGroup) => {
    const bg = bloodGroup && bloodGroup !== "All" ? `?bloodGroup=${encodeURIComponent(bloodGroup)}` : "";
    return `/bloodbank/admin/donors${bg}`;
  },
  adminDeleteDonor: (bloodBankId) => `/bloodbank/admin/donors/${bloodBankId}`,

  // Admin — Medicine catalog (oversight)
  adminDeleteMedicine: (medicineId) => `/admin/medicines/${medicineId}`,

  // Pharmacist
  medicines: "/pharmacist/medicines",
  medicineById: (medicineId) => `/pharmacist/medicines/${medicineId}`,
  pharmacistSearchPrescription: (email) =>
    `/pharmacist/prescriptions/search?email=${encodeURIComponent(email)}`,

  // Chat
  chatSend: "/chat/send",
  chatMessages: (doctorId, patientId) =>
    `/chat/messages?doctorId=${doctorId}&patientId=${patientId}`,

  // Bloodbank
  donorRegister: "/bloodbank/donor/register",
  donorsByGroup: (bloodGroup) => `/bloodbank/donors?bloodGroup=${encodeURIComponent(bloodGroup)}`,
  myDonation: "/bloodbank/me/donation",
  updateDonationDate: "/bloodbank/donor/update-date",
};
