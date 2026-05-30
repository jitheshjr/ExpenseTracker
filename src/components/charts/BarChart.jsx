import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{new Intl.NumberFormat('en-IN').format(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function IncomeExpenseBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <ReBarChart data={data} barSize={10} barGap={3}>
        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
        <Bar dataKey="income"  name="Income"  fill="var(--income-color)"  radius={[3,3,0,0]} />
        <Bar dataKey="expense" name="Expense" fill="var(--expense-color)" radius={[3,3,0,0]} />
      </ReBarChart>
    </ResponsiveContainer>
  )
}