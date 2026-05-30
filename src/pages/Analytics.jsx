import { useInsights } from '../hooks/useInsights'
import IncomeExpenseBar from '../components/charts/BarChart'
import TrendLine from '../components/charts/TrendLine'
import SavingsRateChart from '../components/charts/SavingsRate'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

export default function Analytics() {
  const { loading, monthlyTrend, byCategory } = useInsights()

  const maxCat = Math.max(...Object.values(byCategory), 1)
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  if (loading) return <div className="page"><div className="empty-state" style={{ marginTop: 80 }}>Loading...</div></div>

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar-title">Analytics</span>
      </div>
      <div className="scroll-area" style={{ padding: '0 20px 24px' }}>

        {/* Income vs Expense */}
        <div className="chart-card">
          <p className="chart-card-title">Income vs Expense</p>
          <IncomeExpenseBar data={monthlyTrend} />
        </div>

        {/* Savings trend */}
        <div className="chart-card">
          <p className="chart-card-title">Savings Trend</p>
          <TrendLine data={monthlyTrend} />
        </div>

        {/* Savings rate */}
        <div className="chart-card">
          <p className="chart-card-title">Savings Rate %</p>
          <SavingsRateChart data={monthlyTrend} />
        </div>

        {/* Category breakdown */}
        <div className="chart-card">
          <p className="chart-card-title">Spending by Category</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedCats.map(([cat, amt]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 72, flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                  <div style={{ width: `${(amt / maxCat) * 100}%`, height: 4, background: 'var(--accent-dark)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 56, textAlign: 'right', flexShrink: 0 }}>
                  ₹{fmt(amt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly summary table */}
        <div className="chart-card">
          <p className="chart-card-title">Monthly Summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...monthlyTrend].reverse().map(m => (
              <div key={m.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 10, borderBottom: '0.5px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 40 }}>{m.label}</span>
                <span style={{ fontSize: 12, color: 'var(--income-color)' }}>+₹{fmt(m.income)}</span>
                <span style={{ fontSize: 12, color: 'var(--expense-color)' }}>−₹{fmt(m.expense)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.savingsRate}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}