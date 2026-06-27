import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

// ─── helpers ──────────────────────────────────────────────────────────────

function initialsOf(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueForId(id) {
  if (!id) return 160;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function stockState(stock) {
  const n = Number(stock) || 0;
  if (n <= 0)  return { key: "out",    label: "Out of stock" };
  if (n <= 10) return { key: "low",    label: `Low · ${n} left` };
  return            { key: "ok",     label: `${n} in stock` };
}

const EMPTY_FORM = {
  name: "",
  category: "",
  price: "",
  stock: "",
  manufacturer: "",
  expiry_date: "",
};

// ─── identity header (mirrors doctor) ─────────────────────────────────────

function PharmacistHeader({ user, pharmacyName, totalMeds }) {
  const hue = hueForId(user?.userId || user?.email || "pharmacist");
  return (
    <div className="card doctor-profile-header">
      <div className="doctor-profile-identity">
        <div
          className="doctor-profile-avatar"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 55%, 60%), hsl(${(hue + 40) % 360}, 55%, 45%))`,
          }}
          aria-hidden
        >
          <span>{initialsOf(user?.name)}</span>
        </div>
        <div className="doctor-profile-id-text">
          <h1 className="doctor-profile-name">{user?.name || "Pharmacist"}</h1>
          <p className="doctor-profile-role">
            {pharmacyName || "Pharmacy"}
            <span className="badge badge-success" title="Pharmacy is currently open">
              ● Open
            </span>
          </p>
          <p className="doctor-profile-qual">
            Licensed pharmacist · {totalMeds} medicine{totalMeds === 1 ? "" : "s"} stocked
          </p>
        </div>
      </div>

      <div className="doctor-profile-actions">
        <Link to="/pharmacist/profile" className="btn btn-outline btn-sm">
          ⚙️ Pharmacy Profile
        </Link>
      </div>
    </div>
  );
}

// ─── metric tile (reused from doctor) ─────────────────────────────────────

function MetricTile({ tone, icon, label, value, loading }) {
  return (
    <div className={`metric-tile metric-tile--${tone}`}>
      <div className="metric-tile__icon" aria-hidden>{icon}</div>
      <div className="metric-tile__body">
        <div className="metric-tile__label">{label}</div>
        <div className="metric-tile__value">{loading ? "—" : value}</div>
      </div>
    </div>
  );
}

// ─── medicine row (reuses doctor-appt-list rhythm) ─────────────────────────

function MedicineRow({ med, onEdit, onDispense, onDelete }) {
  const st = stockState(med.stock);
  const hue = hueForId(med.medicine_id || med.name);
  const outOfStock = st.key === "out";

  return (
    <li className="doctor-appt-row">
      <div
        className="doctor-appt-avatar"
        style={{ background: `hsl(${hue}, 55%, 88%)`, color: `hsl(${hue}, 45%, 30%)` }}
        aria-hidden
      >
        {initialsOf(med.name)}
      </div>

      <div className="doctor-appt-body">
        <div className="doctor-appt-name">{med.name}</div>
        <div className="doctor-appt-meta">
          {med.category || "Uncategorised"}
          {med.manufacturer ? ` · ${med.manufacturer}` : ""}
          {med.expiry_date ? ` · exp ${med.expiry_date}` : ""}
        </div>
      </div>

      <div className="doctor-appt-right">
        <span className="doctor-appt-date">
          ৳{Number(med.price || 0).toFixed(2)}
        </span>
        <span className={`doctor-pill doctor-pill--${outOfStock ? "red" : st.key === "low" ? "amber" : "green"}`}>
          {st.label}
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(med)}
            disabled={outOfStock}
            title={outOfStock ? "Cannot dispense — out of stock" : "Edit details"}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onDispense(med)}
            disabled={outOfStock}
          >
            💊 Dispense
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onDelete(med)}
            title="Remove from inventory"
          >
            🗑
          </button>
        </div>
      </div>
    </li>
  );
}

// ─── modal (reuses .modal-* from Profile) ─────────────────────────────────

function MedicineModal({ open, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM);
  }, [open, initial]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">
            {initial ? "Edit medicine" : "Add medicine"}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={submit}>
          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Paracetamol 500mg"
              required
              autoFocus
            />
          </label>

          <div className="modal-row">
            <label className="modal-field">
              <span>Category</span>
              <input
                type="text"
                value={form.category}
                onChange={set("category")}
                placeholder="Analgesic, Antibiotic…"
              />
            </label>
            <label className="modal-field">
              <span>Price (৳)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={set("price")}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="modal-field">
              <span>Stock</span>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={set("stock")}
                placeholder="0"
              />
            </label>
            <label className="modal-field">
              <span>Expiry</span>
              <input
                type="date"
                value={form.expiry_date}
                onChange={set("expiry_date")}
              />
            </label>
          </div>

          <label className="modal-field">
            <span>Manufacturer</span>
            <input
              type="text"
              value={form.manufacturer}
              onChange={set("manufacturer")}
              placeholder="Beximco, Square…"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add to inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────

export default function PharmacistDashboard() {
  const { user } = useAuth();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [pharmacy, setPharmacy]   = useState(null);
  const [query, setQuery]         = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);

  // toast
  const [toast, setToast] = useState("");
  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  // ── load inventory + pharmacy profile ──
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const medsRes = await apiRequest(ENDPOINTS.medicines, { method: "GET" });
      // Response shape may be { data: [...] } or [...] — normalise.
      const list = Array.isArray(medsRes) ? medsRes : (medsRes?.data ?? []);
      setMedicines(list);
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // Pharmacy profile is best-effort — absence shouldn't break the page.
    apiRequest(ENDPOINTS.profile, { method: "GET" })
      .then((res) => setPharmacy(res?.data ?? null))
      .catch(() => {});
  }, []);

  // ── derived metrics ──
  const metrics = useMemo(() => {
    const total   = medicines.length;
    const out     = medicines.filter((m) => Number(m.stock) <= 0).length;
    const low     = medicines.filter((m) => {
      const n = Number(m.stock) || 0;
      return n > 0 && n <= 10;
    }).length;
    const cats    = new Set(
      medicines.map((m) => (m.category || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    return { total, low, out, categories: cats };
  }, [medicines]);

  const pharmacyName = pharmacy?.pharmacy_name || pharmacy?.name || "Pharmacy";

  // ── filtered list ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) =>
      [m.name, m.category, m.manufacturer].some(
        (v) => v && String(v).toLowerCase().includes(q)
      )
    );
  }, [medicines, query]);

  // ── handlers ──
  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (med) => { setEditing(med); setModalOpen(true); };

  const saveMedicine = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(ENDPOINTS.medicineById(editing.medicine_id), {
          method: "PUT",
          body: payload,
        });
        flashToast(`${payload.name} updated.`);
      } else {
        await apiRequest(ENDPOINTS.medicines, {
          method: "POST",
          body: payload,
        });
        flashToast(`${payload.name} added to inventory.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      flashToast(err.message || "Could not save medicine.");
    } finally {
      setSaving(false);
    }
  };

  const dispense = async (med) => {
    // Decrement stock by 1 — the prescription side of the app handles
    // patient/doctor linkage separately.
    try {
      await apiRequest(ENDPOINTS.medicineById(med.medicine_id), {
        method: "PUT",
        body: { ...med, stock: Math.max(0, Number(med.stock) - 1) },
      });
      flashToast(`Dispensed 1 × ${med.name}.`);
      await load();
    } catch (err) {
      flashToast(err.message || "Dispense failed.");
    }
  };

  const remove = async (med) => {
    if (!window.confirm(`Remove "${med.name}" from inventory?`)) return;
    try {
      await apiRequest(ENDPOINTS.medicineById(med.medicine_id), { method: "DELETE" });
      flashToast(`${med.name} removed.`);
      await load();
    } catch (err) {
      flashToast(err.message || "Delete failed.");
    }
  };

  // ── render ──
  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* Page header */}
        <div className="page-header" style={{ borderBottom: "none", marginBottom: 8 }}>
          <div>
            <p className="section-eyebrow">Pharmacist Portal</p>
            <h1 className="section-title">Inventory</h1>
            <div className="accent-line" />
            <p className="page-subtitle">
              Welcome back, {user?.name}. Stock, price, and dispense from here.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={load}>
              ↻ Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
              ➕ Add medicine
            </button>
          </div>
        </div>

        {/* Identity */}
        <PharmacistHeader user={user} pharmacyName={pharmacyName} totalMeds={metrics.total} />

        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ marginTop: 16 }}>{toast}</div>
        )}
        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
        )}

        {/* Metric tiles */}
        <div className="doctor-metrics" style={{ marginTop: 20 }}>
          <MetricTile tone="purple" icon="💊" label="Total medicines" value={metrics.total}       loading={loading} />
          <MetricTile tone="orange" icon="⚠️" label="Low stock"      value={metrics.low}         loading={loading} />
          <MetricTile tone="pink"   icon="🚫" label="Out of stock"   value={metrics.out}         loading={loading} />
          <MetricTile tone="green"  icon="🏷" label="Categories"     value={metrics.categories}  loading={loading} />
        </div>

        {/* Search + list */}
        <section className="card" style={{ marginTop: 20, padding: "20px 22px" }}>
          <div className="doctor-section__head">
            <h3 className="doctor-section__title">Medicines in stock</h3>
            <input
              type="search"
              className="modal-field__input"
              style={{
                maxWidth: 240,
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
              placeholder="Search by name, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="text-muted small">Loading inventory…</p>
          ) : filtered.length === 0 ? (
            <div className="state-empty">
              {medicines.length === 0
                ? "No medicines yet. Click “Add medicine” to stock your first item."
                : `No matches for “${query}”.`}
            </div>
          ) : (
            <ul className="doctor-appt-list">
              {filtered.map((med) => (
                <MedicineRow
                  key={med.medicine_id || med.name}
                  med={med}
                  onEdit={openEdit}
                  onDispense={dispense}
                  onDelete={remove}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <MedicineModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={saveMedicine}
        saving={saving}
      />
    </>
  );
}