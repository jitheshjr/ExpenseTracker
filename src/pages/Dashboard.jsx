import { useState } from 'react'
import { format } from 'date-fns'
import { useTransactions } from '../hooks/useTransactions'
import MonthHeader from '../components/MonthHeader'
import TransactionList from '../components/TransactionList'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))

export default function Dashboard({ setShowAdd, onEdit }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { transactions, loading, totals, deleteTransaction } = useTransactions(year, month)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const biggestCategory = () => {
    const map = {}
    transactions.filter(t => t.type === 'expense')
      .forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount) })
    const entries = Object.entries(map)
    if (!entries.length) return '—'
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }
  const handleLogout = async () => {
  await supabase.auth.signOut()
}

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div className="topbar">
        <MonthHeader
          year={year} month={month}
          onPrev={prevMonth} onNext={nextMonth}
          disableNext={isCurrentMonth}
        />
        <button className="icon-btn" onClick={handleLogout} aria-label="Sign out">
          <i className="ti ti-logout" aria-hidden="true" />
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: '8px 20px 16px', flexShrink: 0 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
          Net Balance
        </p>
        <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -1.5, lineHeight: 1.1, margin: '4px 0 12px' }}>
          <span style={{ fontSize: 22, color: 'var(--text-secondary)', fontWeight: 400, verticalAlign: 'super', marginRight: 2 }}>₹</span>
          {loading ? '—' : fmt(totals.balance)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { dot: 'var(--income-color)',  label: 'Income', value: totals.income  },
            { dot: 'var(--expense-color)', label: 'Spent',  value: totals.expense },
          ].map(p => (
            <div key={p.label} style={{
              display:'flex', alignItems:'center', gap:6,
              background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)',
              borderRadius:'var(--radius-full)', padding:'5px 12px',
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:p.dot, flexShrink:0 }} />
              <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{p.label}</span>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)' }}>₹{fmt(p.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card"><div className="s-label">Savings</div>
          <div className="s-value">{loading ? '—' : `${totals.savingsRate}%`}</div></div>
        <div className="stat-card"><div className="s-label">Invested</div>
          <div className="s-value">{loading ? '—' : `₹${fmt(totals.investment)}`}</div></div>
        <div className="stat-card"><div className="s-label">Top Spend</div>
          <div className="s-value dim">{loading ? '—' : biggestCategory()}</div></div>
      </div>

      {/* Recent */}
      <div className="section-head"><h3>Recent</h3></div>
      <div className="scroll-area">
        {loading
          ? <div className="empty-state">Loading...</div>
          : <TransactionList
              transactions={transactions.slice(0, 8)}
              showActions={false}
            />
        }
      </div>

      {/* FAB */}
      <button className="fab" onClick={setShowAdd} aria-label="Add transaction">
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
    </div>
  )
}