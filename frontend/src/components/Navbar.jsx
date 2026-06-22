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

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="mc-nav">
      <div className="container mc-nav-inner">

        {/* Logo — image replaces the placeholder "M" mark */}
        <Link to={user ? `/${user.role}` : "/"} className="mc-logo">
          <img
            src={logo}
            alt="MediCore — Healthcare, Coordinated."
            style={{ height: 100, width: "auto"}}
          />
        </Link>

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
