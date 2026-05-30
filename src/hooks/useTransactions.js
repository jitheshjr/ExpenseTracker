import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTransactions(year, month) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchTransactions = useCallback(async () => {
  setLoading(true)
  setError(null)

  // Get first day of month and first day of next month
  const from    = new Date(year, month - 1, 1)
  const toExcl  = new Date(year, month, 1) // first day of next month

  const fromStr = from.toISOString().slice(0, 10)
  const toStr   = toExcl.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', fromStr)
    .lt('date', toStr)      // lt (less than) instead of lte, using next month's 1st
    .order('date', { ascending: false })

  if (error) setError(error.message)
  else setTransactions(data || [])
  setLoading(false)
}, [year, month])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const addTransaction = async (payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...payload, user_id: user.id }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTransactions(prev => [data, ...prev])
    return data
  }

  const updateTransaction = async (id, payload) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTransactions(prev => prev.map(t => t.id === id ? data : t))
    return data
  }

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income')     acc.income     += Number(t.amount)
      if (t.type === 'expense')    acc.expense    += Number(t.amount)
      if (t.type === 'investment') acc.investment += Number(t.amount)
      return acc
    },
    { income: 0, expense: 0, investment: 0 }
  )
  totals.balance     = totals.income - totals.expense - totals.investment
  totals.savingsRate = totals.income > 0
    ? Math.round(((totals.income - totals.expense) / totals.income) * 100)
    : 0

  return {
    transactions, loading, error, totals,
    refetch: fetchTransactions,
    addTransaction, updateTransaction, deleteTransaction,
  }
}

export async function fetchAllTransactions() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}