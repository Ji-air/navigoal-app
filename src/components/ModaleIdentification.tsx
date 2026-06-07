import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

type Mode = 'creer' | 'connecter' | 'lien_envoye'

export default function ModaleIdentification() {
  const { signUp, signIn, signInPrototype, loading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<Mode>('creer')
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState('')
  const [showProto, setShowProto] = useState(false)
  const [pseudoProto, setPseudoProto] = useState('')

  function switchMode(next: Mode) {
    clearError()
    setMode(next)
  }

  async function handleCreer() {
    if (!pseudo.trim() || !email.trim()) return
    const ok = await signUp(pseudo.trim(), email.trim())
    if (ok) { setEmailSent(email.trim()); setMode('lien_envoye') }
  }

  async function handleConnecter() {
    if (!email.trim()) return
    const ok = await signIn(email.trim())
    if (ok) { setEmailSent(email.trim()); setMode('lien_envoye') }
  }

  function handleProto() {
    if (!pseudoProto.trim()) return
    signInPrototype(pseudoProto.trim())
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal">

        {/* ===== CRÉER UN COMPTE ===== */}
        {mode === 'creer' && (
          <>
            <div className="auth-modal-title">Rejoindre la course</div>
            <div className="auth-modal-sub">
              Crée ton compte pour composer ton équipage
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Pseudo</label>
              <input
                className="auth-field-input"
                type="text"
                placeholder="Ton pseudo de capitaine"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                maxLength={24}
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label className="auth-field-label">Email</label>
              <input
                className="auth-field-input"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleCreer()}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-btn"
              onClick={() => void handleCreer()}
              disabled={loading || !pseudo.trim() || !email.trim()}
            >
              {loading ? '…' : 'Créer un compte'}
            </button>

            <div className="auth-rule">
              <span className="auth-rule-txt">ou</span>
            </div>

            <button className="auth-btn-ghost" onClick={() => switchMode('connecter')}>
              J'ai déjà un compte
            </button>

            {!showProto ? (
              <button className="auth-proto-link" onClick={() => setShowProto(true)}>
                Mode prototype
              </button>
            ) : (
              <div style={{ marginTop: 12 }}>
                <input
                  className="auth-field-input"
                  type="text"
                  placeholder="Pseudo (sans email)"
                  value={pseudoProto}
                  onChange={e => setPseudoProto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleProto()}
                  style={{ marginBottom: 8 }}
                />
                <button
                  className="auth-btn-ghost"
                  onClick={handleProto}
                  disabled={!pseudoProto.trim()}
                >
                  Démarrer sans email
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== BON RETOUR ===== */}
        {mode === 'connecter' && (
          <>
            <div className="auth-modal-title">Bon retour</div>
            <div className="auth-modal-sub">
              Entre ton email pour recevoir ton lien de connexion
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Email</label>
              <input
                className="auth-field-input"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleConnecter()}
                autoFocus
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-btn"
              onClick={() => void handleConnecter()}
              disabled={loading || !email.trim()}
            >
              {loading ? '…' : 'Envoyer le lien'}
            </button>

            <div className="auth-rule">
              <span className="auth-rule-txt">ou</span>
            </div>

            <button className="auth-btn-ghost" onClick={() => switchMode('creer')}>
              Créer un compte
            </button>
          </>
        )}

        {/* ===== LIEN ENVOYÉ ===== */}
        {mode === 'lien_envoye' && (
          <>
            <div className="auth-modal-title">Lien envoyé</div>
            <div className="auth-modal-sub">Vérifie ta boîte mail</div>

            <div className="auth-sent-banner">
              On t'a envoyé un lien magique à{' '}
              <strong>{emailSent}</strong>.<br />
              Clique dessus pour accéder à ton équipage.
            </div>

            <button
              className="auth-btn-ghost"
              style={{ marginTop: 20 }}
              onClick={() => switchMode(pseudo ? 'creer' : 'connecter')}
            >
              Retour
            </button>
          </>
        )}

      </div>
    </div>
  )
}
