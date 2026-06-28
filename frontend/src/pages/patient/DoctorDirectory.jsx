import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";

function initialsOf(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [location, setLocation] = useState("");

  async function loadDoctors() {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(ENDPOINTS.doctors, { auth: true });
      setDoctors(res.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  const filtered = useMemo(() => {
    const spec = specialization.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return doctors.filter((doc) => {
      const specMatch = !spec || (doc.specialization || "").toLowerCase().includes(spec);
      const locMatch = !loc || (doc.location || "").toLowerCase().includes(loc);
      return specMatch && locMatch;
    });
  }, [doctors, specialization, location]);

  const hasFilters = specialization || location;

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <p className="section-eyebrow role-patient">Patient Portal</p>
            <h1 className="page-title">Available Doctors</h1>
          </div>
        </div>

        <form className="form-row" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label" htmlFor="specialization">Specialization</label>
            <input
              id="specialization"
              className="form-control"
              placeholder="e.g. Cardiology"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="location">Location</label>
            <input
              id="location"
              className="form-control"
              placeholder="e.g. Building A"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setSpecialization(""); setLocation(""); }}
            >
              Clear
            </button>
          )}
        </form>

        {error && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{error}</span>
            <button className="btn btn-outline btn-sm" onClick={loadDoctors}>Retry</button>
          </div>
        )}

        {loading && <p className="page-subtitle">Loading doctors…</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="card empty-state">
            <p className="empty-state__icon">🩺</p>
            <p>{hasFilters ? "No doctors match your search." : "No approved doctors yet."}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {hasFilters && (
              <p className="search-meta">
                {filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found
              </p>
            )}
            <div className="grid-3">
              {filtered.map((doc) => (
                <div key={doc.doctorId} className="card doctor-card">
                  <div
                    className="doctor-appt-avatar"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {initialsOf(doc.name)}
                  </div>
                  <div className="doctor-card__name">{doc.name}</div>
                  <div className="doctor-card__meta">
                    {doc.specialization}{doc.specialization && doc.location ? " · " : ""}{doc.location}
                  </div>
                  <Link
                    to={`/patient/book?doctorId=${doc.doctorId}`}
                    className="btn btn-primary btn-sm"
                  >
                    Book Appointment
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}