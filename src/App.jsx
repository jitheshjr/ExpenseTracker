import { useState, useEffect, useRef } from "react";
import { supabase } from "./services/supabase";
import "./App.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Config ────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Petrol",      icon: "⛽" },
  { name: "Travel",      icon: "✈️" },
  { name: "Food",        icon: "🍛" },
  { name: "Grooming",    icon: "✂️" },
  { name: "Other",       icon: "📦" },
  { name: "Mutual Fund", icon: "📈" },
  { name: "Income",      icon: "💰" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtINR(n) {
  return "₹" + Math.abs(Math.round(n || 0)).toLocaleString("en-IN");
}

function shortDate(dateStr) {
  const d = new Date(dateStr);
  return MONTHS[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0");
}

// ── Custom bar chart tooltip ──────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const colors = { Income: "#e8e8e8", Expense: "#707070", Invested: "#a0a0a0" };
  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #2e2e2e",
      borderRadius: 8, padding: "10px 14px",
      fontFamily: "var(--mono)", fontSize: 11,
    }}>
      <div style={{ color: "#505050", marginBottom: 6, letterSpacing: "0.04em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: colors[p.name] || "#888", marginBottom: 2 }}>
          {p.name}: {fmtINR(p.value)}
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────

export default function App() {
  const [tab,      setTab]      = useState("add");
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("Food");
  const [note,     setNote]     = useState("");
  const [date,     setDate]     = useState(todayStr());
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const hiddenRef               = useRef(null);

  // ── Supabase ─────────────────────────────────────────────────────

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (!error) setExpenses(data || []);
  }

  useEffect(() => { fetchExpenses(); }, []);

  async function handleAdd() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    const { error } = await supabase.from("expenses").insert([{
      amount: val, category, note, date,
    }]);
    setLoading(false);
    if (!error) {
      setAmount(""); setNote(""); setDate(todayStr());
      const msg =
        category === "Income"      ? "Income recorded"      :
        category === "Mutual Fund" ? "Investment recorded"  :
        "Expense added";
      showToast(msg);
      fetchExpenses();
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2100);
  }

  // ── Analytics ────────────────────────────────────────────────────

  const now      = new Date();
  const curMonth = now.getMonth();
  const curYear  = now.getFullYear();

  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });

  const monthIncome   = thisMonth
    .filter(e => e.category === "Income")
    .reduce((s, e) => s + e.amount, 0);

  const monthInvested = thisMonth
    .filter(e => e.category === "Mutual Fund")
    .reduce((s, e) => s + e.amount, 0);

  const monthSpent    = thisMonth
    .filter(e => e.category !== "Income" && e.category !== "Mutual Fund")
    .reduce((s, e) => s + e.amount, 0);

  const monthFree  = monthIncome - monthSpent - monthInvested;
  const investPct  = monthIncome > 0 ? Math.round((monthInvested / monthIncome) * 100) : 0;

  // 12-month bar chart data
  const chartData = MONTHS.map((m, i) => {
    const rows = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === i && d.getFullYear() === curYear;
    });
    return {
      month:    m,
      Income:   Math.round(rows.filter(e => e.category === "Income").reduce((s, e) => s + e.amount, 0)),
      Expense:  Math.round(rows.filter(e => e.category !== "Income" && e.category !== "Mutual Fund").reduce((s, e) => s + e.amount, 0)),
      Invested: Math.round(rows.filter(e => e.category === "Mutual Fund").reduce((s, e) => s + e.amount, 0)),
    };
  });

  const monthTitle = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* Top bar */}
      <div className="top-bar">
        <div className="month-title">{monthTitle}</div>
        <div className={`net-chip ${monthFree >= 0 ? "positive" : "negative"}`}>
          {monthFree >= 0 ? "+" : "−"}{fmtINR(Math.abs(monthFree))} free
        </div>
      </div>

      {/* 2×2 Summary */}
      <div className="summary-row">
        <div className="sum-card">
          <div className="sum-label">Income</div>
          <div className="sum-value income">{fmtINR(monthIncome)}</div>
        </div>
        <div className="sum-card">
          <div className="sum-label">Spent</div>
          <div className="sum-value expense">{fmtINR(monthSpent)}</div>
        </div>
        <div className="sum-card">
          <div className="sum-label">Invested</div>
          <div className="sum-value invested">
            {fmtINR(monthInvested)}
            {investPct > 0 && <span className="sum-pct">{investPct}%</span>}
          </div>
        </div>
        <div className="sum-card">
          <div className="sum-label">Free Cash</div>
          <div className={`sum-value ${monthFree >= 0 ? "free-pos" : "free-neg"}`}>
            {monthFree < 0 ? "−" : ""}{fmtINR(Math.abs(monthFree))}
          </div>
        </div>
      </div>

      <div className="rule" />

      {/* ════════ ADD TAB ════════ */}
      {tab === "add" && (
        <>
          <div className="amount-zone" onClick={() => hiddenRef.current?.focus()}>
            <div className="amount-zone-label">Enter amount</div>
            <div className={`amount-display${!amount ? " empty" : ""}`}>
              {amount ? "₹" + parseFloat(amount).toLocaleString("en-IN") : "₹ 0"}
              <span className="amount-cursor" />
            </div>
            <div className="tap-hint">tap to type</div>
          </div>

          <input
            ref={hiddenRef}
            className="amount-input-hidden"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />

          <div className="cat-grid">
            {CATEGORIES.map(c => {
              const isSpecial = c.name === "Income" || c.name === "Mutual Fund";
              const isActive  = category === c.name;
              return (
                <button
                  key={c.name}
                  className={`cat-btn${isActive ? (isSpecial ? " active-income" : " active") : ""}`}
                  onClick={() => setCategory(c.name)}
                >
                  <div className="cat-icon-wrap">{c.icon}</div>
                  <span className="cat-name">{c.name}</span>
                </button>
              );
            })}
          </div>

          <div className="note-wrap">
            <input
              className="note-input"
              type="text"
              placeholder="Add a note…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="date-wrap">
            <input
              className="date-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="add-btn-wrap">
            <button className="add-btn" onClick={handleAdd} disabled={loading || !amount}>
              {loading                        ? "Saving…"            :
               category === "Income"          ? "Record Income"      :
               category === "Mutual Fund"     ? "Record Investment"  :
                                               "Add Expense"}
            </button>
          </div>

          <div className="rule" />

          <div className="recent-header">
            <span className="recent-label">Recent</span>
            <span className="recent-count">{expenses.length}</span>
          </div>
          <div className="txn-list">
            {expenses.length === 0
              ? <div className="empty-state">No entries yet</div>
              : expenses.slice(0, 8).map(e => <TxnRow key={e.id} e={e} />)
            }
          </div>
        </>
      )}

      {/* ════════ HISTORY TAB ════════ */}
      {tab === "history" && (
        <div className="history-list">
          <div style={{ padding: "16px 0 12px" }}>
            <span className="recent-label">All entries</span>
          </div>
          {expenses.length === 0
            ? <div className="empty-state">No entries yet</div>
            : expenses.map(e => <TxnRow key={e.id} e={e} showDate />)
          }
        </div>
      )}

      {/* ════════ CHART TAB ════════ */}
      {tab === "chart" && (
        <div style={{ paddingBottom: 20 }}>
          <div className="chart-wrap">
            <div className="chart-title">This year</div>
            <div className="chart-sub">{curYear} · income · expenses · investments</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
                barSize={7}
                barGap={2}
              >
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#404040", fontSize: 10, fontFamily: "var(--mono)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#404040", fontSize: 10, fontFamily: "var(--mono)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
                <Bar dataKey="Income"   fill="#e8e8e8" radius={[3,3,0,0]} />
                <Bar dataKey="Expense"  fill="#383838" radius={[3,3,0,0]} />
                <Bar dataKey="Invested" fill="#a0a0a0" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#e8e8e8" }} /> Income
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#383838", border: "1px solid #555" }} /> Expenses
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#a0a0a0" }} /> Invested
              </div>
            </div>
          </div>

          <div style={{ padding: "0 20px" }}>
            <YearSummary expenses={expenses} year={curYear} />
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {[
          { id: "add",     label: "Add"     },
          { id: "history", label: "History" },
          { id: "chart",   label: "Chart"   },
        ].map(n => (
          <button
            key={n.id}
            className={`nav-btn ${tab === n.id ? "active" : ""}`}
            onClick={() => setTab(n.id)}
          >
            <div className="nav-pip" />
            {n.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ── Transaction row ───────────────────────────────────────────────

function TxnRow({ e, showDate }) {
  const isIncome   = e.category === "Income";
  const isInvested = e.category === "Mutual Fund";
  const cat        = CATEGORIES.find(c => c.name === e.category) ?? CATEGORIES[4];
  return (
    <div className="txn-row">
      <div className={`txn-icon${isIncome ? " is-income" : isInvested ? " is-invested" : ""}`}>
        {cat.icon}
      </div>
      <div className="txn-meta">
        <div className="txn-cat">{e.category}</div>
        <div className="txn-sub">
          {e.note || "—"} · {showDate ? e.date : shortDate(e.date)}
        </div>
      </div>
      <div className="txn-right">
        <div className={`txn-amount ${isIncome ? "income" : isInvested ? "invested" : "expense"}`}>
          {isIncome ? "+" : isInvested ? "→" : "−"}{fmtINR(e.amount)}
        </div>
      </div>
    </div>
  );
}

// ── Year summary ──────────────────────────────────────────────────

function YearSummary({ expenses, year }) {
  const rows     = expenses.filter(e => new Date(e.date).getFullYear() === year);
  const inc      = rows.filter(e => e.category === "Income").reduce((s, e) => s + e.amount, 0);
  const invested = rows.filter(e => e.category === "Mutual Fund").reduce((s, e) => s + e.amount, 0);
  const spent    = rows.filter(e => e.category !== "Income" && e.category !== "Mutual Fund").reduce((s, e) => s + e.amount, 0);
  const free     = inc - spent - invested;
  const invPct   = inc > 0 ? Math.round((invested / inc) * 100) : 0;
  const spentPct = inc > 0 ? Math.round((spent    / inc) * 100) : 0;

  const card = {
    background: "#111111", border: "1px solid #1e1e1e",
    borderRadius: 14, padding: "14px 16px",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
    fontFamily: "var(--mono)",
  };
  const lbl = { fontSize: 10, color: "#505050", letterSpacing: "0.08em", textTransform: "uppercase" };
  const val = { fontSize: 18, letterSpacing: "-0.5px", fontFamily: "'DM Serif Display', Georgia, serif" };

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={card}>
        <span style={lbl}>Year income</span>
        <span style={{ ...val, color: "#e8e8e8" }}>{fmtINR(inc)}</span>
      </div>
      <div style={card}>
        <span style={lbl}>Year spent · {spentPct}%</span>
        <span style={{ ...val, color: "#888888" }}>{fmtINR(spent)}</span>
      </div>
      <div style={card}>
        <span style={lbl}>Year invested · {invPct}%</span>
        <span style={{ ...val, color: "#c0c0c0" }}>{fmtINR(invested)}</span>
      </div>
      <div style={{ ...card, border: `1px solid ${free >= 0 ? "#3a3a3a" : "#222"}` }}>
        <span style={lbl}>Free cash</span>
        <span style={{ ...val, color: free >= 0 ? "#ffffff" : "#505050" }}>
          {free >= 0 ? "+" : "−"}{fmtINR(Math.abs(free))}
        </span>
      </div>
    </div>
  );
}