import { useState } from 'react'
import { Flower } from '../components/Flower'
import { addDays, longDate, weekdayIndex } from '../lib/dates'
import { cardView, EntryData, Habit, sportTotal, ZONES } from '../lib/domain'
import type { Store } from '../lib/useData'

export function Today({ store }: { store: Store }) {
  const { habits, entries, rests, today, setEntry } = store
  const [offset, setOffset] = useState(0) // 0 = aujourd'hui, 1 = hier
  const day = addDays(today, -offset)

  const cards = habits
    .filter((h) => h.days[weekdayIndex(day)] && day >= h.started_on)
    .map((h) => ({ h, v: cardView(h, day, today, entries, rests), d: entries[h.id]?.[day] }))
  const active = cards.filter((c) => !c.v.rooted)
  const rooted = cards.filter((c) => c.v.rooted)
  const counted = cards.filter((c) => c.v.status !== 'rest')
  const done = counted.filter((c) => c.v.status === 'done').length

  return (
    <>
      <header className="header">
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow">{longDate(day)}</div>
            <h1>Éclosion</h1>
          </div>
          <div className="progress">
            {done} / {counted.length} arrosées
          </div>
        </div>
        <div className="row" role="group" aria-label="Jour à renseigner">
          {[1, 0].map((o) => (
            <button key={o} className={'pill' + (offset === o ? ' on' : '')} aria-pressed={offset === o} onClick={() => setOffset(o)}>
              {o === 0 ? 'Aujourd’hui' : 'Hier'}
            </button>
          ))}
        </div>
      </header>
      <div className="content">
        {offset === 0 && counted.length > 0 && done === counted.length && (
          <div className="banner">
            <svg width="40" height="40" viewBox="0 0 60 60" aria-hidden="true">
              <ellipse cx="22" cy="22" rx="9" ry="9" fill="#C4687A" opacity="0.6" />
              <ellipse cx="38" cy="20" rx="8" ry="8" fill="#7C7BB5" opacity="0.6" />
              <ellipse cx="30" cy="32" rx="9" ry="9" fill="#D9A441" opacity="0.6" />
              <ellipse cx="42" cy="34" rx="7" ry="7" fill="#6A93C0" opacity="0.6" />
              <path d="M30 40 L30 58 M24 40 L28 58 M38 40 L32 58" stroke="#6F8A6A" strokeWidth="1.5" />
            </svg>
            <div>
              <div className="card-title" style={{ fontSize: 20, color: 'var(--accent-dark)' }}>
                Bouquet complet
              </div>
              <div className="small" style={{ color: '#5A2230' }}>
                Toutes tes fleurs sont arrosées aujourd’hui.
              </div>
            </div>
          </div>
        )}
        {cards.length === 0 && <p className="small">Rien de prévu ce jour-là. Profite !</p>}
        {active.map(({ h, v, d }) => (
          <HabitCard key={h.id} h={h} v={v} d={d} onChange={(p) => setEntry(h.id, day, p)} />
        ))}
        {rooted.length > 0 && (
          <div className="section-label">
            <span className="eyebrow">En entretien</span>
            <span className="tiny">habitudes enracinées</span>
          </div>
        )}
        {rooted.map(({ h, v, d }) => (
          <HabitCard key={h.id} h={h} v={v} d={d} onChange={(p) => setEntry(h.id, day, p)} />
        ))}
      </div>
    </>
  )
}

function HabitCard({
  h,
  v,
  d,
  onChange,
}: {
  h: Habit
  v: ReturnType<typeof cardView>
  d: EntryData | undefined
  onChange: (p: Partial<EntryData>) => void
}) {
  const isRest = v.status === 'rest'
  const labelColor = v.state === 'watered' ? h.deep : v.state === 'wilted' ? '#7A2E3F' : v.state === 'dry' ? '#8A5A12' : 'var(--muted)'
  const total = sportTotal(d)
  const choice = (on: boolean) => ({ className: 'choice' + (on ? ' on' : ''), style: on ? { background: h.deep } : undefined })

  return (
    <div className={'card' + (isRest ? ' rest' : '')} style={v.state === 'watered' ? { borderColor: h.color } : undefined}>
      <div className="row" style={{ gap: 12 }}>
        <div className="flower-bg">
          <Flower state={v.state} bloom={v.bloom} color={h.color} label={`${h.flower} — ${v.label.toLowerCase()}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">{h.name}</div>
          <div className="small" style={{ marginTop: 3 }}>
            <span style={{ fontWeight: 600, color: labelColor }}>{v.label}</span> · {v.streak} j de série
          </div>
        </div>
      </div>

      {v.alert && <div className={'alert ' + v.alert.kind}>{v.alert.text}</div>}

      {!isRest && h.kind === 'sport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ZONES.map((z) => {
            const n = d?.[z.id] ?? 0
            return (
              <div key={z.id} className="between">
                <span style={{ fontSize: 15, fontWeight: n ? 600 : 400, color: n ? h.deep : undefined }}>{z.label}</span>
                <div className="stepper">
                  <button aria-label={`Retirer une vidéo ${z.label}`} onClick={() => onChange({ [z.id]: Math.max(0, n - 1) })}>
                    −
                  </button>
                  <span className="n">{n}</span>
                  <button className="plus" aria-label={`Ajouter une vidéo ${z.label}`} onClick={() => onChange({ [z.id]: n + 1, no: false })}>
                    +
                  </button>
                </div>
              </div>
            )
          })}
          <div className="between small" style={{ paddingTop: 4 }}>
            <span>{total === 0 ? 'Aucune vidéo pour l’instant' : `Total : ${total} vidéo${total > 1 ? 's' : ''}`}</span>
            {total === 0 && (
              <button className={'chip' + (d?.no ? ' on' : '')} onClick={() => onChange({ no: !d?.no })}>
                {d?.no ? 'Annuler' : 'Pas de sport aujourd’hui'}
              </button>
            )}
          </div>
        </div>
      )}

      {!isRest && h.kind === 'boolean' && (
        <div className="grid2">
          <button {...choice(d?.value === true)} aria-pressed={d?.value === true} onClick={() => onChange({ value: d?.value === true ? null : true })}>
            {h.yes_label ?? 'Fait'}
          </button>
          <button {...choice(d?.value === false)} aria-pressed={d?.value === false} onClick={() => onChange({ value: d?.value === false ? null : false })}>
            {h.no_label ?? 'Pas fait'}
          </button>
        </div>
      )}

      {!isRest && h.kind === 'bedtime' && (
        <div className="between">
          <label htmlFor={'bed-' + h.id} style={{ fontSize: 14 }}>
            Heure du coucher
          </label>
          <input id={'bed-' + h.id} className="field" type="time" value={d?.time ?? ''} onChange={(e) => onChange({ time: e.target.value || undefined })} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="link" onClick={() => onChange({ rest: !d?.rest })}>
          {d?.rest ? 'Annuler le repos' : 'Jour de repos'}
        </button>
      </div>
    </div>
  )
}
