import { lazy, Suspense, startTransition, useEffect, useRef, useState } from "react";
import { supabase, hasSupabaseConfig } from "./services/supabase";
import { fmtINR } from "./utils/format";
import { fullDateLabel, isSameMonth, monthLabel, todayStr } from "./utils/date";
import "./App.css";

const ChartPanel = lazy(() => import("./components/ChartPanel"));

const CATEGORIES = [
  { name: "Fuel", icon: "⛽" },
  { name: "Travel", icon: "✈️" },
  { name: "Food", icon: "🍛" },
  { name: "Grooming", icon: "✂️" },
  { name: "Other", icon: "📦" },
  { name: "Income", icon: "💰" },
];

export default function App() {
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
        if (!nextSession) setExpenses([]);
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
    setAmount("");
    setNote("");
    setDate(todayStr());
    showToast("Signed out");
  }

  async function handleAdd() {
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
    const { error: insertError } = await supabase.from("expenses").insert([
      {
        amount: parsedAmount,
        category,
        note: trimmedNote || null,
        date,
        user_id: user.id,
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      showToast("Save failed", "error");
      return;
    }

    setAmount("");
    setNote("");
    setDate(todayStr());
    showToast(isIncome ? "Income recorded" : "Expense added", "success");
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

    showToast("Entry deleted", "success");
    await loadExpensesForUser(user.id);
  }

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
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
          <div className="amount-zone" onClick={() => hiddenInput.current?.focus()}>
            <div className="amount-zone-label">Enter amount</div>
            <div className={`amount-display${!amount ? " empty" : ""}`}>
              {amount ? fmtINR(Number.parseFloat(amount) || 0) : "₹0"}
              <span className="amount-cursor" />
            </div>
            <div className="tap-hint">tap to type</div>
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
            onKeyDown={(event) => event.key === "Enter" && handleAdd()}
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
            <button className="add-btn" type="button" onClick={handleAdd} disabled={loading || !amount}>
              {loading ? "Saving…" : category === "Income" ? "Record Income" : "Add Expense"}
            </button>
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
                onDelete={handleDelete}
                showDate
              />
            ))
          )}
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

function TxnRow({ e, showDate = false, onDelete, deletingId }) {
  const isIncome = e.category === "Income";
  const category = CATEGORIES.find((item) => item.name === e.category) || CATEGORIES[4];

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
