import { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const INITIAL_FORM = { date: "", symptoms: "", transaction_id: "" };

function initialsOf(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function BookAppointment() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All");

  const [modalDoctor, setModalDoctor] = useState(null); // the doctor currently being booked, or null
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const [alert, setAlert] = useState({ type: "", message: "" });
  const [bookedData, setBookedData] = useState(null);

  useEffect(() => {
    apiRequest(ENDPOINTS.doctors, { auth: true })
      .then((res) => { if (res.success) setDoctors(res.data ?? []); })
      .catch(() => {});
  }, []);

  const chips = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return ["All", ...specs];
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      const chipMatch = activeChip === "All" || d.specialization === activeChip;
      const searchMatch = !q || (d.name || "").toLowerCase().includes(q);
      return chipMatch && searchMatch;
    });
  }, [doctors, search, activeChip]);

  function openModal(doc) {
    setModalDoctor(doc);
    setForm(INITIAL_FORM);
    setModalError("");
  }

  function closeModal() {
    setModalDoctor(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setModalError("");

    if (!form.date || !form.symptoms || !form.transaction_id) {
      setModalError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        doctor_id: modalDoctor.doctorId,
        doctor_name: modalDoctor.name,
        ...form,
      };
      const res = await apiRequest(ENDPOINTS.appointments, {
        method: "POST",
        body,
        auth: true,
      });
      if (res?.success) {
        setBookedData(res.data);
        setAlert({ type: "success", message: res.message ?? "Appointment booked successfully!" });
        closeModal();
      } else {
        setModalError(res?.message ?? "Failed to book appointment.");
      }
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">Book an Appointment</h1>
          <div className="accent-line"></div>
        </div>

        {alert.message && (
          <div className={`alert ${alert.type === "success" ? "alert-success" : "alert-error"}`}>
            {alert.message}
          </div>
        )}

        {bookedData && (
          <div className="card confirm-card">
            <p className="section-eyebrow role-patient confirm-card__eyebrow">
              Appointment Confirmed
            </p>
            <p className="confirm-card__row"><strong>Prescription ID:</strong> {bookedData.prescriptionID}</p>
            <p className="confirm-card__row"><strong>Doctor:</strong> {bookedData.doctor_info?.name} ({bookedData.doctor_info?.specialization})</p>
            <p className="confirm-card__row"><strong>Location:</strong> {bookedData.location}</p>
            <p className="confirm-card__row"><strong>Date:</strong> {bookedData.date}</p>
            <p className="confirm-card__row"><strong>Serial No:</strong> {bookedData.serial_no}</p>
          </div>
        )}

        {/* ── Search ── */}
        <div className="docbook-toolbar">
          <div className="docbook-search">
            <span className="docbook-search__icon">🔍</span>
            <input
              className="form-control"
              placeholder="Search Doctor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Specialty chips ── */}
        <div className="docbook-chips">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`docbook-chip ${activeChip === chip ? "docbook-chip--active" : ""}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* ── Doctor card grid ── */}
        <div className="docbook-grid">
          {filtered.map((doc) => (
            <div key={doc.doctorId} className="docbook-card">
              <div className="docbook-card__top">
                <div className="doctor-appt-avatar docbook-card__avatar">
                  {initialsOf(doc.name)}
                </div>
                <div className="docbook-card__head">
                  <p className="docbook-card__name">{doc.name}</p>
                  <p className="docbook-card__loc">{doc.location || "—"}</p>
                </div>
                {doc.specialization && (
                  <span className="badge badge-accent docbook-card__tag">{doc.specialization}</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm docbook-card__cta"
                onClick={() => openModal(doc)}
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="state-empty" style={{ marginTop: 12 }}>
            No doctors match your search.
          </div>
        )}
      </div>

      {/* ── Booking modal ── */}
      {modalDoctor && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card docbook-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Book {modalDoctor.name}</span>
              <button type="button" className="modal-close" onClick={closeModal}>×</button>
            </div>

            {modalError && <div className="alert alert-error">{modalError}</div>}

            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="modal-field">
                <span>Appointment Date</span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                />
              </label>

              <label className="modal-field">
                <span>Symptoms / Reason for Visit</span>
                <textarea
                  name="symptoms"
                  rows={3}
                  placeholder="Describe your symptoms..."
                  value={form.symptoms}
                  onChange={handleChange}
                />
              </label>

              <label className="modal-field">
                <span>Transaction ID</span>
                <input
                  type="text"
                  name="transaction_id"
                  placeholder="e.g. tx_abc123xyz789"
                  value={form.transaction_id}
                  onChange={handleChange}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}