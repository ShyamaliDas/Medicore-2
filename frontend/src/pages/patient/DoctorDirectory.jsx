// src/pages/patient/DoctorDirectory.jsx
//
// THIS is the second pattern to memorize, alongside the form pattern in
// Login.jsx: useState -> useEffect (fetch on load) -> render.
// Every "list" page (appointments, prescriptions, medicines, donors...)
// is a copy of this exact shape with a different endpoint and a different
// table. Person A/B/C: duplicate this file's structure, don't invent a new
// one each time — consistency is what makes it memorizable.

import { useState, useEffect } from "react";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";

export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await apiRequest(ENDPOINTS.doctors, { method: "GET" });
        setDoctors(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []); // empty deps = run once when the page loads

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2>Available Doctors</h2>

        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>Rating</th>
                <th>Fee</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.doctorId}>
                  <td>{doc.name}</td>
                  <td>{doc.specialization}</td>
                  <td>{doc.rating}</td>
                  <td>${doc.visiting_fee}</td>
                  <td>{doc.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
