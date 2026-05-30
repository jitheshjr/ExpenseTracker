import { useState } from 'react'
import { format } from 'date-fns'
import { useTransactions } from '../hooks/useTransactions'
import MonthHeader from '../components/MonthHeader'
import TransactionList from '../components/TransactionList'

const FILTERS = ['All', 'Expense', 'Income', 'Investment', 'Food', 'Petrol', 'Travel', 'Grooming', 'Mutual Fund', 'Other']

export default function History({ onEdit }) {
  const now = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [filter, setFilter] = useState('All')

  const { transactions, loading, deleteTransaction } = useTransactions(year, month)

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

  const filtered = transactions.filter(t => {
    if (filter === 'All') return true
    const f = filter.toLowerCase()
    if (f === t.type) return true
    if (t.category.toLowerCase() === f) return true
    return false
  })

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    await deleteTransaction(id)
  }

  return (
    <div className="page">
      <div className="topbar">
        <MonthHeader
          year={year} month={month}
          onPrev={prevMonth} onNext={nextMonth}
          disableNext={isCurrentMonth}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display:'flex', gap:6, padding:'4px 20px 12px', overflowX:'auto', flexShrink:0 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--bg-hover)' : 'var(--bg-surface)',
              border: `0.5px solid ${filter === f ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-full)', padding:'5px 12px',
              fontSize:11, color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              whiteSpace:'nowrap', flexShrink:0, fontWeight: filter === f ? 500 : 400,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ padding:'0 20px 8px', flexShrink:0 }}>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
          {loading ? '—' : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="scroll-area">
        {loading
          ? <div className="empty-state">Loading...</div>
          : <TransactionList
              transactions={filtered}
              showActions={true}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
        }
      </div>
    </div>
  )
}