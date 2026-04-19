export function fmtINR(value) {
  const amount = Number.isFinite(value) ? value : Number(value) || 0;
  return `₹${Math.abs(Math.round(amount)).toLocaleString("en-IN")}`;
}
