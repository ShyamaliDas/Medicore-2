import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";

export default function PatientHistory() {
  const { patientId } = useParams();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest(
          ENDPOINTS.doctorPrescriptionsByPatient(patientId),
          { method: "GET" }
        );
        setPrescriptions(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="mb-0">Patient History</h2>
            <p className="text-muted mb-0">Patient ID: {patientId}</p>
          </div>
          <Link to="/doctor" className="btn btn-outline-secondary btn-sm">← Back to queue</Link>
        </div>

        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && prescriptions.length === 0 && (
          <div className="alert alert-info">
            No prescription history found for this patient.
          </div>
        )}

        {!loading && !error && prescriptions.length > 0 && (
          <div>
            {prescriptions.map((rx) => (
              <div key={rx.prescriptionID} className="border rounded p-3 mb-3">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <p className="mb-1">
                    <strong>Rx ID:</strong> {rx.prescriptionID}
                  </p>
                  <Link
                    to={`/doctor/prescriptions/${rx.prescriptionID}`}
                    className="btn btn-primary btn-sm"
                  >
                    Edit
                  </Link>
                </div>
                <p className="mb-1 text-muted">{rx.description || "No description yet"}</p>
                {rx.symptoms && (
                  <p className="mb-2 text-muted" style={{ fontSize: "0.9rem" }}>
                    <strong>Symptoms:</strong> {rx.symptoms}
                  </p>
                )}

                {rx.medicine_details && rx.medicine_details.length > 0 && (
                  <table className="table table-striped mt-2 mb-0">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.medicine_details.map((med, i) => (
                        <tr key={i}>
                          <td>{med.medicine_name}</td>
                          <td>{med.dosage}</td>
                          <td>{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}