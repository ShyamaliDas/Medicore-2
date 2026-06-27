import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Serial_no is a per-day sequence; a reasonable patient-friendly
// mapping is the i-th slot starting at 08:00 with 30-minute spacing.
function formatSlot(serialNo) {
  const n = Number(serialNo);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const start = 8 * 60; // minutes from midnight
  const minutes = start + (n - 1) * 30;
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchedOnce, setFetchedOnce] = useState(false);

  async function loadAppointments() {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(ENDPOINTS.myAppointments, { auth: true });
      if (res?.success) {
        setAppointments(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res?.message ?? "Failed to load appointments.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setFetchedOnce(true);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  // Group appointments by date so the table reads like a calendar.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      const key = appt.date || "Unscheduled";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(appt);
    }
    // Sort entries by date descending (most recent first); within
    // each day, sort by serial_no ascending so slot order is stable.
    return Array.from(map.entries())
      .sort((a, b) => {
        const da = new Date(a[0]).getTime() || 0;
        const db = new Date(b[0]).getTime() || 0;
        return db - da;
      })
      .map(([date, rows]) => ({
        date,
        rows: [...rows].sort(
          (a, b) => (a.serial_no ?? 0) - (b.serial_no ?? 0)
        ),
      }));
  }, [appointments]);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">My Appointments</h1>
          <div className="accent-line"></div>
          <p className="page-subtitle">All appointments you have booked, grouped by day.</p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Link to="/patient/book" className="btn btn-primary">
            + Book New Appointment
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAppointments}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            className="alert alert-error"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <span>{error}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadAppointments}>
              Retry
            </button>
          </div>
        )}

        {loading && <p className="page-subtitle">Loading appointments…</p>}

        {fetchedOnce && !loading && !error && appointments.length === 0 && (
          <div className="card empty-state">
            <p className="empty-state__icon">📅</p>
            <p>You have no appointments yet.</p>
            <Link to="/patient/book" className="btn btn-primary" style={{ marginTop: 12 }}>
              Book your first appointment
            </Link>
          </div>
        )}

        {fetchedOnce && !loading && !error && grouped.length > 0 && (
          <>
            <p className="search-meta">
              {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} found
            </p>
            {grouped.map((group) => (
              <section key={group.date} className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
                <div className="doctor-section__head" style={{ marginBottom: 8 }}>
                  <h3 className="doctor-section__title">{formatDate(group.date)}</h3>
                  <span className="doctor-section__count">
                    {group.rows.length} slot{group.rows.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mc-table-wrap">
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Slot</th>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((appt) => (
                        <tr key={appt.appointmentId ?? appt.prescriptionID ?? `${appt.doctor_id}-${appt.date}-${appt.serial_no}`}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                              <strong>#{appt.serial_no ?? "—"}</strong>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                {formatSlot(appt.serial_no)}
                              </span>
                            </div>
                          </td>
                          <td>{appt.doctorName ?? "—"}</td>
                          <td>
                            <span className="badge badge-accent">
                              {appt.department ?? appt.specialization ?? "—"}
                            </span>
                          </td>
                          <td>{appt.location ?? "—"}</td>
                          <td>
                            <span className="badge role-patient">{appt.status ?? "Booked"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}