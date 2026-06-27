import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";

function hueForId(id) {
  if (!id) return 200;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseApptDate(s) {
  if (!s || s === "N/A") return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function formatDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Top-level "Patient History" landing for doctors. Lists every
 * patient the doctor has ever seen, with the most recent visit
 * date and a link into the per-patient history detail.
 */
export default function PatientHistoryList() {
  const [appointments, setAppointments] = useState({ incomplete: [], complete: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest(ENDPOINTS.doctorAppointments, { method: "GET" })
      .then((res) => {
        if (cancelled) return;
        setAppointments(res?.data ?? { incomplete: [], complete: [] });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Group every appointment by patient_id so the table can show
  // "name — last visit date — total visits — view history".
  const rows = useMemo(() => {
    const all = [
      ...(appointments.incomplete || []),
      ...(appointments.complete || []),
    ];
    const byId = new Map();
    for (const a of all) {
      if (!a?.patient_id) continue;
      const d = parseApptDate(a.date);
      const existing = byId.get(a.patient_id);
      if (!existing) {
        byId.set(a.patient_id, {
          patientId: a.patient_id,
          name: a.name || `Patient ${a.patient_id}`,
          phone: a.phone || "",
          lastDate: d,
          visits: 1,
        });
      } else {
        existing.visits += 1;
        if (d && (!existing.lastDate || d > existing.lastDate)) {
          existing.lastDate = d;
          existing.name = a.name || existing.name;
          existing.phone = a.phone || existing.phone;
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      const da = a.lastDate?.getTime() ?? 0;
      const db = b.lastDate?.getTime() ?? 0;
      return db - da;
    });
  }, [appointments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div className="page-header" style={{ borderBottom: "none", marginBottom: 16 }}>
          <div>
            <p className="section-eyebrow">Doctor Portal</p>
            <h1 className="section-title">Patient History</h1>
            <div className="accent-line" />
            <p className="page-subtitle">
              Everyone you've ever seen — pick a patient to open their full record.
            </p>
          </div>
          <Link to="/doctor" className="btn btn-outline btn-sm">← Back to queue</Link>
        </div>

        <div className="card-sm" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label htmlFor="patient-search" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            Search
          </label>
          <input
            id="patient-search"
            type="text"
            className="form-control"
            placeholder="Name or phone…"
            style={{ maxWidth: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {filtered.length} of {rows.length} patient{rows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && <p className="page-subtitle">Loading…</p>}

        {!loading && !error && rows.length === 0 && (
          <div className="state-empty">
            No patient history yet — they'll appear here after you see someone.
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Last Visit</th>
                  <th>Visits</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const phue = hueForId(r.patientId);
                  return (
                    <tr key={r.patientId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            className="doctor-appt-avatar"
                            style={{ background: `hsl(${phue}, 55%, 88%)`, color: `hsl(${phue}, 45%, 30%)` }}
                            aria-hidden
                          >
                            {initialsOf(r.name)}
                          </div>
                          <span style={{ fontWeight: 500 }}>{r.name}</span>
                        </div>
                      </td>
                      <td>{r.phone || "—"}</td>
                      <td>{formatDate(r.lastDate)}</td>
                      <td>
                        <span className="badge badge-accent">{r.visits}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/doctor/patient/${r.patientId}`}
                          className="btn btn-primary btn-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
