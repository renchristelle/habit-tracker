import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { cardView, DEFAULT_HABITS, dayStatus, flowerPetals, Habit, EntryMap, placeFlower, progress } from './domain'

const TODAY = '2026-09-30' // mercredi

function habit(key: string, started_on = '2026-09-01'): Habit {
  const d = DEFAULT_HABITS.find((h) => h.key === key)!
  return { ...d, id: key, started_on }
}

/** remplit une habitude booléenne : true = fait, false = manqué, pour chaque jour depuis start */
function fill(h: Habit, from: string, values: (boolean | null)[]): EntryMap {
  const m: EntryMap = { [h.id]: {} }
  values.forEach((v, i) => {
    if (v !== null) m[h.id][addDays(from, i)] = { value: v }
  })
  return m
}

describe('validation', () => {
  it('sport validé dès 1 vidéo, toutes zones confondues', () => {
    const h = habit('sport')
    expect(dayStatus(h, TODAY, TODAY, { sport: { [TODAY]: { legs: 1 } } }, [])).toBe('done')
    expect(dayStatus(h, TODAY, TODAY, { sport: { [TODAY]: { no: true } } }, [])).toBe('missed')
    expect(dayStatus(h, TODAY, TODAY, {}, [])).toBe('pending')
  })
  it('coucher validé seulement avant 23h30', () => {
    const h = habit('bed')
    expect(dayStatus(h, TODAY, TODAY, { bed: { [TODAY]: { time: '23:29' } } }, [])).toBe('done')
    expect(dayStatus(h, TODAY, TODAY, { bed: { [TODAY]: { time: '23:30' } } }, [])).toBe('missed')
    expect(dayStatus(h, TODAY, TODAY, { bed: { [TODAY]: { time: '00:15' } } }, [])).toBe('missed')
  })
  it('jours non prévus et passé non rempli', () => {
    const h = habit('phone')
    expect(dayStatus(h, '2026-09-27', TODAY, {}, [])).toBe('off') // dimanche
    expect(dayStatus(h, '2026-09-29', TODAY, {}, [])).toBe('missed')
  })
  it('repos planifié', () => {
    const h = habit('medit')
    const rests = [{ id: 'r', label: 'x', start_day: '2026-09-28', end_day: '2026-09-29', habit_ids: null }]
    expect(dayStatus(h, '2026-09-29', TODAY, {}, rests)).toBe('rest')
  })
})

describe('séries', () => {
  it('un seul jour manqué ne casse pas la série', () => {
    const h = habit('medit', '2026-09-20')
    const e = fill(h, '2026-09-20', [true, true, true, false, true, true])
    expect(progress(h, '2026-09-25', TODAY, e, []).streak).toBe(5)
  })
  it('deux jours manqués de suite cassent la série', () => {
    const h = habit('medit', '2026-09-20')
    const e = fill(h, '2026-09-20', [true, true, true, false, false, true])
    expect(progress(h, '2026-09-25', TODAY, e, []).streak).toBe(1)
    expect(progress(h, '2026-09-25', TODAY, e, []).record).toBe(3)
  })
  it('enracinée après 66 jours à ≥ 80 %, tolère alors 2 jours manqués', () => {
    const start = addDays(TODAY, -70)
    const h = habit('medit', start)
    const vals = Array.from({ length: 68 }, () => true as boolean | null)
    vals.push(false, false) // J-2, J-1 manqués
    const e = fill(h, start, vals)
    const p = progress(h, addDays(TODAY, -1), TODAY, e, [])
    expect(p.rooted).toBe(true)
    expect(p.streak).toBe(68)
  })
})

describe('messages', () => {
  const start = addDays(TODAY, -70)
  const h = habit('medit', start)
  const base = Array.from({ length: 68 }, () => true as boolean | null)

  it('entretien : veille manquée puis « pas ce soir » → message des deux jours', () => {
    const e1 = fill(h, start, [...base, true, false, null])
    expect(cardView(h, TODAY, TODAY, e1, []).alert?.text).toMatch(/^Hier sans eau\. Elle est bien enracinée/)
    const e2 = fill(h, start, [...base, true, false, false])
    expect(cardView(h, TODAY, TODAY, e2, []).alert?.text).toMatch(/^Deux jours sans eau\. Arrose-la demain/)
  })
  it('entretien : deux jours manqués puis « pas ce soir » → message du troisième jour', () => {
    const e1 = fill(h, start, [...base, false, false, null])
    expect(cardView(h, TODAY, TODAY, e1, []).alert?.text).toMatch(/^Deux jours sans eau\. Arrose-la aujourd’hui/)
    const e2 = fill(h, start, [...base, false, false, false])
    expect(cardView(h, TODAY, TODAY, e2, []).alert?.text).toMatch(/^Trois jours sans eau/)
  })
  it('habitude normale : veille manquée → déshydratée', () => {
    const h2 = habit('medit', '2026-09-25')
    const e = fill(h2, '2026-09-25', [true, true, true, true, false, null])
    const v = cardView(h2, TODAY, TODAY, e, [])
    expect(v.state).toBe('dry')
    expect(v.alert?.text).toBe('Hier sans eau. Arrose-la aujourd’hui pour sauver ta série de 4 j.')
  })
})

describe('jardin', () => {
  it('5 pétales par fleur puis nouvelle pousse', () => {
    expect(flowerPetals(0)).toEqual([0])
    expect(flowerPetals(7)).toEqual([5, 2])
    expect(flowerPetals(10)).toEqual([5, 5, 0])
  })
  const minDist = (pts: { x: number; y: number }[]) => {
    let m = Infinity
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) m = Math.min(m, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y))
    return m
  }
  it('les fleurs ne se chevauchent pas', () => {
    for (let run = 0; run < 50; run++) {
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < 12; i++) pts.push(placeFlower(pts))
      expect(minDist(pts)).toBeGreaterThan(46)
    }
  })
  it('jardin très fourni : les fleurs restent espacées', () => {
    for (let run = 0; run < 20; run++) {
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < 30; i++) pts.push(placeFlower(pts))
      expect(minDist(pts)).toBeGreaterThan(22)
    }
  })
})
