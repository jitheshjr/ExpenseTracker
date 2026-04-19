import { lazy, Suspense, startTransition, useEffect, useRef, useState } from "react";
import { supabase, hasSupabaseConfig } from "./services/supabase";
import { fmtINR } from "./utils/format";
import { fullDateLabel, getYear, isSameMonth, monthLabel, todayStr } from "./utils/date";
import "./App.css";

const ChartPanel = lazy(() => import("./components/ChartPanel"));
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORIES = [
  { name: "Fuel", icon: "⛽" },
  { name: "Travel", icon: "✈️" },
  { name: "Food", icon: "🍛" },
  { name: "Grooming", icon: "✂️" },
  { name: "Other", icon: "📦" },
  { name: "Income", icon: "💰" },
];

export default function App() {
  const now = new Date();
  const initialMonth = now.getMonth();
  const initialYear = now.getFullYear();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("add");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [summaryMonth, setSummaryMonth] = useState(initialMonth);
  const [summaryYear, setSummaryYear] = useState(initialYear);
  const [editingEntry, setEditingEntry] = useState(null);
  const hiddenInput = useRef(null);
  const toastTimerRef = useRef(null);

  const user = session?.user ?? null;

  function showToast(message, tone = "info") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }

  function resetEntryForm() {
    setAmount("");
    setCategory("Food");
    setNote("");
    setDate(todayStr());
    setEditingEntry(null);
  }

  async function loadExpensesForUser(userId, isActive = () => true) {
    if (!supabase || !userId) return;

    setAppLoading(true);
    const { data, error: fetchError } = await supabase
      .from("expenses")
      .select("id, amount, category, note, date, created_at, user_id")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!isActive()) return;

    if (fetchError) {
      setError(fetchError.message);
      setExpenses([]);
    } else {
      setError("");
      startTransition(() => setExpenses(data || []));
    }

    setAppLoading(false);
  }

  useEffect(() => {
    if (!supabase) return undefined;

    let isActive = true;

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!isActive) return;

      if (sessionError) {
        setError(sessionError.message);
        setAuthLoading(false);
        return;
      }

      const nextSession = data.session ?? null;
      startTransition(() => {
        setSession(nextSession);
        if (!nextSession) {
          setExpenses([]);
          setEditingEntry(null);
        }
      });

      if (nextSession?.user?.id) {
        await loadExpensesForUser(nextSession.user.id, () => isActive);
      }

      if (isActive) {
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;

      startTransition(() => {
        setSession(nextSession ?? null);
        if (!nextSession) setExpenses([]);
      });

      if (nextSession?.user?.id) {
        void loadExpensesForUser(nextSession.user.id, () => isActive);
      } else {
        setAppLoading(false);
      }

      setAuthLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function handleSendMagicLink(event) {
    event.preventDefault();

    if (!supabase) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter the email address you want to use for your personal login.");
      return;
    }

    setSendingLink(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setSendingLink(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    showToast("Magic link sent. Open it on this phone to sign in.");
  }

  async function handleSignOut() {
    if (!supabase) return;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    setTab("add");
    resetEntryForm();
    showToast("Signed out");
  }

  function handleStartEdit(entry) {
    setEditingEntry(entry);
    setTab("add");
    setAmount(String(entry.amount));
    setCategory(entry.category);
    setNote(entry.note ?? "");
    setDate(entry.date);
    window.setTimeout(() => hiddenInput.current?.focus(), 0);
    showToast("Editing entry");
  }

  function handleCancelEdit() {
    resetEntryForm();
    setError("");
  }

  async function handleSaveEntry() {
    if (!supabase || !user) return;

    const parsedAmount = Number.parseFloat(amount);
    const trimmedNote = note.trim();

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setLoading(true);
    setError("");

    const isIncome = category === "Income";
    const payload = {
      amount: parsedAmount,
      category,
      note: trimmedNote || null,
      date,
      user_id: user.id,
    };
    const { error: saveError } = editingEntry
      ? await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingEntry.id)
          .eq("user_id", user.id)
      : await supabase.from("expenses").insert([payload]);

    setLoading(false);

    if (saveError) {
      setError(saveError.message);
      showToast(editingEntry ? "Update failed" : "Save failed", "error");
      return;
    }

    const wasEditing = Boolean(editingEntry);
    resetEntryForm();
    showToast(
      wasEditing ? (isIncome ? "Income updated" : "Expense updated") : isIncome ? "Income recorded" : "Expense added",
      "success",
    );
    await loadExpensesForUser(user.id);
  }

  async function handleDelete(entry) {
    if (!supabase || !user) return;

    const confirmed = window.confirm(
      `Delete ${entry.category.toLowerCase()} entry for ${fmtINR(entry.amount)}?`,
    );

    if (!confirmed) return;

    setDeletingId(entry.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", user.id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      showToast("Delete failed", "error");
      return;
    }

    if (editingEntry?.id === entry.id) {
      resetEntryForm();
    }

    showToast("Entry deleted", "success");
    await loadExpensesForUser(user.id);
  }

  const curMonth = initialMonth;
  const curYear = initialYear;
  const thisMonth = expenses.filter((entry) => isSameMonth(entry.date, curMonth, curYear));
  const monthIncome = thisMonth
    .filter((entry) => entry.category === "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const monthExpense = thisMonth
    .filter((entry) => entry.category !== "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const monthNet = monthIncome - monthExpense;
  const savePct = monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0;
  const monthTitle = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const summaryEntries = expenses.filter((entry) => isSameMonth(entry.date, summaryMonth, summaryYear));
  const summaryIncome = summaryEntries
    .filter((entry) => entry.category === "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const summaryExpense = summaryEntries
    .filter((entry) => entry.category !== "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const summaryNet = summaryIncome - summaryExpense;
  const availableYears = Array.from(
    new Set([initialYear, ...expenses.map((entry) => getYear(entry.date)).filter(Number.isFinite)]),
  ).sort((a, b) => b - a);
  const categoryBreakdown = CATEGORIES.map((item) => {
    const total = summaryEntries
      .filter((entry) => entry.category === item.name)
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      ...item,
      total,
      count: summaryEntries.filter((entry) => entry.category === item.name).length,
    };
  });

  function handleExportCsv() {
    if (summaryEntries.length === 0) return;

    const period = `${summaryYear}-${String(summaryMonth + 1).padStart(2, "0")}`;
    const rows = summaryEntries.map((entry) => ({
      date: entry.date,
      category: entry.category,
      type: entry.category === "Income" ? "income" : "expense",
      note: entry.note ?? "",
      amount: entry.amount,
    }));
    const lines = [
      ["date", "category", "type", "note", "amount"].join(","),
      ...rows.map((row) =>
        [row.date, row.category, row.type, row.note, row.amount]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${period}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    showToast(`CSV exported for ${MONTH_OPTIONS[summaryMonth]} ${summaryYear}`, "success");
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="app-shell">
        <SetupCard />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="status-card">
          <div className="status-title">Connecting</div>
          <div className="status-text">Checking your Supabase session and preparing the app.</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <AuthCard
          email={email}
          error={error}
          sendingLink={sendingLink}
          setEmail={setEmail}
          onSubmit={handleSendMagicLink}
        />
        {toast && (
          <div className={`toast toast-${toast.tone}`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div>
          <div className="month-title">{monthTitle}</div>
          <div className="signed-in-copy">{user.email}</div>
        </div>
        <div className="top-bar-actions">
          <div className={`net-chip ${monthNet >= 0 ? "positive" : "negative"}`}>
            Net {monthNet >= 0 ? "+" : "−"}
            {fmtINR(Math.abs(monthNet))}
          </div>
          <button className="ghost-btn" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="summary-row">
        <div className="sum-card">
          <div className="sum-label">Income</div>
          <div className="sum-value income">{fmtINR(monthIncome)}</div>
        </div>
        <div className="sum-card">
          <div className="sum-label">Spent</div>
          <div className="sum-value expense">{fmtINR(monthExpense)}</div>
        </div>
        <div className="sum-card">
          <div className="sum-label">Saved</div>
          <div className="sum-value saved">{savePct}%</div>
        </div>
      </div>

      <div className="rule" />

      {tab === "add" && (
        <>
          {editingEntry && (
            <div className="edit-banner">
              <div>
                <div className="recent-label">Editing entry</div>
                <div className="history-sub">
                  {editingEntry.category} · {fullDateLabel(editingEntry.date)}
                </div>
              </div>
              <button className="ghost-btn" type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          )}

          <div className="amount-zone" onClick={() => hiddenInput.current?.focus()}>
            <div className="amount-zone-label">{editingEntry ? "Update amount" : "Enter amount"}</div>
            <div className={`amount-display${!amount ? " empty" : ""}`}>
              {amount ? fmtINR(Number.parseFloat(amount) || 0) : "₹0"}
              <span className="amount-cursor" />
            </div>
            <div className="tap-hint">{editingEntry ? "tap to edit" : "tap to type"}</div>
          </div>

          <input
            ref={hiddenInput}
            className="amount-input-hidden"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSaveEntry()}
          />

          <div className="cat-grid">
            {CATEGORIES.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`cat-btn ${
                  category === item.name
                    ? item.name === "Income"
                      ? "active-income"
                      : "active"
                    : ""
                }`}
                onClick={() => setCategory(item.name)}
              >
                <div className="cat-icon-wrap">{item.icon}</div>
                <span className="cat-name">{item.name}</span>
              </button>
            ))}
          </div>

          <div className="note-wrap">
            <input
              className="note-input"
              type="text"
              maxLength={80}
              placeholder="Add a note…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="date-wrap">
            <input
              className="date-input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="add-btn-wrap">
            <div className="form-actions">
              <button className="add-btn" type="button" onClick={handleSaveEntry} disabled={loading || !amount}>
                {loading
                  ? editingEntry
                    ? "Updating…"
                    : "Saving…"
                  : editingEntry
                    ? category === "Income"
                      ? "Update Income"
                      : "Update Expense"
                    : category === "Income"
                      ? "Record Income"
                      : "Add Expense"}
              </button>
              {editingEntry && (
                <button className="secondary-btn" type="button" onClick={handleCancelEdit} disabled={loading}>
                  Keep current and cancel
                </button>
              )}
            </div>
          </div>

          <div className="rule" />

          <div className="recent-header">
            <span className="recent-label">Recent</span>
            <span className="recent-count">{appLoading ? "…" : expenses.length}</span>
          </div>
          <div className="txn-list">
            {appLoading ? (
              <div className="empty-state">Syncing your entries…</div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">No entries yet</div>
            ) : (
              expenses.slice(0, 8).map((entry) => (
                <TxnRow
                  key={entry.id}
                  deletingId={deletingId}
                  e={entry}
                  editingId={editingEntry?.id}
                  onEdit={handleStartEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="history-list">
          <div className="history-head">
            <div className="recent-label">All entries</div>
            <div className="history-sub">Private to your signed-in account</div>
          </div>
          {appLoading ? (
            <div className="empty-state">Loading history…</div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">No entries yet</div>
          ) : (
            expenses.map((entry) => (
              <TxnRow
                key={entry.id}
                deletingId={deletingId}
                e={entry}
                editingId={editingEntry?.id}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
                showDate
              />
            ))
          )}
        </div>
      )}

      {tab === "summary" && (
        <div className="summary-panel-shell">
          <div className="history-head summary-head">
            <div>
              <div className="recent-label">Monthly summary</div>
              </div>
            <button
              className="ghost-btn"
              type="button"
              onClick={handleExportCsv}
              disabled={summaryEntries.length === 0}
            >
              Export CSV
            </button>
          </div>

          <div className="summary-filter-card">
            <div className="summary-filter-grid">
              <label className="summary-field">
                <span className="summary-field-label">Month</span>
                <select
                  className="summary-select"
                  value={summaryMonth}
                  onChange={(event) => setSummaryMonth(Number(event.target.value))}
                >
                  {MONTH_OPTIONS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="summary-field">
                <span className="summary-field-label">Year</span>
                <select
                  className="summary-select"
                  value={summaryYear}
                  onChange={(event) => setSummaryYear(Number(event.target.value))}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="summary-row summary-row-period">
            <div className="sum-card">
              <div className="sum-label">Income</div>
              <div className="sum-value income">{fmtINR(summaryIncome)}</div>
            </div>
            <div className="sum-card">
              <div className="sum-label">Spent</div>
              <div className="sum-value expense">{fmtINR(summaryExpense)}</div>
            </div>
            <div className="sum-card">
              <div className="sum-label">Net</div>
              <div className="sum-value saved">
                {summaryNet >= 0 ? "+" : "−"}
                {fmtINR(Math.abs(summaryNet))}
              </div>
            </div>
          </div>

          <div className="summary-meta-row">
            <div className="recent-count">{summaryEntries.length} entries</div>
            <div className="history-sub">
              {MONTH_OPTIONS[summaryMonth]} {summaryYear}
            </div>
          </div>

          <div className="category-summary-card">
            <div className="recent-label">Category totals</div>
            <div className="category-summary-list">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="category-summary-row">
                  <div className="category-summary-left">
                    <div className={`txn-icon category-summary-icon ${item.name === "Income" ? "is-income" : ""}`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="txn-cat">{item.name}</div>
                      <div className="txn-sub">
                        {item.count === 0 ? "No entries" : `${item.count} ${item.count === 1 ? "entry" : "entries"}`}
                      </div>
                    </div>
                  </div>
                  <div className={`txn-amount ${item.name === "Income" ? "income" : "expense"}`}>
                    {item.name === "Income" ? "+" : ""}
                    {fmtINR(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="history-list summary-list">
            <div className="history-head">
              <div className="recent-label">Entries in period</div>
              <div className="history-sub">Newest first</div>
            </div>
            {appLoading ? (
              <div className="empty-state">Loading summary…</div>
            ) : summaryEntries.length === 0 ? (
              <div className="empty-state">No entries for this month yet</div>
            ) : (
              summaryEntries.map((entry) => (
                <TxnRow
                  key={entry.id}
                  deletingId={deletingId}
                  e={entry}
                  editingId={editingEntry?.id}
                  onEdit={handleStartEdit}
                  onDelete={handleDelete}
                  showDate
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "chart" && (
        <div className="chart-panel-shell">
          <Suspense fallback={<div className="empty-state chart-loading">Loading charts…</div>}>
            <ChartPanel expenses={expenses} year={curYear} />
          </Suspense>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          { id: "add", label: "Add" },
          { id: "history", label: "History" },
          { id: "summary", label: "Summary" },
          { id: "chart", label: "Chart" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-btn ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <div className="nav-pip" />
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className={`toast toast-${toast.tone}`}>{toast.message}</div>}
    </div>
  );
}

function TxnRow({ e, showDate = false, onDelete, onEdit, deletingId, editingId }) {
  const isIncome = e.category === "Income";
  const category = CATEGORIES.find((item) => item.name === e.category) || CATEGORIES[4];
  const isEditing = editingId === e.id;

  return (
    <div className="txn-row">
      <div className={`txn-icon ${isIncome ? "is-income" : ""}`}>{category.icon}</div>
      <div className="txn-meta">
        <div className="txn-cat">{e.category}</div>
        <div className="txn-sub">
          {e.note || "No note"}
          {showDate ? ` · ${fullDateLabel(e.date)}` : ` · ${monthLabel(e.date)}`}
        </div>
      </div>
      <div className="txn-right">
        <div className={`txn-amount ${isIncome ? "income" : "expense"}`}>
          {isIncome ? "+" : "−"}
          {fmtINR(e.amount)}
        </div>
        <div className="txn-actions">
          <button className={`edit-btn ${isEditing ? "active" : ""}`} type="button" onClick={() => onEdit(e)}>
            {isEditing ? "Editing" : "Edit"}
          </button>
          <button
            className="delete-btn"
            type="button"
            onClick={() => onDelete(e)}
            disabled={deletingId === e.id}
          >
            {deletingId === e.id ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthCard({ email, setEmail, onSubmit, sendingLink, error }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-eyebrow">Personal Access</div>
        <h1 className="auth-title">Private expense tracker on any phone</h1>
        <p className="auth-copy">
          Sign in with your own email. Supabase will send a magic link so only your account can
          read and write your entries once RLS is enabled.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="note-input auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="add-btn" type="submit" disabled={sendingLink}>
            {sendingLink ? "Sending…" : "Send Magic Link"}
          </button>
        </form>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-tips">
          <div>Free hosting: Vercel, Netlify, or Cloudflare Pages.</div>
          <div>Best mobile flow: open the sign-in email on the same phone.</div>
        </div>
      </div>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-eyebrow">Missing Config</div>
        <h1 className="auth-title">Supabase environment values are not set</h1>
        <p className="auth-copy">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your local
          <code> .env</code> file and to your hosting provider settings before deploying.
        </p>
        <div className="auth-tips">
          <div>Use the provided <code>.env.example</code> as the template.</div>
          <div>Read the updated README for the SQL policy setup.</div>
        </div>
      </div>
    </div>
  );
}
