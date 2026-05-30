import { format } from 'date-fns'
import CategoryBadge from './CategoryBadge'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))
const prefix = (type) => type === 'income' ? '+' : type === 'expense' ? '−' : ''

export default function TransactionList({ transactions, onEdit, onDelete, showActions = false }) {
  if (!transactions.length) return (
    <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
      No transactions found
    </div>
  )

  return (
    <div>
      {transactions.map(t => (
        <div key={t.id} className="txn-row">
          <CategoryBadge categoryId={t.category} />
          <div className="txn-meta">
            <div className="txn-name">{t.note || t.category}</div>
            <div className="txn-date">{format(new Date(t.date), 'MMM d, yyyy')}</div>
          </div>
          <div className={`txn-amount ${t.type}`}>
            {prefix(t.type)}₹{fmt(t.amount)}
          </div>
          {showActions && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => onEdit?.(t)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: 14,
                }}
              >
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete?.(t.id)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: 14,
                }}
              >
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}