import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Plus, Pencil, Trash2, Check, Download, Upload, Bell, Repeat, Leaf, CalendarClock, AlertTriangle, Wallet,
} from "lucide-react";

/* ---------------- Constants ---------------- */
const STORAGE_KEY = "verdant.bills.v1";
const SETTINGS_KEY = "verdant.settings.v1";

const CATEGORIES = [
  { id: "rent", label: "Rent", icon: "🏠", color: "#3ddc84" },
  { id: "electricity", label: "Electricity", icon: "⚡", color: "#c8f169" },
  { id: "gas", label: "Gas", icon: "🔥", color: "#ffb347" },
  { id: "water", label: "Water", icon: "💧", color: "#5fc9f5" },
  { id: "internet", label: "Internet", icon: "🌐", color: "#9b8cff" },
  { id: "phone", label: "Phone", icon: "📱", color: "#5ff5a0" },
  { id: "insurance", label: "Insurance", icon: "🛡️", color: "#ff8fb3" },
  { id: "subscription", label: "Subscription", icon: "🎬", color: "#ffd166" },
  { id: "other", label: "Other", icon: "📦", color: "#8fb3a4" },
];
const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const CURRENCIES = { USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", INR: "₹", JPY: "¥" };

/* ---------------- Date helpers ---------------- */
const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysUntil = (iso) => Math.round((startOfDay(iso) - startOfDay(new Date())) / 86400000);

function addCycle(iso, cycle) {
  const d = new Date(iso + "T00:00:00");
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "biweekly") d.setDate(d.getDate() + 14);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}

function statusOf(bill) {
  if (bill.paid) return { key: "paid", label: "Paid", cls: "paid" };
  const d = daysUntil(bill.dueDate);
  if (d < 0) return { key: "overdue", label: `${Math.abs(d)}d overdue`, cls: "overdue" };
  if (d === 0) return { key: "soon", label: "Due today", cls: "soon" };
  if (d <= 5) return { key: "soon", label: `Due in ${d}d`, cls: "soon" };
  return { key: "ok", label: `In ${d}d`, cls: "ok" };
}

const fmtMoney = (n, sym) =>
  sym + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/* ---------------- Seed data ---------------- */
const SEED = [
  { id: "s1", name: "Apartment Rent", category: "rent", amount: 1450, dueDate: addCycle(todayISO(), "monthly"), recurring: true, cycle: "monthly", paid: false },
  { id: "s2", name: "Hydro / Electricity", category: "electricity", amount: 92.4, dueDate: todayISO(), recurring: true, cycle: "monthly", paid: false },
  { id: "s3", name: "City Water", category: "water", amount: 48.1, dueDate: addCycle(todayISO(), "weekly"), recurring: true, cycle: "monthly", paid: false },
];

/* ============================================================
   Component
   ============================================================ */
export default function App() {
  const [bills, setBills] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return SEED;
  });

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { currency: "USD", notify: false };
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");

  /* Persist to localStorage (browser memory) */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bills)); } catch (e) {}
  }, [bills]);
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }, [settings]);

  const sym = CURRENCIES[settings.currency] || "$";

  /* ---- Recurring auto-roll: when a recurring bill is overdue & unpaid past its date,
        we keep it but the "Pay" action rolls it forward. Also auto-advance very old dates. ---- */
  useEffect(() => {
    setBills((prev) => {
      let changed = false;
      const next = prev.map((b) => {
        if (b.recurring && !b.paid && daysUntil(b.dueDate) < -45) {
          changed = true;
          let nd = b.dueDate;
          while (daysUntil(nd) < 0) nd = addCycle(nd, b.cycle);
          return { ...b, dueDate: nd };
        }
        return b;
      });
      return changed ? next : prev;
    });
  }, []); // run once on mount

  /* ---- Derived stats ---- */
  const stats = useMemo(() => {
    const unpaid = bills.filter((b) => !b.paid);
    const monthlyTotal = bills.reduce((s, b) => {
      const factor = b.recurring
        ? { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[b.cycle] || 1
        : 0;
      return s + b.amount * factor;
    }, 0);
    const dueSoon = unpaid.filter((b) => { const d = daysUntil(b.dueDate); return d >= 0 && d <= 5; });
    const overdue = unpaid.filter((b) => daysUntil(b.dueDate) < 0);
    const outstanding = unpaid.reduce((s, b) => s + b.amount, 0);
    return { monthlyTotal, dueSoon, overdue, outstanding, unpaidCount: unpaid.length };
  }, [bills]);

  /* ---- Category breakdown for chart ---- */
  const byCategory = useMemo(() => {
    const map = {};
    bills.filter((b) => !b.paid).forEach((b) => { map[b.category] = (map[b.category] || 0) + b.amount; });
    return Object.entries(map)
      .map(([id, value]) => ({ id, name: catOf(id).label, value: +value.toFixed(2), color: catOf(id).color }))
      .sort((a, b) => b.value - a.value);
  }, [bills]);

  /* ---- 6-month projection for bar chart ---- */
  const projection = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ label: m.toLocaleDateString(undefined, { month: "short" }), total: 0, key: `${m.getFullYear()}-${m.getMonth()}` });
    }
    bills.forEach((b) => {
      if (b.recurring) {
        let cur = b.dueDate;
        for (let i = 0; i < 36; i++) {
          const d = new Date(cur + "T00:00:00");
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const slot = months.find((mm) => mm.key === key);
          if (slot) slot.total += b.amount;
          cur = addCycle(cur, b.cycle);
          if (new Date(cur) > new Date(now.getFullYear(), now.getMonth() + 6, 1)) break;
        }
      } else {
        const d = new Date(b.dueDate + "T00:00:00");
        const slot = months.find((mm) => mm.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (slot) slot.total += b.amount;
      }
    });
    return months.map((m) => ({ label: m.label, total: +m.total.toFixed(2) }));
  }, [bills]);

  /* ---- Sorted, filtered list ---- */
  const visible = useMemo(() => {
    let list = [...bills];
    if (filter === "unpaid") list = list.filter((b) => !b.paid);
    else if (filter === "paid") list = list.filter((b) => b.paid);
    else if (filter === "recurring") list = list.filter((b) => b.recurring);
    return list.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [bills, filter]);

  /* ---- Actions ---- */
  const saveBill = useCallback((data) => {
    setBills((prev) => {
      if (data.id) return prev.map((b) => (b.id === data.id ? { ...b, ...data } : b));
      return [...prev, { ...data, id: crypto.randomUUID() }];
    });
    setModalOpen(false);
    setEditing(null);
  }, []);

  const removeBill = (id) => setBills((prev) => prev.filter((b) => b.id !== id));

  const togglePay = (id) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        if (!b.paid && b.recurring) {
          // mark this cycle paid by advancing to next due date, stays active
          return { ...b, dueDate: addCycle(b.dueDate, b.cycle), paid: false };
        }
        return { ...b, paid: !b.paid };
      })
    );
  };

  /* ---- Export / Import ---- */
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ bills, settings, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verdant-bills-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed.bills)) setBills(parsed.bills);
        if (parsed.settings) setSettings(parsed.settings);
        alert("Backup imported successfully 🌱");
      } catch {
        alert("Could not read that file — make sure it's a Verdant backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ---- Notifications ---- */
  const requestNotify = async () => {
    if (!("Notification" in window)) { alert("This browser doesn't support notifications."); return; }
    const perm = await Notification.requestPermission();
    setSettings((s) => ({ ...s, notify: perm === "granted" }));
  };

  useEffect(() => {
    if (!settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    const key = "verdant.lastNotify";
    const last = localStorage.getItem(key);
    if (last === todayISO()) return; // once a day
    const urgent = bills.filter((b) => !b.paid && daysUntil(b.dueDate) <= 2);
    if (urgent.length) {
      const names = urgent.map((b) => b.name).slice(0, 3).join(", ");
      new Notification("🌿 Verdant — bills need attention", {
        body: `${urgent.length} bill${urgent.length > 1 ? "s" : ""} due soon: ${names}`,
        icon: `${import.meta.env.BASE_URL}favicon-180.png`,
      });
      localStorage.setItem(key, todayISO());
    }
  }, [settings.notify, bills]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (b) => { setEditing(b); setModalOpen(true); };

  return (
    <div className="app">
      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <img className="logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Verdant logo" />
          <div>
            <h1>Verd<em>ant</em></h1>
            <p>Tend your bills before they grow wild</p>
          </div>
        </div>
        <div className="toolbar">
          <select
            className="btn ghost"
            value={settings.currency}
            onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
            title="Currency"
            style={{ paddingRight: 28 }}
          >
            {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{c} {CURRENCIES[c]}</option>)}
          </select>
          <button className="btn" onClick={exportData}><Download /> Export</button>
          <label className="btn" style={{ cursor: "pointer" }}>
            <Upload /> Import
            <input type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
          </label>
          <button className="btn primary" onClick={openNew}><Plus /> Add bill</button>
        </div>
      </header>

      {/* Notification nudge */}
      {!settings.notify && "Notification" in window && (
        <div className="notif-bar">
          <Bell size={16} color="var(--leaf)" />
          Turn on browser reminders so Verdant can nudge you before a bill is due.
          <button className="btn primary" onClick={requestNotify}>Enable reminders</button>
        </div>
      )}

      {/* Urgent reminder banner */}
      {(stats.overdue.length > 0 || stats.dueSoon.length > 0) && (
        <div className="reminder">
          <span className="r-ico">{stats.overdue.length ? "🚨" : "⏰"}</span>
          <div className="r-text">
            {stats.overdue.length > 0 && (
              <div><strong>{stats.overdue.length} overdue</strong> — {stats.overdue.map((b) => b.name).join(", ")}</div>
            )}
            {stats.dueSoon.length > 0 && (
              <div><strong>{stats.dueSoon.length} due within 5 days</strong> — {fmtMoney(stats.dueSoon.reduce((s, b) => s + b.amount, 0), sym)} total</div>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <section className="stats">
        <div className="stat accent">
          <div className="label">Monthly average</div>
          <div className="value">{fmtMoney(stats.monthlyTotal, sym)}</div>
          <div className="sub">across all recurring bills</div>
        </div>
        <div className="stat">
          <div className="label">Outstanding</div>
          <div className="value">{fmtMoney(stats.outstanding, sym)}</div>
          <div className="sub">{stats.unpaidCount} unpaid bill{stats.unpaidCount !== 1 ? "s" : ""}</div>
        </div>
        <div className="stat warn">
          <div className="label">Due soon</div>
          <div className="value">{stats.dueSoon.length}</div>
          <div className="sub">within the next 5 days</div>
        </div>
        <div className="stat bad">
          <div className="label">Overdue</div>
          <div className="value">{stats.overdue.length}</div>
          <div className="sub">needs attention now</div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid">
        {/* Bill list */}
        <div className="card">
          <div className="card-head">
            <h2>Your bills</h2>
            <div className="seg">
              {["all", "unpaid", "recurring", "paid"].map((f) => (
                <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            {visible.length === 0 ? (
              <div className="empty">
                <div className="leaf-ico">🌱</div>
                <h3>Nothing here yet</h3>
                <p>Plant your first bill and watch your dashboard bloom.</p>
              </div>
            ) : (
              visible.map((b, i) => {
                const st = statusOf(b);
                const cat = catOf(b.category);
                return (
                  <div key={b.id} className={`bill ${b.paid ? "paid-row" : ""}`} style={{ animationDelay: `${i * 35}ms` }}>
                    <div className="ico" style={{ background: `${cat.color}22`, borderColor: `${cat.color}40` }}>{cat.icon}</div>
                    <div className="info">
                      <div className="name">{b.name}</div>
                      <div className="meta">
                        <span><CalendarClock size={12} style={{ verticalAlign: -2, marginRight: 3 }} />{fmtDate(b.dueDate)}</span>
                        <span className={`pill ${st.cls}`}>{st.label}</span>
                        {b.recurring && <span className="pill recur"><Repeat size={11} /> {b.cycle}</span>}
                      </div>
                    </div>
                    <div className="right">
                      <div className="amt">{fmtMoney(b.amount, sym)}</div>
                      <div className="bill-actions">
                        <button className="icon-btn pay" title={b.recurring ? "Mark cycle paid" : (b.paid ? "Mark unpaid" : "Mark paid")} onClick={() => togglePay(b.id)}><Check /></button>
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}><Pencil /></button>
                        <button className="icon-btn del" title="Delete" onClick={() => removeBill(b.id)}><Trash2 /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="card">
            <div className="card-head"><h2>Where it goes</h2><span className="hint">unpaid by category</span></div>
            <div className="card-body">
              {byCategory.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}><p>No unpaid bills to chart.</p></div>
              ) : (
                <>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={75} paddingAngle={3} stroke="none">
                          {byCategory.map((d) => <Cell key={d.id} fill={d.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#063226", border: "1px solid rgba(110,231,183,.28)", borderRadius: 12, color: "#f4f7f0" }}
                          formatter={(v) => fmtMoney(v, sym)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="legend">
                    {byCategory.map((d) => (
                      <div className="row" key={d.id}>
                        <span className="label-l"><span className="dot" style={{ background: d.color }} />{d.name}</span>
                        <span className="val">{fmtMoney(d.value, sym)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Next 6 months</h2><span className="hint">projected outflow</span></div>
            <div className="card-body" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projection} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,231,183,.1)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#8fb3a4", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8fb3a4", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(61,220,132,.08)" }}
                    contentStyle={{ background: "#063226", border: "1px solid rgba(110,231,183,.28)", borderRadius: 12, color: "#f4f7f0" }}
                    formatter={(v) => fmtMoney(v, sym)}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#3ddc84" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <footer>
        🌿 Verdant — your data lives only in this browser. Export regularly to keep a backup. ·{" "}
        <a href="https://github.com" target="_blank" rel="noreferrer">View on GitHub</a>
      </footer>

      {modalOpen && (
        <BillModal
          initial={editing}
          sym={sym}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={saveBill}
        />
      )}
    </div>
  );
}

/* ============================================================
   Bill Modal
   ============================================================ */
function BillModal({ initial, onClose, onSave, sym }) {
  const [form, setForm] = useState(
    initial || { name: "", category: "rent", amount: "", dueDate: todayISO(), recurring: true, cycle: "monthly", paid: false }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) { alert("Give your bill a name."); return; }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt < 0) { alert("Enter a valid amount."); return; }
    onSave({ ...form, name: form.name.trim(), amount: amt });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{initial ? "Edit bill" : "New bill"}</h2>
        <p className="sub">Track a due date so it never sneaks up on you.</p>

        <div className="field">
          <label>Bill name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Apartment rent" autoFocus />
        </div>

        <div className="field">
          <label>Category</label>
          <div className="cat-picker">
            {CATEGORIES.map((c) => (
              <div key={c.id} className={`cat-chip ${form.category === c.id ? "active" : ""}`} onClick={() => set("category", c.id)}>
                <span>{c.icon}</span>{c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Amount ({sym})</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="checkbox-row">
            <input type="checkbox" checked={form.recurring} onChange={(e) => set("recurring", e.target.checked)} />
            This bill repeats
          </label>
        </div>

        {form.recurring && (
          <div className="field">
            <label>Repeat every</label>
            <select value={form.cycle} onChange={(e) => set("cycle", e.target.value)}>
              <option value="weekly">Week</option>
              <option value="biweekly">2 weeks</option>
              <option value="monthly">Month</option>
              <option value="quarterly">Quarter</option>
              <option value="yearly">Year</option>
            </select>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}><Check size={16} /> {initial ? "Save changes" : "Add bill"}</button>
        </div>
      </div>
    </div>
  );
}
