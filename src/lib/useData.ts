import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { todayISO } from './dates'
import { DEFAULT_HABITS, EntryData, EntryMap, Habit, RestPeriod } from './domain'

export interface GardenFlower {
  id: string
  habit_id: string
  month: string
  idx: number
  x: number
  y: number
  rot: number
}

export interface Store {
  loading: boolean
  error: string | null
  habits: Habit[]
  entries: EntryMap
  rests: RestPeriod[]
  flowers: GardenFlower[]
  today: string
  setEntry: (habitId: string, day: string, patch: Partial<EntryData>) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  addRest: (r: Omit<RestPeriod, 'id'>) => Promise<void>
  deleteRest: (id: string) => Promise<void>
  addFlowers: (rows: Omit<GardenFlower, 'id'>[]) => Promise<void>
}

export function useData(userId: string): Store {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<EntryMap>({})
  const [rests, setRests] = useState<RestPeriod[]>([])
  const [flowers, setFlowers] = useState<GardenFlower[]>([])
  const [today, setToday] = useState(todayISO())
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // change de jour à minuit / au retour dans l'app
  useEffect(() => {
    const tick = () => setToday(todayISO())
    const iv = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let { data: hs, error: e1 } = await supabase.from('habits').select('*').order('sort')
        if (e1) throw e1
        if (!hs || hs.length === 0) {
          const { data: created, error: e2 } = await supabase
            .from('habits')
            .insert(DEFAULT_HABITS.map((h) => ({ ...h, started_on: todayISO() })))
            .select('*')
          if (e2) throw e2
          hs = (created ?? []).sort((a, b) => a.sort - b.sort)
        }
        // Supabase renvoie 1000 lignes max par requête : on pagine
        const fetchAll = async (table: string, cols: string) => {
          const rows: Record<string, unknown>[] = []
          for (let from = 0; ; from += 1000) {
            const { data, error } = await supabase.from(table).select(cols).order('id').range(from, from + 999)
            if (error) throw error
            rows.push(...((data ?? []) as unknown as Record<string, unknown>[]))
            if (!data || data.length < 1000) return rows
          }
        }
        const [es, fs, { data: rs, error: e4 }] = await Promise.all([
          fetchAll('entries', 'habit_id, day, data, id') as Promise<{ habit_id: string; day: string; data: unknown }[]>,
          fetchAll('garden_flowers', '*') as Promise<unknown[]>,
          supabase.from('rest_periods').select('*').order('start_day'),
        ])
        if (e4) throw e4
        if (cancelled) return
        const map: EntryMap = {}
        for (const e of es ?? []) (map[e.habit_id] ??= {})[e.day] = e.data as EntryData
        setHabits(hs as Habit[])
        setEntries(map)
        setRests((rs ?? []) as RestPeriod[])
        setFlowers((fs ?? []) as GardenFlower[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setEntry = useCallback((habitId: string, day: string, patch: Partial<EntryData>) => {
    const prev = entriesRef.current[habitId]?.[day] ?? {}
    const next: EntryData = { ...prev, ...patch }
    setEntries((m) => ({ ...m, [habitId]: { ...(m[habitId] ?? {}), [day]: next } }))
    supabase
      .from('entries')
      .upsert({ habit_id: habitId, day, data: next, updated_at: new Date().toISOString() }, { onConflict: 'habit_id,day' })
      .then(({ error: e }) => {
        if (e) setError('Enregistrement impossible : ' + e.message)
      })
  }, [])

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)))
    supabase
      .from('habits')
      .update(patch)
      .eq('id', id)
      .then(({ error: e }) => {
        if (e) setError('Enregistrement impossible : ' + e.message)
      })
  }, [])

  const addRest = useCallback(async (r: Omit<RestPeriod, 'id'>) => {
    const { data, error: e } = await supabase.from('rest_periods').insert(r).select('*').single()
    if (e) return setError(e.message)
    setRests((rs) => [...rs, data as RestPeriod].sort((a, b) => a.start_day.localeCompare(b.start_day)))
  }, [])

  const deleteRest = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('rest_periods').delete().eq('id', id)
    if (e) return setError(e.message)
    setRests((rs) => rs.filter((r) => r.id !== id))
  }, [])

  const addFlowers = useCallback(async (rows: Omit<GardenFlower, 'id'>[]) => {
    if (!rows.length) return
    const { data, error: e } = await supabase
      .from('garden_flowers')
      .upsert(rows, { onConflict: 'habit_id,month,idx', ignoreDuplicates: true })
      .select('*')
    if (e) return setError(e.message)
    setFlowers((fs) => {
      const known = new Set(fs.map((f) => `${f.habit_id}|${f.month}|${f.idx}`))
      return [...fs, ...((data ?? []) as GardenFlower[]).filter((f) => !known.has(`${f.habit_id}|${f.month}|${f.idx}`))]
    })
  }, [])

  return { loading, error, habits, entries, rests, flowers, today, setEntry, updateHabit, addRest, deleteRest, addFlowers }
}
