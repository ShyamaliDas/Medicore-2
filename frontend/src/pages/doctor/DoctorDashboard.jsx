import { useState, useEffect } from "react";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [incomplete, setIncomplete] = useState([]);
  const [complete, setComplete] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest(ENDPOINTS.doctorAppointments, { method: "GET" });
        setIncomplete(res.data.incomplete || []);
        setComplete(res.data.complete || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function AppointmentTable({ rows, label }) {
    if (rows.length === 0) return null;
    return (
      <div className="mb-4">
        <h5 className="mb-2">{label}</h5>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>#</th>
              <th>Patient Name</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Symptoms</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((appt) => (
              <tr key={appt.serial_no}>
                <td>{appt.serial_no}</td>
                <td>{appt.name}</td>
                <td>{appt.phone}</td>
                <td>{appt.date}</td>
                <td>{appt.symptoms}</td>
                <td>
                  {label === "Pending" ? (
                    <Link
                      to={`/doctor/patient/${appt.patient_id}`}
                      className="btn btn-primary btn-sm"
                    >
                      View Patient
                    </Link>
                  ) : (
                    <span className="badge bg-success">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2>Welcome, Dr. {user?.name}</h2>
        <p className="text-muted">Your appointment queue</p>

        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && incomplete.length === 0 && complete.length === 0 && (
          <div className="alert alert-info">No appointments found.</div>
        )}

        {!loading && !error && (
          <>
            <AppointmentTable rows={incomplete} label="Pending" />
            <AppointmentTable rows={complete} label="Completed" />
          </>
        )}
      </div>
    </>
  );
}