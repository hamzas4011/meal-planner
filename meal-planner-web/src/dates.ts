// Dates are handled in local time and sent to the API as yyyy-MM-dd (DateOnly).

export function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Monday of the week containing d.
export function startOfWeek(d: Date): Date {
  const mondayOffset = (d.getDay() + 6) % 7
  return addDays(d, -mondayOffset)
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

// The week shown in the planner; the shopping list starts from the same week.
export const selectedWeek = {
  start: startOfWeek(new Date()),
}
