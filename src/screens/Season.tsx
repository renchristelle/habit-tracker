import { useState } from 'react'
import { shortDate, todayISO } from '../lib/dates'
import { progress, ROOT_RATE, ROOT_WINDOW } from '../lib/domain'
import type { Store } from '../lib/useData'
import { supabase } from '../lib/supabase'

const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Season({ store }: { store: Store }) {
  const { habits, entries, rests, today, updateHabit, addRest, deleteRest } = store
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [start, setStart] = useState(todayISO())
  const [end, setEnd] = useState(todayISO())
  const [only, setOnly] = useState<string[]>([])

  const upcoming = rests.filter((r) => r.end_day >= today)

  async function saveRest() {
    if (!label.trim() || end < start) return
    await addRest({ label: label.trim(), start_day: start, end_day: end, habit_ids: only.length ? only : null })
    setAdding(false)
    setLabel('')
    setOnly([])
  }

  function exportData() {
    const rows = [['date', 'habitude', 'donnees']]
    for (const h of habits) for (const [day, d] of Object.entries(entries[h.id] ?? {})) rows.push([day, h.name, JSON.stringify(d)])
    rows.sort((a, b) => a[0].localeCompare(b[0]))
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `eclosion-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header className="header">
        <div>
          <div className="eyebrow">Enracinement &amp; repos</div>
          <h1>Saison</h1>
        </div>
      </header>
      <div className="content">
        <div className="card" style={{ gap: 14 }}>
          <div>
            <div className="card-title" style={{ fontSize: 22 }}>
              Cycle de {ROOT_WINDOW} jours
            </div>
            <div className="small" style={{ color: 'var(--muted-2)', lineHeight: 1.45 }}>
              Une habitude tenue au moins {ROOT_RATE * 100} % du temps sur {ROOT_WINDOW} jours devient enracinée.
            </div>
          </div>
          {habits.map((h) => {
            const p = progress(h, today, today, entries, rests)
            const rate = Math.round(p.rate66 * 100)
            const day = Math.min(p.age, ROOT_WINDOW)
            return (
              <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="between">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{h.name}</span>
                  <span
                    className="tiny"
                    style={{
                      fontWeight: 600,
                      padding: '2px 10px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      borderRadius: 10,
                      background: p.rooted ? h.deep : '#EFE6D8',
                      color: p.rooted ? '#fff' : 'var(--muted-2)',
                    }}
                  >
                    {p.rooted ? 'Enracinée' : 'En croissance'}
                  </span>
                </div>
                <div className="bar">
                  <div style={{ width: `${Math.round((day / ROOT_WINDOW) * 100)}%`, background: h.color, opacity: 0.85 }} />
                </div>
                <div className="between tiny">
                  <span>{p.age >= ROOT_WINDOW ? `${ROOT_WINDOW} / ${ROOT_WINDOW} jours` : `jour ${day} / ${ROOT_WINDOW}`}</span>
                  <span style={{ fontWeight: 600, color: rate >= ROOT_RATE * 100 ? '#3F6B55' : '#8A5A12' }}>
                    {rate} % (objectif {ROOT_RATE * 100} %)
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-title" style={{ fontSize: 22 }}>
            Qui je deviens
          </div>
          {habits.map((h) => (
            <div key={h.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span style={{ display: 'block', flexShrink: 0, marginTop: 12, width: 10, height: 10, borderRadius: '50% 0 50% 0', background: h.color }} />
              <textarea
                className="field"
                rows={1}
                aria-label={`Identité — ${h.name}`}
                defaultValue={h.identity ?? ''}
                onBlur={(e) => e.target.value !== (h.identity ?? '') && updateHabit(h.id, { identity: e.target.value })}
                style={{ flex: 1, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, border: 'none', background: 'transparent', padding: '4px 0' }}
              />
            </div>
          ))}
        </div>

        <div className="card" style={{ gap: 12 }}>
          <div className="card-title" style={{ fontSize: 22 }}>
            Repos planifiés
          </div>
          {upcoming.length === 0 && !adding && <div className="small">Aucun repos prévu.</div>}
          {upcoming.map((r) => (
            <div key={r.id} className="between" style={{ padding: 12, borderRadius: 14, background: 'var(--soft)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.label}</div>
                <div className="small">
                  {shortDate(r.start_day)} → {shortDate(r.end_day)} ·{' '}
                  {r.habit_ids ? habits.filter((h) => r.habit_ids!.includes(h.id)).map((h) => h.flower).join(', ') : 'toutes les habitudes'}
                </div>
              </div>
              <button className="link" onClick={() => deleteRest(r.id)} aria-label={`Supprimer ${r.label}`}>
                Supprimer
              </button>
            </div>
          ))}
          {adding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="field" placeholder="Ex. week-end à Lyon" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Nom du repos" />
              <div className="grid2">
                <label className="small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Du
                  <input className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Au
                  <input className="field" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
                </label>
              </div>
              <div className="small">Habitudes concernées (aucune sélection = toutes)</div>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {habits.map((h) => {
                  const on = only.includes(h.id)
                  return (
                    <button
                      key={h.id}
                      className="chip"
                      aria-pressed={on}
                      style={on ? { background: h.deep, color: '#fff', border: 'none' } : undefined}
                      onClick={() => setOnly(on ? only.filter((x) => x !== h.id) : [...only, h.id])}
                    >
                      {h.flower}
                    </button>
                  )
                })}
              </div>
              <div className="grid2">
                <button className="secondary" onClick={() => setAdding(false)}>
                  Annuler
                </button>
                <button className="primary" onClick={saveRest} disabled={!label.trim() || end < start}>
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <button className="primary" onClick={() => setAdding(true)}>
              Planifier un repos
            </button>
          )}
        </div>

        <div className="card" style={{ gap: 14 }}>
          <div className="card-title" style={{ fontSize: 22 }}>
            Jours d’application
          </div>
          {habits.map((h) => (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{h.name}</span>
              <div className="dayrow">
                {WD.map((w, i) => {
                  const on = !!h.days[i]
                  return (
                    <button
                      key={i}
                      aria-pressed={on}
                      aria-label={`${h.name} — ${['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][i]}`}
                      style={on ? { background: h.deep, color: '#fff' } : { background: '#EFE6D8', color: 'var(--muted)' }}
                      onClick={() => updateHabit(h.id, { days: h.days.map((v, j) => (j === i ? (v ? 0 : 1) : v)) })}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <button className="secondary" onClick={exportData}>
            Exporter mes données (CSV)
          </button>
          <button className="link" style={{ alignSelf: 'center' }} onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  )
}
