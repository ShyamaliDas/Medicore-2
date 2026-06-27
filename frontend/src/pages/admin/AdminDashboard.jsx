// src/pages/admin/AdminDashboard.jsx
//
// Admin overview page: pulls live counts from /user/admin/dashboard/stats
// (already wired in userservice's AdminDashboardController) and surfaces
// quick navigation cards to the three sub-pages.
//
// Backend assumptions (will gracefully degrade until backend team lands them):
//   GET  /user/admin/dashboard/stats        -> { data: { patients, doctors,
//                                                       approvedDoctors,
//                                                       pendingDoctors,
//                                                       pharmacists, donors } }

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const STAT_CARDS = [
  { key: "patients",        label: "Patients",        accent: "var(--accent)" },
  { key: "doctors",         label: "Doctors",         accent: "var(--accent)" },
  { key: "approvedDoctors", label: "Approved Doctors",accent: "var(--accent)" },
  { key: "pendingDoctors",  label: "Pending Doctors", accent: "var(--accent)" },
  { key: "pharmacists",     label: "Pharmacists",     accent: "var(--accent)" },
  { key: "donors",          label: "Blood Donors",    accent: "var(--accent)" },
];

const NAV_CARDS = [
  {
    to: "/admin/doctors",
    title: "Doctor Approvals",
    description: "Review pending doctors, approve credentials, manage the doctor directory.",
    icon: "🩺",
  },
  {
    to: "/admin/users",
    title: "User Management",
    description: "View all users and remove accounts from the platform.",
    icon: "👥",
  },
  {
    to: "/admin/donors",
    title: "Blood Donors",
    description: "Oversee the donor registry, filter by blood group, remove outdated entries.",
    icon: "🩸",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(ENDPOINTS.adminStats, { auth: true });
      // Backend returns:
      //   { success: true, data: { breakdown: { patients, doctors_approved,
      //                       doctors_pending, pharmacists }, total_users } }
      // The cards expect flat keys + a "donors" count we synthesize later.
      const payload = res?.data ?? res ?? {};
      const breakdown = payload.breakdown ?? {};
      setStats({
        patients: breakdown.patients ?? 0,
        doctors: (breakdown.doctors_approved ?? 0) + (breakdown.doctors_pending ?? 0),
        approvedDoctors: breakdown.doctors_approved ?? 0,
        pendingDoctors: breakdown.doctors_pending ?? 0,
        pharmacists: breakdown.pharmacists ?? 0,
        donors: 0, // filled in below from the donors endpoint
        totalUsers: payload.total_users ?? 0,
      });
      fetchDonorCount();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchDonorCount() {
    try {
      const res = await apiRequest(ENDPOINTS.adminDonors("All"), { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStats((prev) => (prev ? { ...prev, donors: list.length } : prev));
    } catch {
      // Non-fatal: donor count is supplementary.
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <p className="section-eyebrow role-admin">Admin Portal</p>
            <h1 className="page-title">Welcome, {user?.name ?? "Admin"}</h1>
            <p className="page-subtitle">
              Oversee doctors, users, donors, and platform activity.
            </p>
          </div>
        </div>

        {/* ─── Stats strip ───────────────────────────────────────────── */}
        {error && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{error}</span>
            <button className="btn btn-outline btn-sm" onClick={loadStats}>Retry</button>
          </div>
        )}

        <div className="grid-3 mb-3">
          {STAT_CARDS.map(({ key, label }) => (
            <div key={key} className="card">
              <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 600, color: "var(--accent)", lineHeight: 1.1 }}>
                {loading ? "—" : (stats?.[key] ?? 0)}
              </p>
            </div>
          ))}
        </div>

        {/* ─── Quick navigation cards ───────────────────────────────── */}
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "8px 0 16px" }}>Manage</h2>
        <div className="grid-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="card card-hover"
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                {card.title}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}