import { useState } from 'react'
import { useInsights } from '../hooks/useInsights'
import { useTransactions } from '../hooks/useTransactions'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))

function generateInsights(monthlyTrend, currentTotals, prevTotals, byCategory) {
  const insights = []

  if (monthlyTrend.length < 2) {
    insights.push({ icon: 'ti-chart-bar', text: 'Add more months of data to unlock spending insights.' })
    return insights
  }

  // Savings rate
  if (currentTotals.savingsRate >= 30) {
    insights.push({ icon: 'ti-trending-up', text: `Strong savings rate of ${currentTotals.savingsRate}% this month. You're above the recommended 20%.` })
  } else if (currentTotals.savingsRate > 0) {
    insights.push({ icon: 'ti-alert-triangle', text: `Savings rate is ${currentTotals.savingsRate}% this month. Try to aim for at least 20%.` })
  }

  // Expense vs last month
  if (prevTotals && prevTotals.expense > 0) {
    const diff = currentTotals.expense - prevTotals.expense
    const pct  = Math.round((Math.abs(diff) / prevTotals.expense) * 100)
    if (diff > 0) {
      insights.push({ icon: 'ti-arrow-up', text: `Spending is up ₹${fmt(diff)} (${pct}%) compared to last month.` })
    } else if (diff < 0) {
      insights.push({ icon: 'ti-arrow-down', text: `Spending is down ₹${fmt(Math.abs(diff))} (${pct}%) compared to last month. Good discipline!` })
    }
  }

  // Biggest category
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0]
    const pct = currentTotals.expense > 0 ? Math.round((topAmt / currentTotals.expense) * 100) : 0
    insights.push({ icon: 'ti-wallet', text: `${topCat} is your biggest expense at ₹${fmt(topAmt)} — ${pct}% of total spending.` })
  }

  // Investment habit
  if (currentTotals.investment > 0) {
    const investPct = currentTotals.income > 0
      ? Math.round((currentTotals.investment / currentTotals.income) * 100)
      : 0
    insights.push({ icon: 'ti-trending-up', text: `You invested ₹${fmt(currentTotals.investment)} this month — ${investPct}% of your income.` })
  } else {
    insights.push({ icon: 'ti-info-circle', text: 'No mutual fund investment recorded this month.' })
  }

  // Average daily spend
  const today = new Date().getDate()
  if (currentTotals.expense > 0 && today > 0) {
    const daily = Math.round(currentTotals.expense / today)
    insights.push({ icon: 'ti-calendar', text: `You're spending an average of ₹${fmt(daily)} per day this month.` })
  }

  return insights
}

export default function AIAssistant() {
  const now = new Date()
  const { monthlyTrend, byCategory } = useInsights()

  const { totals: currentTotals } = useTransactions(now.getFullYear(), now.getMonth() + 1)

  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const { totals: prevTotals } = useTransactions(prevYear, prevMonth)

  const insights = generateInsights(monthlyTrend, currentTotals, prevTotals, byCategory)

  // Monthly summary stats
  const avgSavingsRate = monthlyTrend.length > 0
    ? Math.round(monthlyTrend.reduce((s, m) => s + m.savingsRate, 0) / monthlyTrend.length)
    : 0

  const bestMonth = monthlyTrend.length > 0
    ? monthlyTrend.reduce((best, m) => m.savingsRate > best.savingsRate ? m : best, monthlyTrend[0])
    : null

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar-title">Insights</span>
      </div>

      <div className="scroll-area" style={{ padding: '8px 20px 24px' }}>

        {/* Summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 16,
        }}>
          <div className="stat-card" style={{ gridColumn: 'span 1' }}>
            <div className="s-label">Avg Savings Rate</div>
            <div className="s-value">{avgSavingsRate}%</div>
          </div>
          <div className="stat-card">
            <div className="s-label">Best Month</div>
            <div className="s-value" style={{ fontSize: 12 }}>
              {bestMonth ? `${bestMonth.label} (${bestMonth.savingsRate}%)` : '—'}
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          This Month
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px',
            }}>
              <i className={`ti ${ins.icon}`} style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ins.text}</p>
            </div>
          ))}
        </div>

        {/* Monthly breakdown table */}
        {monthlyTrend.length > 0 && (
          <>
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '20px 0 10px' }}>
              Month by Month
            </p>
            <div className="chart-card">
              {[...monthlyTrend].reverse().map((m, i, arr) => (
                <div key={m.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 36 }}>{m.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--income-color)' }}>+₹{fmt(m.income)}</span>
                  <span style={{ fontSize: 12, color: 'var(--expense-color)' }}>−₹{fmt(m.expense)}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: m.savingsRate >= 20 ? 'var(--text-primary)' : 'var(--text-muted)',
                    width: 40, textAlign: 'right',
                  }}>
                    {m.savingsRate}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}