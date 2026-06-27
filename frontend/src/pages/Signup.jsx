// src/pages/Signup.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/medicoreLogo.png";

// Admin accounts are provisioned out-of-band, so the public signup form
// only offers the three self-service roles.
const ROLES = [
  { value: "patient",    label: "Patient" },
  { value: "doctor",     label: "Doctor" },
  { value: "pharmacist", label: "Pharmacist" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Signup() {
  const [form, setForm] = useState({
    name:        "",
    email:       "",
    password:    "",
    phone:       "",
    role:        "patient",
    blood_group: "",
  });
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate   = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── LEFT — brand panel ── */}
      <div
        style={{
          width: "42%",
          background: "var(--accent)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          color: "white",
        }}
      >
        <div>
          {/* Logo on white pill */}
          <div>
            <img
              src={logo}
              alt="MediCore"
              style={{ height: 200, width: "auto", objectFit: "contain" }}
            />
          </div>

          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.65,
              marginBottom: 14,
            }}
          >
            Create your account
          </p>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.2,
              marginBottom: 18,
            }}
          >
            Join the
            <br />
            platform.
          </h1>

          <div
            style={{
              marginTop: 32,
              padding: "16px",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>Note for doctors</strong>
            Doctor accounts require admin approval before appearing in patient
            directories. You can still log in and set up your profile while waiting.
          </div>
        </div>

        <span style={{ fontSize: 12, opacity: 0.4 }}>SWE Lab · 2026</span>
      </div>

      {/* ── RIGHT — form panel ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          padding: "48px 32px",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
              New here?
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "var(--text)" }}>
              Create account
            </h2>
            <div className="accent-line" />
          </div>

          {error   && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success">
              Account created! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-control" name="name" value={form.name}
                onChange={handleChange} placeholder="Dr. Sarah Jenkins" required />
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-control" name="email" value={form.email}
                onChange={handleChange} placeholder="you@hospital.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••" required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-control" name="phone" value={form.phone}
                onChange={handleChange} placeholder="+880..." required />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control form-select" name="role"
                value={form.role} onChange={handleChange}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {form.role === "patient" && (
              <div className="form-group">
                <label className="form-label">Blood group</label>
                <select className="form-control form-select" name="blood_group"
                  value={form.blood_group} onChange={handleChange}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit"
              disabled={submitting} style={{ marginTop: 8 }}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
