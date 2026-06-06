import React, { useState } from 'react'
import { useAuth } from '../store/auth'

export default function AuthPage() {
  const { connexionRapide } = useAuth()
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [lienEnvoye, setLienEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  function handleEnvoyerLien() {
    if (!pseudo.trim()) { setErreur('Le pseudo est obligatoire.'); return }
    if (!email.trim())  { setErreur("L'email est obligatoire.");  return }
    setErreur('')
    setLienEnvoye(true)
  }

  function handleConnexionRapide() {
    if (!pseudo.trim()) { setErreur('Le pseudo est obligatoire.'); return }
    setErreur('')
    connexionRapide(pseudo)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">⛵</div>
        <h1 className="auth-card__title">Navigoal</h1>
        <p className="auth-card__subtitle">Rejoins la course</p>

        <div className="auth-form">
          <div className="auth-form__field">
            <label className="auth-form__label">Pseudo</label>
            <input
              className="auth-form__input"
              type="text"
              placeholder="Ton pseudo"
              value={pseudo}
              onChange={e => { setPseudo(e.target.value); setErreur('') }}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label">Email</label>
            <input
              className="auth-form__input"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErreur('') }}
            />
          </div>

          {erreur && <p className="auth-form__erreur">{erreur}</p>}

          {lienEnvoye ? (
            <div className="auth-form__confirmation">
              Lien envoyé à {email}
            </div>
          ) : (
            <button
              type="button"
              className="auth-form__btn-primary"
              onClick={handleEnvoyerLien}
            >
              Recevoir le lien
            </button>
          )}

          <div className="auth-separateur">ou</div>

          <button
            type="button"
            className="auth-form__btn-secondary"
            onClick={handleConnexionRapide}
          >
            Connexion rapide (prototype)
          </button>
        </div>
      </div>
    </div>
  )
}
