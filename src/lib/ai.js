const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export async function askAI(messages, systemPrompt) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) throw new Error('AI request failed')
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

export function buildFinanceContext(transactions, totals, month, year) {
  const byCategory = {}
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount)
    })

  return `
You are a personal finance assistant. The user is tracking their expenses.
Current month: ${month}/${year}
Income: ₹${totals.income}
Total expenses: ₹${totals.expense}
Investments (Mutual Fund): ₹${totals.investment}
Net balance: ₹${totals.balance}
Savings rate: ${totals.savingsRate}%
Spending by category: ${JSON.stringify(byCategory)}
Respond concisely. Use ₹ for currency. Keep responses under 150 words unless a detailed breakdown is asked.
  `.trim()
}