import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";

const EMPTY_MED = { medicine_name: "", dosage: "", duration: "" };

export default function WritePrescription() {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [medicines, setMedicines] = useState([{ ...EMPTY_MED }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleMedChange(index, e) {
    const { name, value } = e.target;
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [name]: value } : m))
    );
  }

  function addRow() {
    setMedicines((prev) => [...prev, { ...EMPTY_MED }]);
  }

  function removeRow(index) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest(ENDPOINTS.doctorPrescription(prescriptionId), {
        method: "PUT",
        body: { description, medicine_details: medicines },
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2>Write Prescription</h2>
        <p className="text-muted">Prescription ID: {prescriptionId}</p>

        {error && <div className="alert alert-danger">{error}</div>}

        {success ? (
          <div className="alert alert-success">
            Prescription saved successfully!{" "}
            <button
              className="btn btn-primary btn-sm ms-2"
              onClick={() => navigate("/doctor")}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 640 }}>
            <form onSubmit={handleSubmit}>

              <div className="mb-3">
                <label className="form-label">Description / Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Patient exhibits minor hypertension..."
                  required
                />
              </div>

              <h5 className="mt-4 mb-3">Medicine Details</h5>

              {medicines.map((med, i) => (
                <div key={i} className="border rounded p-3 mb-3">
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label">Medicine Name</label>
                      <input
                        className="form-control"
                        name="medicine_name"
                        value={med.medicine_name}
                        onChange={(e) => handleMedChange(i, e)}
                        placeholder="e.g. Lisinopril"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Dosage</label>
                      <input
                        className="form-control"
                        name="dosage"
                        value={med.dosage}
                        onChange={(e) => handleMedChange(i, e)}
                        placeholder="e.g. 10mg daily"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Duration</label>
                      <input
                        className="form-control"
                        name="duration"
                        value={med.duration}
                        onChange={(e) => handleMedChange(i, e)}
                        placeholder="e.g. 90 days"
                        required
                      />
                    </div>
                  </div>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-link text-danger p-0 mt-2"
                      onClick={() => removeRow(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-secondary w-100 mb-3"
                onClick={addRow}
              >
                + Add another medicine
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Prescription"}
              </button>

            </form>
          </div>
        )}
      </div>
    </>
  );
}