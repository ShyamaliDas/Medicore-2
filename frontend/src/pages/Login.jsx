// src/pages/Login.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/medicoreLogo.png";

const ROLE_HOME = {
  patient:    "/patient",
  doctor:     "/doctor",
  pharmacist: "/pharmacist",
  admin:      "/admin",
};

export default function Login() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const profile = await login(email, password);
      navigate(ROLE_HOME[profile.role] || "/");
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
          {/* Logo on white pill — needed because the JPG has a light background */}
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
            Patient care platform
          </p>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.2,
              marginBottom: 18,
            }}
          >
            Your health,
            <br />
            coordinated.
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.8, maxWidth: 300 }}>
            Appointments, prescriptions, pharmacy, and direct doctor
            communication — in one place.
          </p>
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
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>

          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
              Welcome back
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "var(--text)" }}>
              Sign in
            </h2>
            <div className="accent-line" />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
            No account?{" "}
            <Link to="/signup" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>
              Create one
            </Link>
          </p>
          <p style={{ marginTop: 12, textAlign: "center", fontSize: 13 }}>
            <Link to="/" style={{ color: "var(--text-light)", textDecoration: "none" }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
