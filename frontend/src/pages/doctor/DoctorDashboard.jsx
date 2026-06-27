// src/pages/doctor/DoctorDashboard.jsx
//
// Doctor's "Appointments" page (historically named DoctorDashboard).
// Mounted at /doctor. The route + file name are kept as-is so the rest of
// the app (Navbar, Login redirect, WritePrescription's "back to /doctor")
// keeps working — only the visible title and styling changed.
//
// Behaviour notes:
//   - The "Set up profile" banner used to flash for a frame on every load
//     because profileComplete defaulted to false and the GET resolves
//     asynchronously. Now we default to true (i.e. assume complete) and
//     only flip it to false if the GET returns an obviously empty profile.
//   - Until the GET resolves, we render the queue only — never the banner.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

function ProfilePrompt() {
  return (
    <div
      className="card-sm"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
        flexWrap: "wrap",
        borderColor: "var(--accent)",
        background: "var(--accent-light)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--accent-dark)" }}>
        Patients can't find or book you until your specialization, location, and fee are set.
      </span>
      <Link to="/doctor/profile" className="btn btn-primary btn-sm">
        Set up profile
      </Link>
    </div>
  );
}

function initialsOf(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueForId(id) {
  if (!id) return 200;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [incomplete, setIncomplete] = useState([]);
  const [complete, setComplete] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Default true so the banner NEVER flashes on first paint. We only flip
  // it to false after the GET confirms the profile is genuinely empty.
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    async function loadAppts() {
      try {
        const res = await apiRequest(ENDPOINTS.doctorAppointments, { method: "GET" });
        setIncomplete(res.data.incomplete || []);
        setComplete(res.data.complete || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAppts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest(ENDPOINTS.profile, { method: "GET" })
      .then((res) => {
        if (cancelled) return;
        const p = res?.data ?? {};
        const ok =
          p.specialization && p.qualification && p.location &&
          p.visiting_fee !== null && p.visiting_fee !== undefined && p.visiting_fee !== "";
        setProfileIncomplete(!ok);
        setProfileChecked(true);
      })
      .catch(() => {
        // Network/server error → don't show a stale banner. Leave defaults.
        if (!cancelled) setProfileChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Derived metrics for the tile row.
  const metrics = useMemo(() => ({
    pending: incomplete.length,
    completed: complete.length,
    total: incomplete.length + complete.length,
    patients: new Set(
      [...incomplete, ...complete].map((a) => a.patient_id).filter(Boolean)
    ).size,
  }), [incomplete, complete]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* ── Header ── */}
        <div className="page-header" style={{ borderBottom: "none", marginBottom: 8 }}>
          <div>
            <p className="section-eyebrow">Doctor Portal</p>
            <h1 className="section-title">Appointments</h1>
            <div className="accent-line" />
            <p className="page-subtitle">
              Welcome back, Dr. {user?.name}. Here is your queue for today.
            </p>
          </div>
          <Link to="/doctor/profile" className="btn btn-outline btn-sm">
            Edit Profile
          </Link>
        </div>

        {/* ── Banner — only after the profile check resolves AND it's empty ── */}
        {profileChecked && profileIncomplete && <ProfilePrompt />}

        {/* ── Metric tiles ── */}
        <div className="doctor-metrics" style={{ marginTop: 8 }}>
          <MetricTile tone="orange" icon="🕒" label="Pending"    value={metrics.pending}    loading={loading} />
          <MetricTile tone="green"  icon="✅" label="Completed"  value={metrics.completed}  loading={loading} />
          <MetricTile tone="purple" icon="👥" label="Patients"   value={metrics.patients}   loading={loading} />
          <MetricTile tone="pink"   icon="📋" label="Total"      value={metrics.total}      loading={loading} />
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

        {!loading && !error && metrics.total === 0 && (
          <div className="state-empty" style={{ marginTop: 20 }}>
            No appointments yet. They'll appear here as patients book you.
          </div>
        )}

        {/* ── Pending queue ── */}
        {!loading && !error && incomplete.length > 0 && (
          <AppointmentList
            title="Pending"
            rows={incomplete}
            kind="pending"
          />
        )}

        {/* ── Completed list ── */}
        {!loading && !error && complete.length > 0 && (
          <AppointmentList
            title="Completed"
            rows={complete}
            kind="completed"
          />
        )}
      </div>
    </>
  );
}

function MetricTile({ tone, icon, label, value, loading }) {
  return (
    <div className={`metric-tile metric-tile--${tone}`}>
      <div className="metric-tile__icon" aria-hidden>{icon}</div>
      <div className="metric-tile__body">
        <div className="metric-tile__label">{label}</div>
        <div className="metric-tile__value">{loading ? "—" : value}</div>
      </div>
    </div>
  );
}

function AppointmentList({ title, rows, kind }) {
  return (
    <section className="card" style={{ marginTop: 20, padding: "20px 22px" }}>
      <div className="doctor-section__head">
        <h3 className="doctor-section__title">{title}</h3>
        <span className="doctor-section__count">{rows.length} total</span>
      </div>
      <ul className="doctor-appt-list">
        {rows.map((appt) => {
          const phue = hueForId(appt.patient_id);
          return (
            <li key={appt.serial_no} className="doctor-appt-row">
              <div
                className="doctor-appt-avatar"
                style={{ background: `hsl(${phue}, 55%, 88%)`, color: `hsl(${phue}, 45%, 30%)` }}
                aria-hidden
              >
                {initialsOf(appt.name)}
              </div>
              <div className="doctor-appt-body">
                <div className="doctor-appt-name">{appt.name}</div>
                <div className="doctor-appt-meta">
                  {appt.symptoms || "No symptoms recorded"}
                  {appt.phone ? ` · ${appt.phone}` : ""}
                </div>
              </div>
              <div className="doctor-appt-right">
                <span className="doctor-appt-date">{appt.date}</span>
                {kind === "pending" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link
                      to={`/doctor/patient/${appt.patient_id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      History
                    </Link>
                    {appt.prescriptionID && (
                      <Link
                        to={`/doctor/prescriptions/${appt.prescriptionID}`}
                        className="btn btn-primary btn-sm"
                      >
                        Prescribe
                      </Link>
                    )}
                  </div>
                ) : (
                  <span className="doctor-pill doctor-pill--blue">Done</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}