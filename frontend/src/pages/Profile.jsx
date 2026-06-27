import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest, getErrorMessage } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const SPECIALIZATIONS = [
  "Cardiology", "Dermatology", "Neurology", "Pediatrics", "Orthopedics",
  "General Medicine", "Gynecology", "Psychiatry", "ENT", "Ophthalmology",
];

const EMPTY_DOCTOR = {
  specialization: "",
  qualification: "",
  location: "",
  visiting_fee: "",
};

const EMPTY_PHARMACIST = {
  pharmacy_name: "",
};

// Map a backend profile object into the form's shape so we can hydrate
// from GET /user/profile and re-sync after a successful PUT.
function profileToForm(profile, role) {
  if (!profile) return role === "doctor" ? { ...EMPTY_DOCTOR } : { ...EMPTY_PHARMACIST };
  if (role === "doctor") {
    return {
      specialization: profile.specialization ?? "",
      qualification: profile.qualification ?? "",
      location: profile.location ?? "",
      visiting_fee:
        profile.visiting_fee === null || profile.visiting_fee === undefined
          ? ""
          : String(profile.visiting_fee),
    };
  }
  return {
    pharmacy_name: profile.pharmacy_name ?? "",
  };
}

function hueForId(id) {
  if (!id) return 200;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name) {
  if (!name) return "DR";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Try to parse an appointment's `date` string (which can be "YYYY-MM-DD",
// an ISO timestamp, or "N/A") into a Date. Returns null if unparseable.
function parseApptDate(s) {
  if (!s || s === "N/A") return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // Try YYYY-MM-DD explicitly (treat as local date, not UTC)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(d) {
  if (!d) return "";
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — dashboard-style profile
// ─────────────────────────────────────────────────────────────────────────────
function DoctorProfile({ user }) {
  const [saved, setSaved] = useState(null);
  const [appointments, setAppointments] = useState({ incomplete: [], complete: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_DOCTOR);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [profileRes, apptRes] = await Promise.all([
          apiRequest(ENDPOINTS.profile, { method: "GET" }).catch((err) => {
            // 404 = never saved a profile yet, that's fine for first visit.
            if (err?.status !== 404) throw err;
            return { success: true, data: null };
          }),
          apiRequest(ENDPOINTS.doctorAppointments, { method: "GET" }),
        ]);

        if (cancelled) return;
        setSaved(profileRes?.data ?? null);
        setAppointments(apptRes?.data ?? { incomplete: [], complete: [] });
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  const allAppointments = useMemo(
    () => [...(appointments.incomplete || []), ...(appointments.complete || [])],
    [appointments]
  );

  // Patients we've ever seen (deduped by patient_id)
  const patients = useMemo(() => {
    const byId = new Map();
    for (const a of allAppointments) {
      if (!a?.patient_id) continue;
      if (!byId.has(a.patient_id)) {
        byId.set(a.patient_id, {
          patientId: a.patient_id,
          name: a.name || `Patient ${a.patient_id}`,
          phone: a.phone || "",
          symptoms: a.symptoms || "",
          date: a.date || "",
        });
      }
    }
    return Array.from(byId.values());
  }, [allAppointments]);

  // Today = pending appointments whose date string matches today, falling
  // back to the next few pending if nothing is scheduled for today.
  const today = new Date();
  const todaysAppointments = useMemo(() => {
    const todays = (appointments.incomplete || []).filter((a) => {
      const d = parseApptDate(a.date);
      return d && isSameDay(d, today);
    });
    if (todays.length > 0) return todays.slice(0, 4);
    return (appointments.incomplete || []).slice(0, 4);
  }, [appointments, today]);

  // Derived metrics. "Treatments" = completed count. "Patients" = unique seen.
  // "Income" = best-effort sum of visiting_fee * completed visits (treats
  // missing fee as 0). These match the reference image's four tiles.
  const metrics = useMemo(() => {
    const fee = Number(saved?.visiting_fee ?? 0) || 0;
    const completed = (appointments.complete || []).length;
    return {
      patients: patients.length,
      income: completed * fee,
      appointments: (appointments.incomplete || []).length,
      treatments: completed,
    };
  }, [saved, appointments, patients]);

  function openEdit() {
    setForm(profileToForm(saved, "doctor"));
    setEditError("");
    setEditing(true);
  }

  function closeEdit() {
    setEditing(false);
    setEditError("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (justSaved) setJustSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEditError("");
    setSubmitting(true);
    try {
      const body = {
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        location: form.location.trim(),
        visiting_fee:
          form.visiting_fee === "" || form.visiting_fee === null
            ? null
            : Number(form.visiting_fee),
      };
      const res = await apiRequest(ENDPOINTS.profile, { method: "PUT", body });
      setSaved(res?.data ?? null);
      setForm(profileToForm(res?.data ?? null, "doctor"));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
      // Close after a brief pause so the user sees the success state.
      setTimeout(() => setEditing(false), 800);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Avatar background tints with the doctor id so each card is distinct.
  const hue = hueForId(user?.userId);

  return (
    <>
      <Navbar />
      <div className="container doctor-profile-page" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* ── Header card: identity + quick actions ── */}
        <div className="card doctor-profile-header">
          <div className="doctor-profile-identity">
            <div
              className="doctor-profile-avatar"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 60%, 65%), hsl(${(hue + 30) % 360}, 55%, 50%))`,
              }}
              aria-hidden
            >
              <span>{initialsOf(user?.name)}</span>
            </div>
            <div className="doctor-profile-id-text">
              <h1 className="doctor-profile-name">Dr. {user?.name || "Doctor"}</h1>
              <p className="doctor-profile-role">
                {saved?.specialization || "Specialization not set"}
                {saved && (
                  <span
                    className={`badge approval-pill approval-pill--${saved.approval ? "approved" : "pending"}`}
                    title={
                      saved.approval
                        ? "Approved by admin — you're visible to patients"
                        : "Awaiting admin review — patients can't book you yet"
                    }
                  >
                    {saved.approval ? "✓ Approved" : "⏳ Pending review"}
                  </span>
                )}
              </p>
              {saved?.qualification && (
                <p className="doctor-profile-qual">{saved.qualification}</p>
              )}
              {saved?.location && (
                <p className="doctor-profile-loc">📍 {saved.location}</p>
              )}
            </div>
          </div>

          <div className="doctor-profile-actions">
            <Link to="/doctor/chat" className="btn btn-outline btn-sm">
              💬 Messages
            </Link>
            <Link to="/doctor" className="btn btn-outline btn-sm">
              📅 Queue
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={openEdit}>
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}
        {justSaved && !editing && (
          <div className="alert alert-success" style={{ marginTop: 16 }}>
            Profile updated successfully.
          </div>
        )}

        {/* ── Metric tiles ── */}
        <div className="doctor-metrics">
          <MetricTile
            tone="purple"
            icon="👥"
            label="Patients"
            value={metrics.patients}
            loading={loading}
          />
          <MetricTile
            tone="orange"
            icon="📅"
            label="Appointments"
            value={metrics.appointments}
            loading={loading}
          />
          <MetricTile
            tone="pink"
            icon="❤"
            label="Treatments"
            value={metrics.treatments}
            loading={loading}
          />
        </div>

        {/* ── Two-column body: today's appointments + recent patients ── */}
        <div className="doctor-profile-grid">

          <section className="card doctor-section">
            <div className="doctor-section__head">
              <h3 className="doctor-section__title">Today's Appointments</h3>
              <Link to="/doctor" className="doctor-section__link">See all</Link>
            </div>
            {loading ? (
              <p className="text-muted small">Loading…</p>
            ) : todaysAppointments.length === 0 ? (
              <p className="text-muted small">No upcoming appointments.</p>
            ) : (
              <ul className="doctor-appt-list">
                {todaysAppointments.map((a) => {
                  const phue = hueForId(a.patient_id);
                  const isToday = (() => {
                    const d = parseApptDate(a.date);
                    return d && isSameDay(d, today);
                  })();
                  return (
                    <li key={a.serial_no} className="doctor-appt-row">
                      <div
                        className="doctor-appt-avatar"
                        style={{ background: `hsl(${phue}, 55%, 88%)`, color: `hsl(${phue}, 45%, 30%)` }}
                        aria-hidden
                      >
                        {initialsOf(a.name)}
                      </div>
                      <div className="doctor-appt-body">
                        <div className="doctor-appt-name">{a.name}</div>
                        <div className="doctor-appt-meta">{a.symptoms || "—"}</div>
                      </div>
                      <div className="doctor-appt-right">
                        {isToday ? (
                          <span className="doctor-pill doctor-pill--blue">Today</span>
                        ) : (
                          <span className="doctor-appt-date">{formatDate(parseApptDate(a.date))}</span>
                        )}
                        {a.prescriptionID && (
                          <Link
                            to={`/doctor/prescriptions/${a.prescriptionID}`}
                            className="doctor-appt-link"
                          >
                            Open →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card doctor-section">
            <div className="doctor-section__head">
              <h3 className="doctor-section__title">Patient History</h3>
              <Link to="/doctor/patient-history" className="doctor-section__link">
                Open full list
              </Link>
            </div>
            <p className="text-muted small" style={{ marginTop: 4 }}>
              You've seen <strong>{patients.length}</strong> unique patient
              {patients.length !== 1 ? "s" : ""} so far. Use the dedicated
              Patient History page to search, open, and edit any record.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link
                to="/doctor/patient-history"
                className="btn btn-primary btn-sm"
              >
                Open Patient History →
              </Link>
              <Link to="/doctor" className="btn btn-outline btn-sm">
                Back to queue
              </Link>
            </div>
          </section>
        </div>

        <p className="doctor-footnote">
          💡 Tip: completed appointments appear in your patient history automatically.
        </p>
      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Edit Profile</h2>
              <button type="button" className="modal-close" onClick={closeEdit} aria-label="Close">×</button>
            </div>

            {editError && <div className="alert alert-error">{editError}</div>}
            {justSaved && <div className="alert alert-success">Profile updated successfully.</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <select
                  className="form-control form-select"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input
                  className="form-control"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="e.g. MD, FACC"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chamber / location</label>
                <input
                  className="form-control"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Building A, Clinic Suite 402"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visiting fee</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  name="visiting_fee"
                  value={form.visiting_fee}
                  onChange={handleChange}
                  placeholder="e.g. 150.00"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeEdit} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACIST — simple form, unchanged from the original design
// ─────────────────────────────────────────────────────────────────────────────
function PharmacistProfile({ user }) {
  const [form, setForm] = useState(EMPTY_PHARMACIST);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest(ENDPOINTS.profile, { method: "GET" })
      .then((res) => {
        if (cancelled) return;
        const profile = res?.data ?? null;
        setSaved(profile);
        setForm(profileToForm(profile, user.role));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status !== 404) setError(getErrorMessage(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (justSaved) setJustSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = { pharmacy_name: form.pharmacy_name.trim() };
      const res = await apiRequest(ENDPOINTS.profile, { method: "PUT", body });
      setSaved(res?.data ?? null);
      setForm(profileToForm(res?.data ?? null, user.role));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ marginBottom: 32 }}>
          <p className="section-eyebrow">Pharmacist Profile</p>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
            Set up your pharmacy
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 560 }}>
            Your pharmacy name appears on the inventory you manage.
          </p>
          <div className="accent-line" />
        </div>

        <div className="card" style={{ maxWidth: 460, padding: 28 }}>
          {error && <div className="alert alert-error">{error}</div>}
          {justSaved && <div className="alert alert-success">Profile updated successfully.</div>}
          <form onSubmit={handleSubmit}>
            {loading && <div className="text-muted small mb-2">Loading your profile…</div>}
            <div className="form-group">
              <label className="form-label">Pharmacy name</label>
              <input
                className="form-control"
                name="pharmacy_name"
                value={form.pharmacy_name}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g. Central Metro Pharmacy"
                required
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={submitting || loading}
              style={{ marginTop: 8 }}
            >
              {submitting ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>

        <Link
          to="/pharmacist"
          style={{
            display: "inline-block", marginTop: 16, fontSize: 13,
            color: "var(--accent)", fontWeight: 500, textDecoration: "none",
          }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </>
  );
}

export default function Profile() {
  const { user } = useAuth();
  if (user?.role === "doctor") return <DoctorProfile user={user} />;
  return <PharmacistProfile user={user} />;
}