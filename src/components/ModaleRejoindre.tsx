import React, { useEffect, useState } from 'react'
import { fetchLigueParCode, joinLigue, type LiguePreview } from '../lib/supabase-classement'
import { useEquipageStore } from '../stores/equipageStore'

interface Props {
  code: string
  userId: string
  onClose: () => void
  onJoined: () => void
}

export default function ModaleRejoindre({ code, userId, onClose, onJoined }: Props) {
  const journee       = useEquipageStore(s => s.journee)
  const journeeNumero = journee?.numero ?? '—'

  const [preview,  setPreview]  = useState<LiguePreview | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [joining,  setJoining]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const p = await fetchLigueParCode(code)
      setPreview(p)
      setLoading(false)
    })()
  }, [code])

  async function handleJoin() {
    if (!preview) return
    setJoining(true); setError(null)
    const { ligue, error: err } = await joinLigue(code, userId)
    setJoining(false)
    if (err || !ligue) { setError(err ?? 'Erreur inconnue'); return }
    onJoined()
  }

  return (
    <>
      <div className="md-overlay" onClick={onClose} />
      <div className="md-modal" role="dialog" aria-modal="true">

        {loading && (
          <p className="cl-hint" style={{ marginBottom: 0 }}>Chargement…</p>
        )}

        {!loading && !preview && (
          <>
            <div className="md-title">Ligue introuvable</div>
            <div className="md-sub">Ce lien d'invitation n'est plus valide.</div>
            <button type="button" className="md-btn-ghost" style={{ marginTop: 20 }} onClick={onClose}>
              Fermer
            </button>
          </>
        )}

        {!loading && preview && (
          <>
            <div className="md-title">{preview.ligue.nom}</div>
            <div className="md-sub">Tu as été invité à rejoindre cette course</div>

            <div className="md-stats">
              <div className="md-stat">
                <div className="md-stat-val">{preview.nbMembres}</div>
                <div className="md-stat-lbl">Capitaines</div>
              </div>
              <div className="md-stat md-stat--neutral">
                <div className="md-stat-val">J{journeeNumero}</div>
                <div className="md-stat-lbl">Journée en cours</div>
              </div>
            </div>

            {preview.pseudosMembres.length > 0 && (
              <p className="md-members">
                {preview.pseudosMembres.join(' · ')}
              </p>
            )}

            {error && <p className="cl-error" style={{ margin: '0 0 8px' }}>{error}</p>}

            <button
              type="button"
              className="btn-primary"
              disabled={joining}
              onClick={() => void handleJoin()}
            >
              {joining ? '…' : 'Rejoindre la course'}
            </button>
            <div className="md-rule"><span className="md-rule-txt">ou</span></div>
            <button type="button" className="md-btn-ghost" onClick={onClose}>
              Annuler
            </button>
          </>
        )}

      </div>
    </>
  )
}
