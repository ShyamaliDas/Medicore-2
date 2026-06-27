import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodDonor() {
  const { user } = useAuth();

  const [lastdate, setLastdate] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerAlert, setRegisterAlert] = useState({ type: "", message: "" });
  const [donorProfile, setDonorProfile] = useState(null);

  const [bloodGroup, setBloodGroup] = useState("");
  const [donors, setDonors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Update-date tab state
  const [myDonation, setMyDonation] = useState(null);
  const [updateDate, setUpdateDate] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateAlert, setUpdateAlert] = useState({ type: "", message: "" });
  const [updateLoadingRecord, setUpdateLoadingRecord] = useState(false);
  const [updateRecordMessage, setUpdateRecordMessage] = useState("");

  const [activeTab, setActiveTab] = useState("register");
  // Tracks whether the initial /me/donation lookup has resolved so the
  // Register tab doesn't flash the form before we know the user is already
  // registered.
  const [registerBootstrapped, setRegisterBootstrapped] = useState(false);

  // Bootstrap: on mount and whenever the Register tab becomes active, fetch
  // the user's existing donor record (if any) so a refresh doesn't drop
  // them back into the registration form.
  async function bootstrapRegistration() {
    try {
      const res = await apiRequest(ENDPOINTS.myDonation, { auth: true });
      if (res?.success && res?.data) {
        setDonorProfile(res.data);
      } else {
        setDonorProfile(null);
      }
    } catch {
      // Silent — 404 / network errors fall through to the registration form.
      setDonorProfile(null);
    } finally {
      setRegisterBootstrapped(true);
    }
  }

  async function loadMyDonation() {
    setUpdateLoadingRecord(true);
    setUpdateRecordMessage("");
    try {
      const res = await apiRequest(ENDPOINTS.myDonation, { auth: true });
      if (res?.success && res?.data) {
        setMyDonation(res.data);
        setUpdateDate(res.data.lastdate || "");
      } else {
        setMyDonation(null);
        setUpdateRecordMessage(res?.message ?? "No donor record found. Please register first.");
      }
    } catch (err) {
      setMyDonation(null);
      setUpdateRecordMessage(getErrorMessage(err));
    } finally {
      setUpdateLoadingRecord(false);
    }
  }

  useEffect(() => {
    if (activeTab === "register") bootstrapRegistration();
    if (activeTab === "update") loadMyDonation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleUpdateDate(e) {
    e.preventDefault();
    if (!updateDate) {
      setUpdateAlert({ type: "error", message: "Please pick a date." });
      return;
    }
    setUpdateLoading(true);
    setUpdateAlert({ type: "", message: "" });
    try {
      const res = await apiRequest(ENDPOINTS.updateDonationDate, {
        method: "PUT",
        body: { lastdate: updateDate },
        auth: true,
      });
      if (res?.success) {
        setUpdateAlert({ type: "success", message: res.message ?? "Donation date updated." });
        setMyDonation((prev) => (prev ? { ...prev, lastdate: updateDate } : prev));
      } else {
        setUpdateAlert({ type: "error", message: res?.message ?? "Failed to update date." });
      }
    } catch (err) {
      setUpdateAlert({ type: "error", message: getErrorMessage(err) });
    } finally {
      setUpdateLoading(false);
    }
  }

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
        setDonorProfile(res.data ?? {
          bloodBankId: "—",
          name: user?.name ?? "Donor",
          contactNo: user?.contactNo ?? "—",
          donorId: user?.id ?? user?._id ?? "—",
          lastdate,
          bloodgroup: user?.blood_group ?? "—",
        });
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
      if (res?.success) setDonors(res.data ?? []);
      else setSearchError(res?.message ?? "Failed to find donors.");
    } catch (err) {
      setSearchError(getErrorMessage(err));
    } finally {
      setSearchLoading(false);
      setSearchedOnce(true);
    }
  }

  function handleBloodGroupChange(e) {
    setBloodGroup(e.target.value);
    setDonors([]);
    setSearchError("");
    setSearchedOnce(false);
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
            onClick={() => {
              setActiveTab("search");
              setSearchError("");
              setDonors([]);
              setSearchedOnce(false);
            }}
          >
            🔍 Find Donors
          </button>
          <button
            className={`tab-btn ${activeTab === "update" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("update");
              setUpdateAlert({ type: "", message: "" });
            }}
          >
            📅 Update Donation Date
          </button>
        </div>

        {activeTab === "register" && (
          <div className="tab-panel form-max-width">
            {!registerBootstrapped ? (
              <p className="search-meta">Checking your donor record…</p>
            ) : donorProfile ? (
              <>
                <div className="donor-info-strip">
                  <span className="donor-info-strip__icon">🩸</span>
                  <div>
                    <p className="donor-info-strip__label">Donor Status</p>
                    <p className="donor-info-strip__value">Registered</p>
                  </div>
                </div>

                {registerAlert.message && (
                  <div className={`alert ${registerAlert.type === "success" ? "alert-success" : "alert-error"}`}>
                    {registerAlert.message}
                  </div>
                )}

                <div className="mc-table-wrap" style={{ marginTop: 8 }}>
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Blood Bank ID</th>
                        <th>Name</th>
                        <th>Blood Group</th>
                        <th>Contact</th>
                        <th>Last Donated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{donorProfile.bloodBankId}</td>
                        <td>{donorProfile.name}</td>
                        <td><span className="badge role-patient">{donorProfile.bloodgroup}</span></td>
                        <td>{donorProfile.contactNo}</td>
                        <td>{donorProfile.lastdate ? new Date(donorProfile.lastdate).toLocaleDateString() : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
                  onChange={handleBloodGroupChange}
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

            {searchError && (
              <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span>{searchError}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => bloodGroup && handleSearch({ preventDefault: () => {} })}
                >
                  Retry
                </button>
              </div>
            )}

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

        {activeTab === "update" && (
          <div className="tab-panel form-max-width">
            {updateLoadingRecord ? (
              <p className="search-meta">Loading your donor record…</p>
            ) : !myDonation ? (
              <>
                <div className="alert alert-error">{updateRecordMessage || "No donor record found. Please register first."}</div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveTab("register")}
                >
                  Go to Register
                </button>
              </>
            ) : (
              <>
                <div className="donor-info-strip">
                  <span className="donor-info-strip__icon">🩸</span>
                  <div>
                    <p className="donor-info-strip__label">Your Last Donation</p>
                    <p className="donor-info-strip__value">
                      {myDonation.lastdate
                        ? new Date(myDonation.lastdate).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                </div>

                {updateAlert.message && (
                  <div className={`alert ${updateAlert.type === "success" ? "alert-success" : "alert-error"}`}>
                    {updateAlert.message}
                  </div>
                )}

                <form onSubmit={handleUpdateDate}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update_lastdate">New Last Donation Date</label>
                    <input
                      id="update_lastdate"
                      type="date"
                      className="form-control"
                      value={updateDate}
                      onChange={(e) => setUpdateDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    <p className="form-hint">
                      Update the date whenever you donate again — keeps your donor record accurate.
                    </p>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={updateLoading}>
                    {updateLoading ? "Updating…" : "Update Date"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}