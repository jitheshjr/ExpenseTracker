import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useBudget } from '../hooks/useBudget'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import MonthHeader from '../components/MonthHeader'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

export default function Budget() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [editCat, setEditCat] = useState(null)
  const [inputVal, setInputVal] = useState('')

  const { transactions } = useTransactions(year, month)
  const { budgets, upsertBudget, deleteBudget, getBudgetForCategory } = useBudget(year, month)

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

  const spentByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})

  const openEdit = (cat) => {
    const existing = getBudgetForCategory(cat)
    setInputVal(existing ? String(existing) : '')
    setEditCat(cat)
  }

  const saveEdit = async () => {
    const val = Number(inputVal)
    if (!val || val <= 0) { setEditCat(null); return }
    await upsertBudget(editCat, val)
    setEditCat(null)
  }

  const getBarColor = (pct) => {
    if (pct >= 100) return 'var(--danger)'
    if (pct >= 80)  return 'var(--warn)'
    return 'var(--safe)'
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

      <div className="scroll-area" style={{ padding: '8px 20px 24px' }}>
        {EXPENSE_CATEGORIES.map(cat => {
          const spent  = spentByCategory[cat.id] || 0
          const budget = getBudgetForCategory(cat.id)
          const pct    = budget ? Math.min((spent / budget) * 100, 100) : 0

          return (
            <div key={cat.id} style={{
              background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 8,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: budget ? 10 : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <i className={`ti ${cat.icon}`} style={{ color:'var(--text-muted)', fontSize:16 }} aria-hidden="true" />
                  <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{cat.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {budget && (
                    <span style={{ fontSize:11, color: pct >= 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      ₹{fmt(spent)} / ₹{fmt(budget)}
                    </span>
                  )}
                  {!budget && spent > 0 && (
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>₹{fmt(spent)} spent</span>
                  )}
                  <button onClick={() => openEdit(cat.id)} style={{
                    width:26, height:26, borderRadius:6,
                    background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--text-muted)', fontSize:13,
                  }}>
                    <i className="ti ti-pencil" aria-hidden="true" />
                  </button>
                  {budget && (
                    <button onClick={() => deleteBudget(cat.id)} style={{
                      width:26, height:26, borderRadius:6,
                      background:'var(--bg-elevated)', border:'0.5px solid var(--border-default)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'var(--text-muted)', fontSize:13,
                    }}>
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {budget && (
                <div style={{ height:3, background:'var(--bg-elevated)', borderRadius:2 }}>
                  <div style={{ width:`${pct}%`, height:3, background:getBarColor(pct), borderRadius:2, transition:'width 0.3s' }} />
                </div>
              )}

              {!budget && (
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>No budget set — tap ✏️ to add one</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editCat && (
        <div style={{
          position:'absolute', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'flex-end', zIndex:40,
        }}
          onClick={() => setEditCat(null)}
        >
          <div
            style={{
              width:'100%', background:'var(--bg-surface)',
              borderRadius:'var(--radius-xl) var(--radius-xl) 0 0',
              padding:'24px 20px 36px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:16 }}>
              Budget for {editCat}
            </p>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:20 }}>
              <span style={{ fontSize:24, color:'var(--text-secondary)' }}>₹</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                autoFocus
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  fontSize:36, fontWeight:700, color:'var(--text-primary)',
                }}
              />
            </div>
            <button onClick={saveEdit} style={{
              width:'100%', background:'var(--accent-light)', color:'var(--bg-base)',
              borderRadius:'var(--radius-md)', padding:14, fontSize:14, fontWeight:600,
            }}>
              Set Budget
            </button>
          </div>
        </div>
      )}
    </div>
  )
}