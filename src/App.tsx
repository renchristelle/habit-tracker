import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { useData } from './lib/useData'
import { Today } from './screens/Today'
import { Garden } from './screens/Garden'
import { Season } from './screens/Season'

type Tab = 'today' | 'garden' | 'season'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <div className="app">
      <div className="wash rose" />
      <div className="wash gold" />
      {!configured ? (
        <div className="center">
          <h1>Éclosion</h1>
          <p className="small">Configuration Supabase manquante (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).</p>
        </div>
      ) : session === undefined ? (
        <div className="center small">Chargement…</div>
      ) : session === null ? (
        <Login />
      ) : (
        <Main userId={session.user.id} />
      )}
    </div>
  )
}

function Main({ userId }: { userId: string }) {
  const store = useData(userId)
  const [tab, setTab] = useState<Tab>('today')
  const [dismissed, setDismissed] = useState<string | null>(null)

  if (store.loading) return <div className="center small">Le jardin se réveille…</div>
  if (store.error && store.habits.length === 0)
    return (
      <div className="center">
        <p className="small">Impossible de charger les données : {store.error}</p>
        <button className="secondary" style={{ padding: '0 20px' }} onClick={() => location.reload()}>
          Réessayer
        </button>
      </div>
    )

  return (
    <>
      {tab === 'today' && <Today store={store} />}
      {tab === 'garden' && <Garden store={store} />}
      {tab === 'season' && <Season store={store} />}
      {store.error && store.error !== dismissed && (
        <div className="toast" role="alert" onClick={() => setDismissed(store.error)}>
          {store.error}
        </div>
      )}
      <nav className="tabbar" aria-label="Navigation">
        {(
          [
            ['today', 'Aujourd’hui'],
            ['garden', 'Jardin'],
            ['season', 'Saison'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </nav>
    </>
  )
}

function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Compte créé. Confirme ton e-mail puis reviens te connecter.')
  }

  return (
    <form className="center" onSubmit={submit} style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
      <h1>Éclosion</h1>
      <p className="small" style={{ marginTop: 0 }}>
        {mode === 'in' ? 'Connecte-toi pour retrouver ton jardin.' : 'Crée ton compte.'}
      </p>
      <input className="field" style={{ width: '100%' }} type="email" autoComplete="email" placeholder="E-mail" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input
        className="field"
        style={{ width: '100%' }}
        type="password"
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        placeholder="Mot de passe"
        aria-label="Mot de passe"
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="primary" style={{ width: '100%' }} disabled={busy}>
        {mode === 'in' ? 'Se connecter' : 'Créer mon compte'}
      </button>
      {msg && <p className="small" role="alert">{msg}</p>}
      <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'Première fois ? Créer un compte' : 'J’ai déjà un compte'}
      </button>
    </form>
  )
}
