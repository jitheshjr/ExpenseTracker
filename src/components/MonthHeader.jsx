import { format } from 'date-fns'

export default function MonthHeader({ year, month, onPrev, onNext, disableNext }) {
  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <button className="icon-btn" onClick={onPrev} aria-label="Previous month">
        <i className="ti ti-chevron-left" aria-hidden="true" />
      </button>
      <span style={{
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        minWidth: 110,
        textAlign: 'center',
      }}>
        {label}
      </span>
      <button
        className="icon-btn"
        onClick={onNext}
        disabled={disableNext}
        style={{ opacity: disableNext ? 0.3 : 1 }}
        aria-label="Next month"
      >
        <i className="ti ti-chevron-right" aria-hidden="true" />
      </button>
    </div>
  )
}