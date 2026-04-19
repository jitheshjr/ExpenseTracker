import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtINR } from "../utils/format";
import { getYear, parseYmdLocal } from "../utils/date";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="chart-tooltip-row" style={{ color: item.fill }}>
          {item.name}: {fmtINR(item.value)}
        </div>
      ))}
    </div>
  );
}

export default function ChartPanel({ expenses, year }) {
  const chartData = MONTHS.map((month, index) => {
    const rows = expenses.filter((entry) => {
      const parsedDate = parseYmdLocal(entry.date);
      return parsedDate.getMonth() === index && parsedDate.getFullYear() === year;
    });

    return {
      month,
      Income: Math.round(
        rows.filter((entry) => entry.category === "Income").reduce((sum, entry) => sum + entry.amount, 0),
      ),
      Expense: Math.round(
        rows.filter((entry) => entry.category !== "Income").reduce((sum, entry) => sum + entry.amount, 0),
      ),
    };
  });

  const yearlyRows = expenses.filter((entry) => getYear(entry.date) === year);
  const income = yearlyRows
    .filter((entry) => entry.category === "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expense = yearlyRows
    .filter((entry) => entry.category !== "Income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const net = income - expense;

  return (
    <div>
      <div className="chart-wrap">
        <div className="chart-title">This year</div>
        <div className="chart-sub">{year} · income vs expenses</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={8} barGap={3}>
            <CartesianGrid stroke="#1e1e1e" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#404040", fontSize: 10, fontFamily: "var(--mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#404040", fontSize: 10, fontFamily: "var(--mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="Income" fill="#e8e8e8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expense" fill="#404040" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#e8e8e8" }} />
            Income
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#404040" }} />
            Expenses
          </div>
        </div>
      </div>

      <div className="year-summary">
        <SummaryCard label="Year income" tone="income" value={fmtINR(income)} />
        <SummaryCard label="Year spent" tone="expense" value={fmtINR(expense)} />
        <SummaryCard
          label="Net savings"
          tone={net >= 0 ? "neutral" : "negative"}
          value={`${net >= 0 ? "+" : "−"}${fmtINR(Math.abs(net))}`}
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`year-card year-card-${tone}`}>
      <span className="year-card-label">{label}</span>
      <span className="year-card-value">{value}</span>
    </div>
  );
}
