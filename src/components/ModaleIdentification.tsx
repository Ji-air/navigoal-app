import React, { useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

type View = 'signup' | 'signin'

export default function ModaleIdentification() {
  const signUp          = useAuthStore(s => s.signUp)
  const signIn          = useAuthStore(s => s.signIn)
  const signInPrototype = useAuthStore(s => s.signInPrototype)
  const authStep        = useAuthStore(s => s.authStep)

  const [view,    setView]    = useState<View>('signup')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const pseudoRef = useRef<HTMLInputElement>(null)
  const emailRef  = useRef<HTMLInputElement>(null)

  function switchView(v: View) {
    setView(v)
    setError(null)
  }

  // ── Créer un compte ────────────────────────────────────────────────────────

  async function handleSignUp() {
    const pseudo = pseudoRef.current?.value.trim() ?? ''
    const email  = emailRef.current?.value.trim()  ?? ''

    if (!pseudo) { setError('Entre un pseudo de capitaine.'); return }

    // Email absent → mode prototype (session locale, sans email)
    if (!email) {
      signInPrototype(pseudo)
      return
    }

    setLoading(true); setError(null)
    const { error: err } = await signUp(pseudo, email)
    setLoading(false)
    if (err) setError(err)
  }

  // ── J'ai déjà un compte ────────────────────────────────────────────────────

  async function handleSignIn() {
    const email = emailRef.current?.value.trim() ?? ''
    if (!email) { setError('Entre ton adresse email.'); return }
    setLoading(true); setError(null)
    const { error: err } = await signIn(email)
    setLoading(false)
    if (err) setError(err)
  }

  // ── Lien magique envoyé ────────────────────────────────────────────────────

  if (authStep === 'email_sent') {
    return (
      <>
        <div className="md-overlay" />
        <div className="md-modal" role="dialog" aria-modal="true">
          <div className="md-title">Lien envoyé !</div>
          <div className="md-sub" style={{ marginBottom: 16 }}>
            Vérifie ta boîte mail et clique sur le lien pour rejoindre la course.
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 9,
            color: 'rgba(240,244,248,.22)', textAlign: 'center',
            letterSpacing: '.04em', lineHeight: 1.6,
          }}>
            Pas reçu ? Vérifie tes spams.<br/>
            <span
              style={{ cursor: 'pointer', color: 'rgba(0,229,204,.4)' }}
              onClick={() => {
                const pseudo = pseudoRef.current?.value.trim() ?? 'Capitaine'
                signInPrototype(pseudo || 'Capitaine')
              }}
            >
              → Continuer sans email (mode prototype)
            </span>
          </p>
        </div>
      </>
    )
  }

  // ── Vue inscription ────────────────────────────────────────────────────────

  if (view === 'signup') {
    return (
      <>
        <div className="md-overlay" />
        <div className="md-modal" role="dialog" aria-modal="true">
          <div className="md-title">Rejoindre la course</div>
          <div className="md-sub">Crée ton compte pour composer ton équipage</div>

          {error && <p className="cl-error" style={{ marginBottom: 10 }}>{error}</p>}

          <div className="md-field">
            <label className="md-field-label">Pseudo</label>
            <input
              ref={pseudoRef}
              className="md-field-input"
              type="text"
              placeholder="Ton pseudo de capitaine"
              maxLength={20}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && emailRef.current?.focus()}
            />
          </div>

          <div className="md-field">
            <label className="md-field-label">Email</label>
            <input
              ref={emailRef}
              className="md-field-input"
              type="email"
              placeholder="ton@email.com"
              onKeyDown={e => e.key === 'Enter' && void handleSignUp()}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 20 }}
            onClick={() => void handleSignUp()}
          >
            {loading ? '…' : 'Créer un compte'}
          </button>

          <div className="md-rule"><span className="md-rule-txt">ou</span></div>

          <button
            type="button"
            className="md-btn-ghost"
            onClick={() => switchView('signin')}
          >
            J'ai déjà un compte
          </button>

          <p style={{
            marginTop: 14, textAlign: 'center',
            fontFamily: 'var(--font-body)', fontSize: 9,
            color: 'rgba(240,244,248,.20)', cursor: 'pointer',
            letterSpacing: '.04em',
          }}
            onClick={() => {
              const pseudo = pseudoRef.current?.value.trim()
              if (!pseudo) { setError('Entre un pseudo pour continuer.'); return }
              signInPrototype(pseudo)
            }}
          >
            → Jouer sans email (mode prototype)
          </p>
        </div>
      </>
    )
  }

  // ── Vue connexion ──────────────────────────────────────────────────────────

  return (
    <>
      <div className="md-overlay" />
      <div className="md-modal" role="dialog" aria-modal="true">
        <div className="md-title">Reprendre la course</div>
        <div className="md-sub">Saisis ton email pour recevoir ton lien de connexion</div>

        {error && <p className="cl-error" style={{ marginBottom: 10 }}>{error}</p>}

        <div className="md-field">
          <label className="md-field-label">Email</label>
          <input
            ref={emailRef}
            className="md-field-input"
            type="email"
            placeholder="ton@email.com"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && void handleSignIn()}
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: 20 }}
          onClick={() => void handleSignIn()}
        >
          {loading ? '…' : 'Envoyer le lien'}
        </button>

        <div className="md-rule"><span className="md-rule-txt">ou</span></div>

        <button
          type="button"
          className="md-btn-ghost"
          onClick={() => switchView('signup')}
        >
          ← Créer un compte
        </button>
      </div>
    </>
  )
}
