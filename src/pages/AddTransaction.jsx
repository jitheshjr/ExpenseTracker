import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useTransactions } from '../hooks/useTransactions'
import { CATEGORIES } from '../lib/categories'

const now = new Date()

export default function AddTransaction({ onClose, editTxn }) {
  const { addTransaction, updateTransaction } = useTransactions(now.getFullYear(), now.getMonth() + 1)

  const [amount,   setAmount]   = useState('')
  const [type,     setType]     = useState('expense')
  const [category, setCategory] = useState('Food')
  const [note,     setNote]     = useState('')
  const [date,     setDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (editTxn) {
      setAmount(String(editTxn.amount))
      setType(editTxn.type)
      setCategory(editTxn.category)
      setNote(editTxn.note || '')
      setDate(editTxn.date)
    }
  }, [editTxn])

  // Sync category when type changes
  useEffect(() => {
    const first = CATEGORIES.find(c => c.type === type)
    if (first) setCategory(first.id)
  }, [type])

  const filteredCats = CATEGORIES.filter(c => c.type === type)

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount'); return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = { amount: Number(amount), type, category, note, date }
      if (editTxn) await updateTransaction(editTxn.id, payload)
      else         await addTransaction(payload)
      onClose()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">{editTxn ? 'Edit Transaction' : 'New Transaction'}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'8px 20px 24px' }}>
        {/* Amount */}
        <p style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>Amount</p>
        <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:20 }}>
          <span style={{ fontSize:28, color:'var(--text-secondary)', fontWeight:400 }}>₹</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              fontSize:44, fontWeight:700, color:'var(--text-primary)', letterSpacing:-1,
            }}
          />
        </div>

        {/* Type toggle */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:16 }}>
          {['expense','income','investment'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                background: type === t ? 'var(--bg-hover)' : 'var(--bg-surface)',
                border: `0.5px solid ${type === t ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)', padding:'9px 4px',
                fontSize:11, color: type === t ? 'var(--text-primary)' : 'var(--text-muted)',
                textTransform:'capitalize', fontWeight: type === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category grid */}
        <p style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Category</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {filteredCats.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                background: category === c.id ? 'var(--bg-hover)' : 'var(--bg-surface)',
                border: `0.5px solid ${category === c.id ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)', padding:'12px 6px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
              }}
            >
              <i className={`ti ${c.icon}`} style={{ fontSize:20, color: category === c.id ? 'var(--text-primary)' : 'var(--text-muted)' }} aria-hidden="true" />
              <span style={{ fontSize:10, color: category === c.id ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Date */}
        <p style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Date</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            width:'100%', background:'var(--bg-surface)', border:'0.5px solid var(--border-default)',
            borderRadius:'var(--radius-md)', padding:'12px 14px', fontSize:13,
            color:'var(--text-primary)', outline:'none', marginBottom:16,
            colorScheme:'dark',
          }}
        />

        {/* Note */}
        <p style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Note (optional)</p>
        <input
          type="text"
          placeholder="Add a note..."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            width:'100%', background:'var(--bg-surface)', border:'0.5px solid var(--border-default)',
            borderRadius:'var(--radius-md)', padding:'12px 14px', fontSize:13,
            color:'var(--text-primary)', outline:'none', marginBottom:20,
          }}
        />

        {error && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:12 }}>{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width:'100%', background:'var(--accent-light)', color:'var(--bg-base)',
            borderRadius:'var(--radius-md)', padding:14, fontSize:14, fontWeight:600,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : editTxn ? 'Update Transaction' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}