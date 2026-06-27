// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/medicoreLogo.png";

const ROLE_LABELS = {
  patient:    "Patient",
  doctor:     "Doctor",
  pharmacist: "Pharmacist",
  admin:      "Admin",
};

// Role-specific nav links shown in the navbar
const ROLE_LINKS = {
  patient: [
    { to: "/patient",              label: "Dashboard" },
    { to: "/patient/book",         label: "Book" },
    { to: "/patient/appointments", label: "Appointments" },
    { to: "/patient/prescriptions",label: "Prescriptions" },
    { to: "/patient/chat",         label: "Chat" },
    { to: "/patient/donors",       label: "Blood Donors" },
  ],
  doctor: [
    { to: "/doctor", label: "Appointments" },
    { to: "/doctor/patient-history", label: "Patient History" },
    { to: "/doctor/chat", label: "Chat" },
    { to: "/doctor/profile", label: "Profile" },
  ],
  pharmacist: [
    { to: "/pharmacist", label: "Dashboard" },
    { to: "/pharmacist/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin",          label: "Dashboard" },
    { to: "/admin/doctors",  label: "Doctors" },
    { to: "/admin/users",    label: "Users" },
    { to: "/admin/donors",   label: "Donors" },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = user ? (ROLE_LINKS[user.role] ?? []) : [];

  return (
    <nav className="mc-nav">
      <div className="container mc-nav-inner">

        {/* Logo */}
        <Link to={user ? `/${user.role}` : "/"} className="mc-logo">
          <img
            src={logo}
            alt="MediCore"
            style={{ height: 100, width: "auto", objectFit: "contain" }}
          />
        </Link>

        {/* Role nav links */}
        {links.length > 0 && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="mc-nav-actions">
          {user ? (
            <>
              <span className="mc-nav-user">{user.name}</span>
              <span className="mc-nav-role">{ROLE_LABELS[user.role] ?? user.role}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"  className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}