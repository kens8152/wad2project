// Small, dependency-free date helpers (all output is deterministic en-SG style).

// Our own small helpers instead of a date library (like moment or date-fns), so no extra package is needed.
// JavaScript's Date.getDay() gives 0 for Sunday ... 6 for Saturday, and getMonth() gives 0 for January,
// so these lists are looked up by that number.
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// midnight at the start of a day (today if none is given): the year, month and day with the time left out
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// a NEW date `days` after the given one (copied first, so the original date is not changed)
export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** "21:00" + a day → Date */
export function withTime(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number) // "21:00" → ['21', '00'] → [21, 0]
  const d = new Date(day)
  d.setHours(h, m, 0, 0) // hours, minutes, seconds, milliseconds
  return d
}

export const dow = (d) => DOW[d.getDay()] // "Thu"
export const dowUpper = (d) => dow(d).toUpperCase() // "THU"
export const monthShort = (d) => MONTHS[d.getMonth()] // "Sep"

/** 21:00 → "9:00 PM" */
export function time12(d) {
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0') // 5 → "05"
  // `h % 12 || 12`: 13 → 1, and 0 or 12 → 12 (the 12-hour clock has no 0)
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

/** 20:00 → "8PM", 19:30 → "7:30PM" (compact, used on map labels) */
export function timeCompact(d) {
  const h = d.getHours()
  const m = d.getMinutes()
  const base = `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}`
  return `${base}${h < 12 ? 'AM' : 'PM'}`
}

/** "Sat 19 Sep" */
export const dayLabel = (d) => `${dow(d)} ${d.getDate()} ${monthShort(d)}`
/** "Sat 19 Sep 2026" */
export const dayLabelYear = (d) => `${dayLabel(d)} ${d.getFullYear()}`
/** "SAT 19 SEP · 8PM" (map cards) */
export const cardStamp = (d) => `${dowUpper(d)} ${d.getDate()} ${monthShort(d).toUpperCase()} · ${timeCompact(d)}`
