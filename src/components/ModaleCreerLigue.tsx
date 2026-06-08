import React, { useRef, useState } from 'react'
import type { LiguePrive } from '../lib/supabase'
import { createLigue } from '../lib/supabase-classement'

interface Props {
  userId: string
  onClose: () => void
  onCreated: (ligue: LiguePrive, membres: import('../lib/supabase-classement').MembreScore[]) => void
}

function genDemoCode(): string {
  const pool = 'BCDFGHJKLMNPRSTUVWXZ'
  const dig  = '23456789'
  const r = (n: number, s: string) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('')
  return `${r(3, pool)}-${r(2, dig)}${r(1, pool)}`
}

function shareLink(code: string): string {
  return `${window.location.origin}${window.location.pathname}?ligue=${code}`
}

export default function ModaleCreerLigue({ userId, onClose, onCreated }: Props) {
  const nomRef = useRef<HTMLInputElement>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [created, setCreated]   = useState<LiguePrive | null>(null)
  const [copied, setCopied]     = useState<'code' | 'link' | null>(null)

  async function handleCreate() {
    const nom = nomRef.current?.value.trim() ?? ''
    if (!nom) { setError('Donne un nom à ta ligue.'); return }
    setCreating(true); setError(null)
    const { ligue, error: err } = await createLigue(nom, userId)
    setCreating(false)
    if (err || !ligue) {
      const mock: LiguePrive = {
        id: 'local-' + Date.now(),
        nom,
        code_invitation: genDemoCode(),
        createur_id: userId,
        date_creation_utc: new Date().toISOString(),
      }
      setCreated(mock)
      onCreated(mock, [{ utilisateurId: userId, pseudo: 'Capitaine', nmTotal: 0 }])
      return
    }
    setCreated(ligue)
    onCreated(ligue, [{ utilisateurId: userId, pseudo: 'Capitaine', nmTotal: 0 }])
  }

  function handleCopy(type: 'code' | 'link') {
    if (!created) return
    const text = type === 'code' ? created.code_invitation : shareLink(created.code_invitation)
    void navigator.clipboard.writeText(text).catch(() => null)
    setCopied(type)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <>
      <div className="md-overlay" onClick={onClose} />
      <div className="md-modal" role="dialog" aria-modal="true">

        <div className="md-title">{created ? 'Ligue créée !' : 'Créer une ligue'}</div>
        <div className="md-sub">
          {created ? created.nom : 'Donne un nom à ta course privée'}
        </div>

        {!created && (
          <>
            {error && <p className="cl-error" style={{ marginBottom: 8 }}>{error}</p>}
            <div className="md-field">
              <label className="md-field-label">Nom de la ligue</label>
              <input
                ref={nomRef}
                className="md-field-input"
                type="text"
                placeholder="Ex : Les Pirates du Ballon"
                maxLength={40}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && void handleCreate()}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? '…' : 'Créer la ligue'}
            </button>
            <div className="md-rule"><span className="md-rule-txt">ou</span></div>
            <button type="button" className="md-btn-ghost" onClick={onClose}>
              Annuler
            </button>
          </>
        )}

        {created && (
          <>
            <div className="cl-share" style={{ marginBottom: 20 }}>
              <div className="cl-share-row">
                <span className="cl-share-lbl">Code</span>
                <span className="cl-share-val">{created.code_invitation}</span>
                <button type="button" className="cl-share-btn" onClick={() => handleCopy('code')}>
                  {copied === 'code' ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
              <div className="cl-share-row">
                <span className="cl-share-lbl">Lien</span>
                <span className="cl-share-link">{shareLink(created.code_invitation)}</span>
                <button type="button" className="cl-share-btn" onClick={() => handleCopy('link')}>
                  {copied === 'link' ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={onClose}>
              Voir le classement
            </button>
          </>
        )}

      </div>
    </>
  )
}
