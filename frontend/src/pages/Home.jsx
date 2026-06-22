// src/pages/Home.jsx
//
// Public landing page — visible to anyone, no auth required.
// Gives an overview of the platform and routes to login/signup.
// Pattern: no data fetching, pure render. Simplest possible page.

import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const FEATURES = [
  {
    title: "Appointments",
    desc: "Patients book slots with approved doctors. A prescription container is prepared automatically on booking.",
  },
  {
    title: "Prescriptions",
    desc: "Doctors write digital prescriptions. Patients view their full history anytime, filterable by doctor.",
  },
  {
    title: "Pharmacy",
    desc: "Pharmacists manage medicine stock, pricing, and catalog additions in real time.",
  },
  {
    title: "Chat",
    desc: "Direct doctor–patient messaging for follow-ups and dosage questions without a new appointment.",
  },
  {
    title: "Blood Bank",
    desc: "Patients register as donors. Coordinators filter by blood group to find matches instantly.",
  },
  {
    title: "Admin Panel",
    desc: "Admins approve incoming doctor registrations before they appear in patient search directories.",
  },
];

const STATS = [
  { number: "4",    label: "User roles" },
  { number: "6",    label: "Core services" },
  { number: "24/7", label: "Digital access" },
  { number: "1",    label: "Unified platform" },
];

export default function Home() {
  return (
    <div className="page-wrap">
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ background: "var(--white)", padding: "80px 0 72px" }}>
        <div className="container">
          <p className="section-eyebrow">Welcome to MediCore</p>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "var(--text)",
              maxWidth: 560,
              marginBottom: 16,
            }}
          >
            Healthcare,
            <br />
            coordinated.
          </h1>
          <div className="accent-line" />
          <p className="section-sub" style={{ maxWidth: 460, marginBottom: 36 }}>
            Book appointments, manage prescriptions, coordinate pharmacy
            inventory, and connect with your care team — all in one platform.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get started
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          padding: "44px 0",
          background: "var(--bg)",
        }}
      >
        <div className="container">
          <div className="grid-4">
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 600,
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {s.number}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 8,
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "80px 0", background: "var(--white)" }}>
        <div className="container">
          <p className="section-eyebrow">What we offer</p>
          <h2 className="section-title" style={{ marginBottom: 48 }}>
            Everything your clinic needs
          </h2>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card card-hover">
                <div
                  className="accent-line"
                  style={{ width: 24, height: 2, margin: "0 0 16px" }}
                />
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text)",
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: "72px 0",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <div className="container">
          <p className="section-eyebrow">Join today</p>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--text)",
            }}
          >
            Ready to get started?
          </h2>
          <p
            className="section-sub"
            style={{ marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}
          >
            Create your account and choose your role as a patient, doctor,
            pharmacist, or admin.
          </p>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Create account
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 0",
          background: "var(--white)",
        }}
      >
        <div
          className="container flex justify-between items-center"
          style={{ flexWrap: "wrap", gap: 8 }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            MediCore — SWE Lab Project
          </span>
          <span style={{ fontSize: 13, color: "var(--text-light)" }}>2026</span>
        </div>
      </footer>
    </div>
  );
}
