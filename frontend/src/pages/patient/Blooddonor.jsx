import { useState } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodDonor() {
  const { user } = useAuth();

  const [lastdate, setLastdate] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerAlert, setRegisterAlert] = useState({ type: "", message: "" });

  const [bloodGroup, setBloodGroup] = useState("");
  const [donors, setDonors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchedOnce, setSearchedOnce] = useState(false);

  const [activeTab, setActiveTab] = useState("register");

  async function handleRegister(e) {
    e.preventDefault();
    if (!lastdate) {
      setRegisterAlert({ type: "error", message: "Please enter your last donation date." });
      return;
    }

    setRegisterAlert({ type: "", message: "" });
    setRegisterLoading(true);

    try {
      const res = await apiRequest(ENDPOINTS.donorRegister, {
        method: "POST",
        body: { lastdate },
        auth: true,
      });
      if (res.success) {
        setRegisterAlert({ type: "success", message: res.message ?? "Donor profile registered successfully!" });
        setLastdate("");
      } else {
        setRegisterAlert({ type: "error", message: res.message ?? "Registration failed." });
      }
    } catch {
      setRegisterAlert({ type: "error", message: "Network error. Please try again." });
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!bloodGroup) return;

    setSearchError("");
    setDonors([]);
    setSearchLoading(true);
    setSearchedOnce(false);

    try {
      const res = await apiRequest(ENDPOINTS.donorsByGroup(bloodGroup), { auth: true });
      if (res.success) setDonors(res.data ?? []);
      else setSearchError(res.message ?? "Failed to find donors.");
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSearchLoading(false);
      setSearchedOnce(true);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">Blood Donor</h1>
          <div className="accent-line"></div>
          <p className="page-subtitle">Register as a blood donor or find donors by blood group.</p>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            🩸 Register as Donor
          </button>
          <button
            className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            🔍 Find Donors
          </button>
        </div>

        {activeTab === "register" && (
          <div className="tab-panel form-max-width">
            {user?.blood_group && (
              <div className="donor-info-strip">
                <span className="donor-info-strip__icon">🩸</span>
                <div>
                  <p className="donor-info-strip__label">Your Blood Group</p>
                  <p className="donor-info-strip__value">{user.blood_group}</p>
                </div>
              </div>
            )}

            {registerAlert.message && (
              <div className={`alert ${registerAlert.type === "success" ? "alert-success" : "alert-error"}`}>
                {registerAlert.message}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="lastdate">Last Donation Date</label>
                <input
                  id="lastdate"
                  type="date"
                  className="form-control"
                  value={lastdate}
                  onChange={(e) => setLastdate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
                <p className="form-hint">
                  Enter when you last donated blood, or today if this is your first time.
                </p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={registerLoading}>
                {registerLoading ? "Registering…" : "Register as Donor"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "search" && (
          <div className="tab-panel">
            <form className="form-row" onSubmit={handleSearch}>
              <div className="form-group">
                <label className="form-label" htmlFor="blood_group_select">Blood Group</label>
                <select
                  id="blood_group_select"
                  className="form-control"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">— Select blood group —</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={!bloodGroup || searchLoading}>
                {searchLoading ? "Searching…" : "Search"}
              </button>
            </form>

            {searchError && <div className="alert alert-error">{searchError}</div>}

            {searchedOnce && !searchLoading && !searchError && (
              <>
                <p className="search-meta">
                  {donors.length === 0
                    ? `No donors found for blood group ${bloodGroup}.`
                    : `${donors.length} donor${donors.length !== 1 ? "s" : ""} found for ${bloodGroup}`}
                </p>

                {donors.length > 0 && (
                  <div className="mc-table-wrap">
                    <table className="mc-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Blood Group</th>
                          <th>Contact</th>
                          <th>Last Donated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donors.map((donor) => (
                          <tr key={donor.bloodBankId}>
                            <td>{donor.name}</td>
                            <td><span className="badge role-patient">{donor.bloodgroup}</span></td>
                            <td>{donor.contactNo}</td>
                            <td>{donor.lastdate ? new Date(donor.lastdate).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}