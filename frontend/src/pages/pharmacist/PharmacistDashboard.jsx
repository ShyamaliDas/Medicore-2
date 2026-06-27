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
  if (n <= 0)  return { key: "out", label: "Out of stock" };
  if (n <= 10) return { key: "low", label: `Low · ${n} left` };
  return            { key: "ok",  label: `${n} in stock` };
}

const EMPTY_FORM = {
  name: "",
  category: "",
  price: "",
  stock: "",
  manufacturer: "",
  expiry_date: "",
};

const EMPTY_STOCK_FORM = {
  stock: "",
};

// ─── identity header ─────────────────────────────────────────────────────

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

// ─── metric tile ─────────────────────────────────────────────────────────

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

// ─── medicine row (per-row Update Stock button) ──────────────────────────

function MedicineRow({ med, onEditDetails, onUpdateStock, onDelete }) {
  const st = stockState(med.quantity);
  const hue = hueForId(med.medicineId || med.name);
  const outOfStock = st.key === "out";
  const displayName = med.name && med.name.trim().length > 0 ? med.name : <em style={{ color: "var(--text-muted)" }}>(unnamed)</em>;

  return (
    <li className="doctor-appt-row">
      <div
        className="doctor-appt-avatar"
        style={{ background: `hsl(${hue}, 55%, 88%)`, color: `hsl(${hue}, 45%, 30%)` }}
        aria-hidden
      >
        {initialsOf(med.name || med.medicineId)}
      </div>

      <div className="doctor-appt-body">
        <div className="doctor-appt-name">{displayName}</div>
        <div className="doctor-appt-meta">
          {med.category || "Uncategorised"}
          {med.manufacturer ? ` · ${med.manufacturer}` : ""}
          {med.expiryDate || med.expiry_date ? ` · exp ${med.expiryDate || med.expiry_date}` : ""}
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
            className="btn btn-primary btn-sm"
            onClick={() => onUpdateStock(med)}
            title="Update stock quantity for this medicine"
          >
            📦 Update Stock
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEditDetails(med)}
            title="Edit name, price, category, manufacturer, expiry"
          >
            ✏️ Edit
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

// ─── modals ──────────────────────────────────────────────────────────────

function MedicineModal({ open, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              ...EMPTY_FORM,
              name:         initial.name || "",
              category:     initial.category || "",
              price:        initial.price ?? "",
              stock:        initial.quantity ?? "",
              manufacturer: initial.manufacturer || "",
              expiry_date:  initial.expiryDate || initial.expiry_date || "",
            }
          : EMPTY_FORM
      );
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name:         form.name.trim(),
      category:     form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      expiry_date:  form.expiry_date,
      price:        Number(form.price) || 0,
      stock:        Number(form.stock) || 0,
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
            <span>Name *</span>
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

function StockModal({ open, med, onClose, onSave, saving }) {
  const [stock, setStock] = useState("");
  const [mode, setMode]   = useState("set"); // "set" | "add"

  useEffect(() => {
    if (open) {
      setStock(med?.quantity != null ? String(med.quantity) : "");
      setMode("set");
    }
  }, [open, med]);

  if (!open || !med) return null;

  const submit = (e) => {
    e.preventDefault();
    const n = Number(stock);
    if (Number.isNaN(n) || n < 0) return;
    let next = n;
    if (mode === "add") next = (Number(med.quantity) || 0) + n;
    onSave({ ...med, quantity: next });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Update stock — {med.name || med.medicineId}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={submit}>
          <p className="text-muted small" style={{ marginTop: 0 }}>
            Current stock: <strong>{med.quantity ?? 0}</strong>
          </p>

          <div className="modal-row" style={{ gap: 8 }}>
            <label
              className="btn btn-outline btn-sm"
              style={{
                flex: 1, justifyContent: "center",
                background: mode === "set" ? "var(--accent-bg)" : "transparent",
                borderColor: mode === "set" ? "var(--accent)" : undefined,
              }}
            >
              <input
                type="radio"
                name="mode"
                value="set"
                checked={mode === "set"}
                onChange={() => setMode("set")}
                style={{ marginRight: 6 }}
              />
              Set to value
            </label>
            <label
              className="btn btn-outline btn-sm"
              style={{
                flex: 1, justifyContent: "center",
                background: mode === "add" ? "var(--accent-bg)" : "transparent",
                borderColor: mode === "add" ? "var(--accent)" : undefined,
              }}
            >
              <input
                type="radio"
                name="mode"
                value="add"
                checked={mode === "add"}
                onChange={() => setMode("add")}
                style={{ marginRight: 6 }}
              />
              Add to current
            </label>
          </div>

          <label className="modal-field">
            <span>{mode === "set" ? "New stock value" : "Quantity to add"}</span>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              autoFocus
              required
            />
          </label>

          <p className="text-muted small">
            {mode === "set"
              ? `Will set stock to ${Number(stock) || 0}.`
              : `Will add ${Number(stock) || 0} to current ${med.quantity ?? 0} → ${(Number(med.quantity) || 0) + (Number(stock) || 0)}.`}
          </p>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : "Update stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── inventory tab ───────────────────────────────────────────────────────

function InventoryTab({
  medicines, loading, error, query, setQuery,
  onAdd, onEditDetails, onUpdateStock, onDelete, onRefresh,
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) =>
      [m.name, m.category, m.manufacturer].some(
        (v) => v && String(v).toLowerCase().includes(q)
      )
    );
  }, [medicines, query]);

  const metrics = useMemo(() => {
    const total = medicines.length;
    const out   = medicines.filter((m) => Number(m.quantity) <= 0).length;
    const low   = medicines.filter((m) => {
      const n = Number(m.quantity) || 0;
      return n > 0 && n <= 10;
    }).length;
    const cats  = new Set(
      medicines.map((m) => (m.category || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    return { total, low, out, categories: cats };
  }, [medicines]);

  return (
    <>
      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
          ➕ Add medicine
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Metric tiles */}
      <div className="doctor-metrics">
        <MetricTile tone="purple" icon="💊" label="Total medicines" value={metrics.total}       loading={loading} />
        <MetricTile tone="orange" icon="⚠️" label="Low stock"      value={metrics.low}         loading={loading} />
        <MetricTile tone="pink"   icon="🚫" label="Out of stock"   value={metrics.out}         loading={loading} />
        <MetricTile tone="green"  icon="🏷" label="Categories"     value={metrics.categories}  loading={loading} />
      </div>

      {/* List */}
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
                key={med.medicineId || med.name}
                med={med}
                onEditDetails={onEditDetails}
                onUpdateStock={onUpdateStock}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ─── search prescription tab ─────────────────────────────────────────────

function SearchPrescriptionTab() {
  const [email, setEmail]         = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult]       = useState(null);   // full success payload
  const [error, setError]         = useState("");

  async function handleSearch(e) {
    e?.preventDefault?.();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter a patient email.");
      return;
    }
    setSearching(true);
    setError("");
    setResult(null);
    try {
      const res = await apiRequest(ENDPOINTS.pharmacistSearchPrescription(trimmed), {
        method: "GET",
        auth: true,
      });
      if (!res?.success) {
        setError(res?.message || "No prescription found.");
      } else {
        setResult(res);
      }
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <section className="card" style={{ marginTop: 20, padding: "20px 22px" }}>
        <div className="doctor-section__head" style={{ marginBottom: 12 }}>
          <h3 className="doctor-section__title">Search prescription by patient email</h3>
        </div>
        <p className="text-muted small" style={{ marginTop: 0 }}>
          Enter the patient's email to load their most recent prescription. We will show
          the medicines, dosage, and duration prescribed.
        </p>

        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@example.com"
            className="modal-field__input"
            style={{
              flex: "1 1 260px",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 14,
            }}
            required
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={searching}
            style={{ alignSelf: "stretch" }}
          >
            {searching ? "Searching…" : "🔍 Search"}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}
      </section>

      {result?.data && (
        <PrescriptionResult result={result.data} />
      )}
    </>
  );
}

function PrescriptionResult({ result }) {
  const meds = Array.isArray(result.medicines) ? result.medicines : [];

  return (
    <section className="card" style={{ marginTop: 16, padding: "20px 22px" }}>
      <div className="doctor-section__head" style={{ marginBottom: 12 }}>
        <h3 className="doctor-section__title">Last prescription</h3>
        <span className="badge badge-success">Found</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <InfoTile label="Patient ID"  value={result.patient_id} />
        <InfoTile label="Doctor ID"   value={result.doctor_id} />
        <InfoTile label="Symptoms"    value={result.symptoms} />
        <InfoTile label="Prescription ID" value={result.prescription_id} />
      </div>

      {result.description ? (
        <p className="text-muted small" style={{ marginTop: 0 }}>
          <strong>Notes:</strong> {result.description}
        </p>
      ) : null}

      <h4 style={{ margin: "16px 0 8px", fontSize: 14 }}>Medicines ({meds.length})</h4>

      {meds.length === 0 ? (
        <div className="state-empty">
          This prescription has no medicines listed.
        </div>
      ) : (
        <ul className="doctor-appt-list">
          {meds.map((m, idx) => (
            <li key={(m.medicine_name || m.medicineName || "med") + "-" + idx} className="doctor-appt-row">
              <div
                className="doctor-appt-avatar"
                style={{
                  background: `hsl(${(idx * 53) % 360}, 55%, 88%)`,
                  color: `hsl(${(idx * 53) % 360}, 45%, 30%)`,
                }}
                aria-hidden
              >
                {initialsOf(m.medicine_name || m.medicineName)}
              </div>
              <div className="doctor-appt-body">
                <div className="doctor-appt-name">
                  {m.medicine_name || m.medicineName || "(unnamed)"}
                </div>
                <div className="doctor-appt-meta">
                  Dose: <strong>{m.dosage || "—"}</strong>
                  {" · "}
                  Duration: <strong>{m.duration || "—"}</strong>
                </div>
              </div>
              <div className="doctor-appt-right">
                <span className="doctor-pill doctor-pill--blue">#{idx + 1}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InfoTile({ label, value }) {
  return (
    <div
      style={{
        background: "var(--bg-soft, #f7f8fb)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, marginTop: 4, wordBreak: "break-word" }}>
        {value || <em style={{ color: "var(--text-muted)" }}>—</em>}
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("inventory"); // "inventory" | "search"

  // inventory state
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [pharmacy, setPharmacy]   = useState(null);
  const [query, setQuery]         = useState("");

  // modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing]         = useState(null);
  const [stockOpen, setStockOpen]     = useState(false);
  const [stockMed, setStockMed]       = useState(null);
  const [saving, setSaving]           = useState(false);

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
      const medsRes = await apiRequest(ENDPOINTS.medicines, { method: "GET", auth: true });
      const list = Array.isArray(medsRes) ? medsRes : (medsRes?.data ?? []);
      setMedicines(list);
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (tab === "inventory") load(); }, [tab]);

  useEffect(() => {
    apiRequest(ENDPOINTS.profile, { method: "GET", auth: true })
      .then((res) => setPharmacy(res?.data ?? null))
      .catch(() => {});
  }, []);

  const pharmacyName = pharmacy?.pharmacy_name || pharmacy?.name || "Pharmacy";
  const totalMeds = medicines.length;

  // ── handlers ──
  const openAdd          = () => { setEditing(null); setDetailsOpen(true); };
  const openEditDetails  = (med) => { setEditing(med); setDetailsOpen(true); };
  const openUpdateStock  = (med) => { setStockMed(med); setStockOpen(true); };

  const saveMedicine = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(ENDPOINTS.medicineById(editing.medicineId), {
          method: "PUT",
          body: payload,
          auth: true,
        });
        flashToast(`${payload.name} updated.`);
      } else {
        await apiRequest(ENDPOINTS.medicines, {
          method: "POST",
          body: payload,
          auth: true,
        });
        flashToast(`${payload.name} added to inventory.`);
      }
      setDetailsOpen(false);
      await load();
    } catch (err) {
      flashToast(err.message || "Could not save medicine.");
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (medWithNewQty) => {
    setSaving(true);
    try {
      await apiRequest(ENDPOINTS.medicineById(medWithNewQty.medicineId), {
        method: "PUT",
        body: {
          name:    medWithNewQty.name,
          price:   medWithNewQty.price,
          stock:   medWithNewQty.quantity,
          category:        medWithNewQty.category,
          manufacturer:    medWithNewQty.manufacturer,
          expiry_date:     medWithNewQty.expiryDate || medWithNewQty.expiry_date,
        },
        auth: true,
      });
      flashToast(`Stock for ${medWithNewQty.name} → ${medWithNewQty.quantity}.`);
      setStockOpen(false);
      await load();
    } catch (err) {
      flashToast(err.message || "Could not update stock.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (med) => {
    if (!window.confirm(`Remove "${med.name}" from inventory?`)) return;
    try {
      await apiRequest(ENDPOINTS.medicineById(med.medicineId), { method: "DELETE", auth: true });
      flashToast(`${med.name} removed.`);
      await load();
    } catch (err) {
      flashToast(err.message || "Delete failed.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* Page header */}
        <div className="page-header" style={{ borderBottom: "none", marginBottom: 8 }}>
          <div>
            <p className="section-eyebrow">Pharmacist Portal</p>
            <h1 className="section-title">Pharmacy</h1>
            <div className="accent-line" />
            <p className="page-subtitle">
              Welcome back, {user?.name}. Manage stock and look up prescriptions.
            </p>
          </div>
        </div>

        <PharmacistHeader user={user} pharmacyName={pharmacyName} totalMeds={totalMeds} />

        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ marginTop: 16 }}>{toast}</div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Pharmacy sections"
          style={{
            display: "flex",
            gap: 4,
            marginTop: 20,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
            💊 Medicines in stock
          </TabButton>
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>
            🔍 Search Prescription
          </TabButton>
        </div>

        {tab === "inventory" && (
          <InventoryTab
            medicines={medicines}
            loading={loading}
            error={error}
            query={query}
            setQuery={setQuery}
            onAdd={openAdd}
            onEditDetails={openEditDetails}
            onUpdateStock={openUpdateStock}
            onDelete={remove}
            onRefresh={load}
          />
        )}
        {tab === "search" && <SearchPrescriptionTab />}
      </div>

      <MedicineModal
        open={detailsOpen}
        initial={editing}
        onClose={() => setDetailsOpen(false)}
        onSave={saveMedicine}
        saving={saving}
      />

      <StockModal
        open={stockOpen}
        med={stockMed}
        onClose={() => setStockOpen(false)}
        onSave={updateStock}
        saving={saving}
      />
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: "pointer",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}