import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const INITIAL_FORM = {
  doctor_id: "",
  date: "",
  symptoms: "",
  transaction_id: "",
};

export default function BookAppointment() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [bookedData, setBookedData] = useState(null);

  useEffect(() => {
    apiRequest(ENDPOINTS.doctors, { auth: true })
      .then((res) => { if (res.success) setDoctors(res.data ?? []); })
      .catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert({ type: "", message: "" });
    setBookedData(null);

    if (!form.doctor_id || !form.date || !form.symptoms || !form.transaction_id) {
      setAlert({ type: "error", message: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest(ENDPOINTS.appointments, {
        method: "POST",
        body: form,
        auth: true,
      });
      if (res.success) {
        setBookedData(res.data);
        setAlert({ type: "success", message: res.message ?? "Appointment booked successfully!" });
        setForm(INITIAL_FORM);
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to book appointment." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
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

        <div className="form-max-width">
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

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="doctor_id">Select Doctor</label>
              <select
                id="doctor_id"
                name="doctor_id"
                className="form-control"
                value={form.doctor_id}
                onChange={handleChange}
              >
                <option value="">— Choose a doctor —</option>
                {doctors.map((doc) => (
                  <option key={doc.doctorId} value={doc.doctorId}>
                    {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ""}{doc.visiting_fee ? ` (৳${doc.visiting_fee})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date">Appointment Date</label>
              <input
                id="date"
                type="date"
                name="date"
                className="form-control"
                value={form.date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="symptoms">Symptoms / Reason for Visit</label>
              <textarea
                id="symptoms"
                name="symptoms"
                className="form-control"
                rows={4}
                placeholder="Describe your symptoms..."
                value={form.symptoms}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="transaction_id">Transaction ID</label>
              <input
                id="transaction_id"
                type="text"
                name="transaction_id"
                className="form-control"
                placeholder="e.g. tx_abc123xyz789"
                value={form.transaction_id}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Booking…" : "Book Appointment"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}