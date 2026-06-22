import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(ENDPOINTS.prescriptions, { auth: true })
      .then((res) => {
        if (res.success) setPrescriptions(res.data ?? []);
        else setError(res.message ?? "Failed to load prescriptions.");
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">My Prescriptions</h1>
          <div className="accent-line"></div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="page-subtitle">Loading prescriptions…</p>
        ) : prescriptions.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state__icon">📄</p>
            <p>No prescriptions found.</p>
          </div>
        ) : (
          <div className="prescription-list">
            {prescriptions.map((rx) => (
              <div key={rx.prescriptionID} className="card">
                <div className="prescription-card__header">
                  <div>
                    <span className="badge role-patient">{rx.prescriptionID}</span>
                    <p className="prescription-card__meta">Doctor ID: {rx.doctorId}</p>
                  </div>
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
      </div>
    </>
  );
}