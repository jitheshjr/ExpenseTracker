import { CATEGORY_MAP } from '../lib/categories'

export default function CategoryBadge({ categoryId, size = 38 }) {
  const cat = CATEGORY_MAP[categoryId]
  const icon = cat?.icon || 'ti-circle'

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 8,
      background: 'var(--bg-elevated)',
      border: '0.5px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: 'var(--text-muted)',
      fontSize: size * 0.42,
    }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
    </div>
  )
}