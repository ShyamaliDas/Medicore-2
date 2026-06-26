import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

export default function PrescriptionsByDoctor() {
  const [doctors, setDoctors] = useState([]);
  const [doctorsError, setDoctorsError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [error, setError] = useState("");

  function loadDoctors() {
    setDoctorsError("");
    apiRequest(ENDPOINTS.doctors, { auth: true })
      .then((res) => { if (res.success) setDoctors(res.data ?? []); })
      .catch((err) => setDoctorsError(err.message || "Failed to load doctors."));
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setError("");
    setPrescriptions([]);
    setLoading(true);
    setFetchedOnce(false);

    try {
      const res = await apiRequest(ENDPOINTS.prescriptionsByDoctor(selectedDoctorId), { auth: true });
      if (res.success) setPrescriptions(res.data ?? []);
      else setError(res.message ?? "Failed to fetch prescriptions.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setFetchedOnce(true);
    }
  }

  const selectedDoctor = doctors.find((d) => d.doctorId === selectedDoctorId);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">Prescriptions by Doctor</h1>
          <div className="accent-line"></div>
          <p className="page-subtitle">Filter your prescription history by a specific doctor.</p>
        </div>

        <form className="form-row" onSubmit={handleSearch}>
          <div className="form-group">
            <label className="form-label" htmlFor="doctor_select">Select Doctor</label>
            <select
              id="doctor_select"
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">— Choose a doctor —</option>
              {doctors.map((doc) => (
                <option key={doc.doctorId} value={doc.doctorId}>
                  {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!selectedDoctorId || loading}>
            {loading ? "Loading…" : "Search"}
          </button>
        </form>

        {doctorsError && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>Couldn't load doctors: {doctorsError}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadDoctors}>Retry</button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {fetchedOnce && !loading && !error && (
          <>
            {selectedDoctor && (
              <p className="search-meta">
                Showing {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} from <strong>{selectedDoctor.name}</strong>
              </p>
            )}

            {prescriptions.length === 0 ? (
              <div className="card empty-state">
                <p className="empty-state__icon">📄</p>
                <p>No prescriptions found for this doctor.</p>
              </div>
            ) : (
              <div className="prescription-list">
                {prescriptions.map((rx) => (
                  <div key={rx.prescriptionID} className="card">
                    <div className="prescription-card__header">
                      <span className="badge role-patient">{rx.prescriptionID}</span>
                      {rx.transaction_id && (
                        <span className="prescription-card__txn">TXN: {rx.transaction_id}</span>
                      )}
                    </div>

                    <div className="prescription-card__section">
                      <p className="prescription-card__section-label">Symptoms</p>
                      <p className="prescription-card__text">{rx.symptoms}</p>
                    </div>

                    {rx.description && (
                      <div className="prescription-card__section">
                        <p className="prescription-card__section-label">Doctor's Notes</p>
                        <p className="prescription-card__text">{rx.description}</p>
                      </div>
                    )}

                    {rx.medicine_details?.length > 0 && (
                      <div className="prescription-card__medicines">
                        <p className="prescription-card__section-label">Medicines</p>
                        <div className="mc-table-wrap">
                          <table className="mc-table">
                            <thead>
                              <tr>
                                <th>Medicine</th>
                                <th>Dosage</th>
                                <th>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rx.medicine_details.map((med, idx) => (
                                <tr key={idx}>
                                  <td>{med.medicine_name}</td>
                                  <td>{med.dosage}</td>
                                  <td>{med.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}