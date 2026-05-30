import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useBudget(year, month) {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('year', year)
      .eq('month', month)
    setBudgets(data || [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const upsertBudget = async (category, amount) => {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = budgets.find(b => b.category === category)

    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      setBudgets(prev => prev.map(b => b.id === existing.id ? data : b))
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert([{ user_id: user.id, category, amount, year, month }])
        .select()
        .single()
      if (error) throw new Error(error.message)
      setBudgets(prev => [...prev, data])
    }
  }

  const deleteBudget = async (category) => {
    const existing = budgets.find(b => b.category === category)
    if (!existing) return
    await supabase.from('budgets').delete().eq('id', existing.id)
    setBudgets(prev => prev.filter(b => b.id !== existing.id))
  }

  const getBudgetForCategory = (category) =>
    budgets.find(b => b.category === category)?.amount || null

  return { budgets, loading, upsertBudget, deleteBudget, getBudgetForCategory, refetch: fetchBudgets }
}