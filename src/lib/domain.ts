import { addDays, daysBetween, daysInMonth, weekdayIndex } from './dates'

export type Kind = 'sport' | 'boolean' | 'bedtime'

export interface Habit {
  id: string
  key: string
  kind: Kind
  name: string
  flower: string
  color: string
  deep: string
  days: number[] // lundi → dimanche, 1 = prévue
  yes_label: string | null
  no_label: string | null
  bedtime_limit: string | null
  identity: string | null
  sort: number
  started_on: string
}

export interface EntryData {
  arms?: number
  abs?: number
  legs?: number
  no?: boolean
  value?: boolean | null
  time?: string
  rest?: boolean
}

export interface RestPeriod {
  id: string
  label: string
  start_day: string
  end_day: string
  habit_ids: string[] | null
}

export type DayStatus = 'future' | 'before' | 'off' | 'rest' | 'done' | 'missed' | 'pending'

/** entries[habitId][day] */
export type EntryMap = Record<string, Record<string, EntryData>>

export const ZONES = [
  { id: 'arms', label: 'Bras' },
  { id: 'abs', label: 'Abdos' },
  { id: 'legs', label: 'Jambes & fessiers' },
] as const
export type ZoneId = (typeof ZONES)[number]['id']

export const ROOT_WINDOW = 66
export const ROOT_RATE = 0.8

export function sportTotal(d: EntryData | undefined): number {
  if (!d) return 0
  return (d.arms ?? 0) + (d.abs ?? 0) + (d.legs ?? 0)
}

export function evaluate(h: Habit, d: EntryData | undefined): { done: boolean; explicitMiss: boolean } {
  if (!d) return { done: false, explicitMiss: false }
  if (h.kind === 'sport') return { done: sportTotal(d) >= 1, explicitMiss: !!d.no && sportTotal(d) === 0 }
  if (h.kind === 'boolean') return { done: d.value === true, explicitMiss: d.value === false }
  if (d.time) {
    const ok = d.time >= '18:00' && d.time < (h.bedtime_limit ?? '23:30')
    return { done: ok, explicitMiss: !ok }
  }
  return { done: false, explicitMiss: false }
}

export function isRest(h: Habit, day: string, d: EntryData | undefined, rests: RestPeriod[]): boolean {
  if (d?.rest) return true
  return rests.some((r) => day >= r.start_day && day <= r.end_day && (!r.habit_ids || r.habit_ids.includes(h.id)))
}

export function dayStatus(h: Habit, day: string, today: string, entries: EntryMap, rests: RestPeriod[]): DayStatus {
  if (day > today) return 'future'
  if (day < h.started_on) return 'before'
  if (!h.days[weekdayIndex(day)]) return 'off'
  const d = entries[h.id]?.[day]
  if (isRest(h, day, d, rests)) return 'rest'
  const e = evaluate(h, d)
  if (e.done) return 'done'
  if (e.explicitMiss || day < today) return 'missed'
  return 'pending'
}

export interface Progress {
  streak: number
  record: number
  rooted: boolean
  rate66: number // 0..1 sur la fenêtre de 66 jours
  age: number // jours depuis le début de l'habitude (inclus)
}

/**
 * Parcourt l'historique jusqu'au jour `until` (inclus).
 * Série : cassée après 2 jours prévus manqués d'affilée (3 si l'habitude était enracinée).
 * Enracinée : habitude d'au moins 66 jours, réussie ≥ 80 % sur les 66 derniers jours.
 */
export function progress(h: Habit, until: string, today: string, entries: EntryMap, rests: RestPeriod[]): Progress {
  let streak = 0
  let record = 0
  let run = 0
  let rooted = false
  const window: DayStatus[] = []
  let wDone = 0
  let wMiss = 0
  const n = daysBetween(h.started_on, until)
  for (let i = 0; i <= n; i++) {
    const day = addDays(h.started_on, i)
    const st = dayStatus(h, day, today, entries, rests)
    const limit = rooted ? 3 : 2
    if (st === 'done') {
      streak++
      run = 0
    } else if (st === 'missed') {
      run++
      if (run >= limit) streak = 0
    }
    record = Math.max(record, streak)
    window.push(st)
    if (st === 'done') wDone++
    if (st === 'missed') wMiss++
    if (window.length > ROOT_WINDOW) {
      const out = window.shift()
      if (out === 'done') wDone--
      if (out === 'missed') wMiss--
    }
    const rate = wDone + wMiss ? wDone / (wDone + wMiss) : 0
    rooted = i + 1 >= ROOT_WINDOW && rate >= ROOT_RATE
  }
  const rate66 = wDone + wMiss ? wDone / (wDone + wMiss) : 0
  return { streak, record, rooted, rate66, age: Math.max(0, n + 1) }
}

/** Jours prévus manqués d'affilée juste avant `day` (on saute les jours non prévus et les repos). */
export function missesBefore(h: Habit, day: string, today: string, entries: EntryMap, rests: RestPeriod[]): number {
  let count = 0
  let d = addDays(day, -1)
  for (let guard = 0; guard < 30; guard++) {
    const st = dayStatus(h, d, today, entries, rests)
    if (st === 'before') break
    if (st === 'missed') count++
    else if (st === 'done') break
    d = addDays(d, -1)
  }
  return count
}

export type FlowerState = 'bud' | 'watered' | 'wilted' | 'dry' | 'rest'

export interface CardView {
  status: DayStatus
  state: FlowerState
  bloom: 'half' | 'full' | null
  label: string
  streak: number
  rooted: boolean
  alert: { kind: 'soft' | 'warn' | 'bad'; text: string } | null
}

export function cardView(h: Habit, day: string, today: string, entries: EntryMap, rests: RestPeriod[]): CardView {
  const status = dayStatus(h, day, today, entries, rests)
  const prior = missesBefore(h, day, today, entries, rests)
  const prevDayProgress = progress(h, addDays(day, -1), today, entries, rests)
  const rooted = prevDayProgress.rooted
  const { streak } = progress(h, day, today, entries, rests)

  let state: FlowerState = 'bud'
  if (status === 'rest') state = 'rest'
  else if (status === 'done') state = 'watered'
  else if (status === 'missed') state = 'wilted'
  else if (prior > 0) state = 'dry'

  const label =
    state === 'rest' ? 'Au repos' : state === 'watered' ? 'Arrosée' : state === 'wilted' ? 'Fanée' : state === 'dry' ? 'Déshydratée' : 'À arroser'

  let alert: CardView['alert'] = null
  if (day === today && status !== 'rest') {
    const missed = status === 'missed'
    const done = status === 'done'
    const run = missed ? 1 + prior : prior
    const limit = rooted ? 3 : 2
    const when = missed ? 'demain' : 'aujourd’hui'
    const shownStreak = prevDayProgress.streak
    if (!done && run >= limit) {
      alert = { kind: 'bad', text: `${limit === 3 ? 'Trois' : 'Deux'} jours sans eau : la série repart de zéro. Une nouvelle pousse dès demain.` }
    } else if (!done && rooted && run === 2) {
      alert = { kind: 'warn', text: `Deux jours sans eau. Arrose-la ${when} : au troisième, ta série de ${shownStreak} j repart de zéro.` }
    } else if (!done && rooted && run === 1) {
      alert = {
        kind: 'soft',
        text: missed ? 'Un jour sans. Elle est bien enracinée, elle tient bon.' : 'Hier sans eau. Elle est bien enracinée, elle tient bon : arrose-la aujourd’hui.',
      }
    } else if (!done && !rooted && run === 1 && prior === 1) {
      alert = { kind: 'warn', text: `Hier sans eau. Arrose-la aujourd’hui pour sauver ta série de ${shownStreak} j.` }
    } else if (!done && !rooted && run === 1 && missed) {
      alert = { kind: 'soft', text: 'Un jour sans, ça arrive. La règle : jamais deux de suite.' }
    }
  }

  return { status, state, bloom: state === 'watered' ? (streak >= 7 ? 'full' : 'half') : null, label, streak, rooted, alert }
}

/** Statuts de chaque jour du mois */
export function monthStatuses(h: Habit, month: string, today: string, entries: EntryMap, rests: RestPeriod[]): DayStatus[] {
  const n = daysInMonth(month)
  return Array.from({ length: n }, (_, i) => dayStatus(h, addDays(month, i), today, entries, rests))
}

/** Fleurs du jardin : 1 arrosage = 1 pétale ; 5 pétales = fleur éclose ; puis nouvelle pousse. */
export function flowerPetals(doneCount: number): number[] {
  const full = Math.floor(doneCount / 5)
  const out: number[] = Array(full).fill(5)
  out.push(doneCount % 5)
  return out
}

export const GARDEN = { w: 326, h: 300, minX: 26, maxX: 300, minY: 72, maxY: 268, gap: 46 }

export function placeFlower(existing: { x: number; y: number }[], rand: () => number = Math.random): { x: number; y: number; rot: number } {
  const g = GARDEN
  // on tire des emplacements au hasard ; le premier assez éloigné des autres gagne,
  // sinon (jardin très fourni) on garde le plus dégagé
  let best = { x: 0, y: 0 }
  let bestDist = -1
  for (let t = 0; t < 300; t++) {
    const x = g.minX + rand() * (g.maxX - g.minX)
    const y = g.minY + rand() * (g.maxY - g.minY)
    const dist = existing.length ? Math.min(...existing.map((q) => Math.hypot(q.x - x, q.y - y))) : Infinity
    if (dist > g.gap) return { x, y, rot: Math.round(rand() * 72) }
    if (dist > bestDist) {
      bestDist = dist
      best = { x, y }
    }
  }
  return { ...best, rot: Math.round(rand() * 72) }
}

export const DEFAULT_HABITS: Omit<Habit, 'id' | 'started_on'>[] = [
  { key: 'sport', kind: 'sport', name: 'Sport du matin', flower: 'Pivoine', color: '#C4687A', deep: '#9E3F52', days: [1, 1, 1, 1, 1, 1, 1], yes_label: null, no_label: null, bedtime_limit: null, identity: 'Je suis quelqu’un qui bouge chaque matin.', sort: 0 },
  { key: 'phone', kind: 'boolean', name: 'Téléphone : 8h–10h et 18h–22h', flower: 'Glycine', color: '#7C7BB5', deep: '#4E4D8C', days: [1, 1, 1, 1, 1, 0, 0], yes_label: 'Respecté', no_label: 'Pas respecté', bedtime_limit: null, identity: 'Je choisis où va mon attention.', sort: 1 },
  { key: 'medit', kind: 'boolean', name: 'Méditation du soir', flower: 'Jasmin', color: '#D9A441', deep: '#7E5A12', days: [1, 1, 1, 1, 1, 1, 1], yes_label: 'Méditée', no_label: 'Pas ce soir', bedtime_limit: null, identity: 'Je termine mes journées en calme.', sort: 2 },
  { key: 'bed', kind: 'bedtime', name: 'Au lit avant 23h30', flower: 'Bleuet', color: '#6A93C0', deep: '#3F6690', days: [1, 1, 1, 1, 0, 0, 1], yes_label: null, no_label: null, bedtime_limit: '23:30', identity: 'Je protège mon sommeil.', sort: 3 },
]
