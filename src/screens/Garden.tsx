import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, daysInMonth, monthLabel, monthStart, shortDate, weekdayIndex } from '../lib/dates'
import { DayStatus, flowerPetals, GARDEN, Habit, monthStatuses, placeFlower, progress, ZONES } from '../lib/domain'
import type { GardenFlower, Store } from '../lib/useData'

const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Garden({ store }: { store: Store }) {
  const { habits, entries, rests, today, flowers, addFlowers } = store
  const current = monthStart(today)
  const [month, setMonth] = useState(current)
  const firstMonth = useMemo(() => monthStart(habits.reduce((m, h) => (h.started_on < m ? h.started_on : m), today)), [habits, today])

  const statuses = useMemo(() => {
    const out: Record<string, DayStatus[]> = {}
    for (const h of habits) out[h.id] = monthStatuses(h, month, today, entries, rests)
    return out
  }, [habits, month, today, entries, rests])

  // fleurs nécessaires ce mois-ci : on crée (et mémorise) la position des nouvelles pousses
  const needed = useMemo(
    () => habits.map((h) => ({ h, petals: flowerPetals(statuses[h.id].filter((s) => s === 'done').length) })),
    [habits, statuses],
  )
  const attempted = useRef(new Set<string>())
  useEffect(() => {
    const monthFlowers = flowers.filter((f) => f.month === month)
    const pts = monthFlowers.map((f) => ({ x: f.x, y: f.y }))
    const rows: Omit<GardenFlower, 'id'>[] = []
    for (const { h, petals } of needed) {
      petals.forEach((_, idx) => {
        const k = `${h.id}|${month}|${idx}`
        if (!monthFlowers.some((f) => f.habit_id === h.id && f.idx === idx) && !attempted.current.has(k)) {
          attempted.current.add(k)
          const p = placeFlower(pts)
          pts.push(p)
          rows.push({ habit_id: h.id, month, idx, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, rot: p.rot })
        }
      })
    }
    if (rows.length) addFlowers(rows)
  }, [needed, flowers, month, addFlowers])

  const plants = needed
    .flatMap(({ h, petals }) =>
      petals.map((n, idx) => {
        const f = flowers.find((x) => x.habit_id === h.id && x.month === month && x.idx === idx)
        return f ? { h, n, f } : null
      }),
    )
    .filter((p): p is { h: Habit; n: number; f: GardenFlower } => !!p)
    .sort((a, b) => a.f.y - b.f.y)

  const tufts = useMemo(() => {
    let s = 77
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 10 }, () => ({ left: Math.round(10 + r() * 296), top: Math.round(90 + r() * 200) }))
  }, [])

  const lead = weekdayIndex(month)
  const nDays = daysInMonth(month)

  const zoneTotals = useMemo(() => {
    const sport = habits.find((h) => h.kind === 'sport')
    const t = { arms: 0, abs: 0, legs: 0 }
    if (!sport) return t
    for (let i = 0; i < nDays; i++) {
      const d = entries[sport.id]?.[addDays(month, i)]
      if (d) for (const z of ZONES) t[z.id] += d[z.id] ?? 0
    }
    return t
  }, [habits, entries, month, nDays])
  const zmax = Math.max(1, zoneTotals.arms, zoneTotals.abs, zoneTotals.legs)

  return (
    <>
      <header className="header">
        <h1>Mon jardin</h1>
        <div className="between">
          <button className="round" aria-label="Mois précédent" disabled={month <= firstMonth} onClick={() => setMonth(addMonths(month, -1))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22 }}>{monthLabel(month)}</div>
          <button className="round" aria-label="Mois suivant" disabled={month >= current} onClick={() => setMonth(addMonths(month, 1))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </header>
      <div className="content">
        <div className="card" style={{ padding: '16px 12px', alignItems: 'center', gap: 12 }}>
          <div className="garden" role="img" aria-label={`Jardin de ${monthLabel(month)}`}>
            <span className="blob" style={{ left: 50, top: -20, width: 230, height: 80, background: '#F2DCCB', opacity: 0.55, filter: 'blur(20px)' }} />
            <span className="blob" style={{ left: -30, top: 70, width: 390, height: 260, borderRadius: '50% 50% 0 0', background: '#DCE5CF', opacity: 0.75, filter: 'blur(10px)' }} />
            <span className="blob" style={{ left: 30, top: 140, width: 270, height: 190, background: '#CBD9BA', opacity: 0.5, filter: 'blur(14px)' }} />
            {tufts.map((t, i) => (
              <svg key={i} width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" style={{ position: 'absolute', left: t.left, top: t.top, opacity: 0.8 }}>
                <path d="M2 12 Q3 5 1 1 M8 12 Q8 4 8 0 M14 12 Q13 5 15 2" stroke="#8FA886" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
            ))}
            {plants.map(({ h, n, f }) => (
              <Plant key={f.id} color={h.color} petals={n} x={f.x} y={f.y} rot={f.rot} />
            ))}
          </div>
          <div className="row tiny" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {habits.map((h) => (
              <span key={h.id} className="row" style={{ gap: 6 }}>
                <span style={{ display: 'block', width: 10, height: 10, borderRadius: '50% 0 50% 0', background: h.color }} />
                {h.flower}
              </span>
            ))}
          </div>
        </div>

        <div className="row tiny" style={{ flexWrap: 'wrap', gap: 12, padding: '0 4px' }}>
          <Legend style={{ background: '#C4687A' }}>arrosée</Legend>
          <Legend style={{ background: '#D6CBBA' }}>manquée</Legend>
          <Legend style={{ border: '1.5px dashed #9E3F52' }}>repos</Legend>
          <span className="row" style={{ gap: 6 }}>
            <span style={{ display: 'block', width: 5, height: 5, borderRadius: '50%', background: '#CFC3B0' }} />
            non prévue
          </span>
        </div>

        {habits.map((h) => {
          const st = statuses[h.id]
          const dn = st.filter((s) => s === 'done').length
          const ms = st.filter((s) => s === 'missed').length
          const p = progress(h, today, today, entries, rests)
          const cells: ({ s: DayStatus; day: string } | null)[] = [...Array(lead).fill(null)]
          st.forEach((s, i) => cells.push({ s, day: addDays(month, i) }))
          while (cells.length % 7) cells.push(null)
          const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
          return (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ gap: 12 }}>
                <div className="between">
                  <div style={{ minWidth: 0 }}>
                    <div className="card-title" style={{ fontSize: 20 }}>
                      {h.name}
                    </div>
                    <div className="small">{h.flower}</div>
                  </div>
                  <div className="row" style={{ gap: 14, flexShrink: 0 }}>
                    <div className="stat">
                      <b>{p.streak}</b>
                      <span>série</span>
                    </div>
                    <div className="stat">
                      <b>{p.record}</b>
                      <span>record</span>
                    </div>
                    <div className="stat">
                      <b>{dn + ms ? Math.round((dn / (dn + ms)) * 100) : 0}%</b>
                      <span>ce mois</span>
                    </div>
                  </div>
                </div>
                <div className="petal-grid">
                  <div className="petal-col">
                    {WD.map((w, i) => (
                      <span key={i} className="petal-cell" style={{ width: 14, justifyContent: 'flex-start' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                  {weeks.map((wk, wi) => (
                    <div key={wi} className="petal-col">
                      {wk.map((c, ci) => (
                        <span key={ci} className="petal-cell" title={c ? cellTitle(h, c.day, c.s, entries) : undefined}>
                          {c && <span style={petalStyle(c.s, h)} />}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {h.kind === 'sport' && (
                <div className="card">
                  <div className="card-title" style={{ fontSize: 20 }}>
                    Zones travaillées ce mois
                  </div>
                  {ZONES.map((z) => (
                    <div key={z.id} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 28px', gap: 10, alignItems: 'center', fontSize: 14 }}>
                      <span>{z.label}</span>
                      <div className="bar">
                        <div style={{ width: `${Math.round((zoneTotals[z.id] / zmax) * 100)}%`, background: h.color, opacity: 0.8 }} />
                      </div>
                      <span className="small" style={{ textAlign: 'right' }}>
                        {zoneTotals[z.id]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function Legend({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ display: 'block', width: 12, height: 12, boxSizing: 'border-box', borderRadius: '50% 0 50% 0', ...style }} />
      {children}
    </span>
  )
}

function petalStyle(s: DayStatus, h: Habit): React.CSSProperties {
  const base: React.CSSProperties = { display: 'block', width: 18, height: 18, borderRadius: '50% 0 50% 0', boxSizing: 'border-box' }
  if (s === 'done') return { ...base, background: h.color, opacity: 0.9 }
  if (s === 'missed') return { ...base, background: '#D6CBBA' }
  if (s === 'rest') return { ...base, border: `1.5px dashed ${h.deep}` }
  if (s === 'off' || s === 'before') return { display: 'block', width: 5, height: 5, borderRadius: '50%', background: '#CFC3B0' }
  return { ...base, border: '1px solid #E4DACB' }
}

function cellTitle(h: Habit, day: string, s: DayStatus, entries: Store['entries']): string {
  let t = shortDate(day)
  const time = entries[h.id]?.[day]?.time
  if (h.kind === 'bedtime' && time && (s === 'done' || s === 'missed')) t += ` · couchée à ${time.replace(':', 'h')}`
  return t
}

function Plant({ color, petals, x, y, rot }: { color: string; petals: number; x: number; y: number; rot: number }) {
  const sc = 0.78 + 0.3 * ((y - GARDEN.minY) / (GARDEN.maxY - GARDEN.minY))
  const stemH = 30 * sc
  const side = rot % 2 ? 1 : -1
  return (
    <>
      <span style={{ position: 'absolute', left: x - 0.75, top: y, width: 1.5, height: stemH, background: '#7E9A78', opacity: 0.75 }} />
      <span
        style={{
          position: 'absolute',
          left: side > 0 ? x : x - 8 * sc,
          top: y + stemH * 0.45,
          width: 8 * sc,
          height: 13 * sc,
          borderRadius: '50% 0 50% 0',
          background: '#8FA886',
          opacity: 0.65,
          transform: `rotate(${side * 40}deg)`,
        }}
      />
      <span style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, transform: `scale(${sc})` }}>
        {Array.from({ length: petals }, (_, k) => (
          <span
            key={k}
            style={{
              position: 'absolute',
              left: 15.5,
              top: 3,
              width: 13,
              height: 19,
              borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
              transformOrigin: '6.5px 19px',
              transform: `rotate(${k * 72 + rot}deg)`,
              background: color,
              opacity: 0.78,
            }}
          />
        ))}
        {petals === 5 ? (
          <span style={{ position: 'absolute', left: 16, top: 16, width: 12, height: 12, borderRadius: '50%', background: '#C9962E' }} />
        ) : petals > 0 ? (
          <span style={{ position: 'absolute', left: 18.5, top: 18.5, width: 7, height: 7, borderRadius: '50%', background: '#B8862F', opacity: 0.65 }} />
        ) : (
          <span style={{ position: 'absolute', left: 17, top: 12, width: 10, height: 17, borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%', background: color, opacity: 0.45 }} />
        )}
      </span>
    </>
  )
}
