import { useState, useEffect } from 'react'
import { fetchAllTransactions } from './useTransactions'

export function useInsights() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTransactions()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  // Group by month → { "2026-04": { income, expense, investment } }
  const byMonth = data.reduce((acc, t) => {
    const key = t.date.slice(0, 7) // "YYYY-MM"
    if (!acc[key]) acc[key] = { income: 0, expense: 0, investment: 0 }
    if (t.type === 'income')     acc[key].income     += Number(t.amount)
    if (t.type === 'expense')    acc[key].expense    += Number(t.amount)
    if (t.type === 'investment') acc[key].investment += Number(t.amount)
    return acc
  }, {})

  // Sorted array for charts
  const monthlyTrend = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [y, m] = key.split('-')
      return {
        key,
        label: new Date(Number(y), Number(m) - 1, 1)
          .toLocaleString('default', { month: 'short' }),
        ...vals,
        savings: vals.income - vals.expense,
        savingsRate: vals.income > 0
          ? Math.round(((vals.income - vals.expense) / vals.income) * 100)
          : 0,
      }
    })

  // Spending by category across all time
  const byCategory = data
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})

  return { loading, monthlyTrend, byCategory, rawData: data }
}