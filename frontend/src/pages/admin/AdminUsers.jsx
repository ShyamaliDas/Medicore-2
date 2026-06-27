// src/pages/admin/AdminUsers.jsx
//
// Admin: full user directory with role-change and delete actions. A search
// box filters in the client so the table stays usable while the backend
// gradually adds server-side pagination / search.
//
// Backend endpoints (paths registered in ENDPOINTS):
//   GET    /admin/users                  -> [{ userId, name, email, role, phone, bloodGroup, createdAt }]
//   PATCH  /admin/users/{id}/role        body: { role }
//   DELETE /admin/users/{id}
//
// Note: admin must NOT be able to delete themselves. We block the delete
// button when the row's userId matches the logged-in admin's id.

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const ROLES = ["patient", "doctor", "pharmacist", "admin"];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busy, setBusy] = useState({}); // userId -> "delete"
  // Confirmation state for delete
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(ENDPOINTS.adminUsers, { auth: true });
      setUsers(res?.data ?? res ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const roleMatch = roleFilter === "all" || (u.role || "").toLowerCase() === roleFilter;
      if (!roleMatch) return false;
      if (!q) return true;
      const haystack = [u.name, u.email, u.phone, u.userId]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, roleFilter]);

  async function handleDelete(u) {
    setBusy((b) => ({ ...b, [u.userId]: "delete" }));
    try {
      await apiRequest(ENDPOINTS.adminDeleteUser(u.userId), {
        method: "DELETE",
        auth: true,
      });
      setUsers((prev) => prev.filter((row) => row.userId !== u.userId));
      setConfirmDelete(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[u.userId]; return n; });
    }
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <p className="section-eyebrow role-admin">Admin Portal</p>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">View all users and remove accounts.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{error}</span>
            <button className="btn btn-outline btn-sm" onClick={loadUsers}>Retry</button>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="user-search">Search</label>
            <input
              id="user-search"
              className="form-control"
              placeholder="Name, email, phone, or user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-role">Role</label>
            <select
              id="user-role"
              className="form-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="page-subtitle">Loading users…</p>
        ) : filtered.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state__icon">👥</p>
            <p>{search || roleFilter !== "all" ? "No users match your filters." : "No users registered yet."}</p>
          </div>
        ) : (
          <p className="search-meta">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Blood Group</th>
                  <th>Role</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.userId && me?.userId && u.userId === me.userId;
                  const rowBusy = busy[u.userId];
                  return (
                    <tr key={u.userId}>
                      <td>
                        {u.name ?? "—"}
                        {isSelf && (
                          <span className="badge badge-accent" style={{ marginLeft: 8 }}>You</span>
                        )}
                      </td>
                      <td>{u.email ?? "—"}</td>
                      <td>{u.phone ?? "—"}</td>
                      <td>
                        {u.bloodGroup ?? u.blood_group ?? "—"}
                      </td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "badge-accent" : "badge-neutral"}`}>
                          {u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={!!rowBusy || isSelf}
                          onClick={() => setConfirmDelete(u)}
                        >
                          {rowBusy === "delete" ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Delete confirmation modal ──────────────────────────────── */}
        {confirmDelete && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000, padding: 20,
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="card"
              style={{ maxWidth: 420, width: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="section-eyebrow" style={{ color: "#DC2626" }}>Confirm Deletion</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Delete user?</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.55 }}>
                You're about to permanently remove{" "}
                <strong style={{ color: "var(--text)" }}>{confirmDelete.name ?? confirmDelete.email ?? confirmDelete.userId}</strong>.
                This cannot be undone.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDelete(null)}
                  disabled={busy[confirmDelete.userId] === "delete"}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={busy[confirmDelete.userId] === "delete"}
                >
                  {busy[confirmDelete.userId] === "delete" ? "Deleting…" : "Delete User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
