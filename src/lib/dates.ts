// Dates au format local 'YYYY-MM-DD' (fuseau de l'appareil)

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(iso: string): number {
  return (fromISO(iso).getDay() + 6) % 7
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function monthStart(iso: string): string {
  return iso.slice(0, 8) + '01'
}

export function addMonths(monthIso: string, n: number): string {
  const d = fromISO(monthIso)
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

export function daysInMonth(monthIso: string): number {
  const d = fromISO(monthIso)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export function longDate(iso: string): string {
  const d = fromISO(iso)
  const wd = WEEKDAYS[weekdayIndex(iso)]
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function monthLabel(monthIso: string): string {
  const d = fromISO(monthIso)
  const m = MONTHS[d.getMonth()]
  return `${m[0].toUpperCase()}${m.slice(1)} ${d.getFullYear()}`
}

export function shortDate(iso: string): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
