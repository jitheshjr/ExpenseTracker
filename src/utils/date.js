const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function todayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseYmdLocal(value) {
  if (!value) return new Date(Number.NaN);

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthLabel(value) {
  const parsedDate = parseYmdLocal(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return `${MONTHS[parsedDate.getMonth()]} ${String(parsedDate.getDate()).padStart(2, "0")}`;
}

export function fullDateLabel(value) {
  const parsedDate = parseYmdLocal(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isSameMonth(value, monthIndex, year) {
  const parsedDate = parseYmdLocal(value);
  return parsedDate.getMonth() === monthIndex && parsedDate.getFullYear() === year;
}

export function getYear(value) {
  return parseYmdLocal(value).getFullYear();
}
