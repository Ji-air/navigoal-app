import { useEffect, useState } from 'react'
import type { PosteKey } from '../stores/equipageStore'
import { fetchJoueursLigne } from '../lib/supabase'
import type { NationInfo } from './SheetNation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POSTE_META: Record<PosteKey, { tag: string; role: string; posLabel: string }> = {
  cap:    { tag: 'Cap',   role: 'Attaquant',  posLabel: 'FWD' },
  barre:  { tag: 'Barre', role: 'Milieu',     posLabel: 'MID' },
  ancre:  { tag: 'Ancre', role: 'Défenseur',  posLabel: 'DEF' },
  vigie:  { tag: 'Vigie', role: 'Gardien',    posLabel: 'GK' },
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JoueurRow {
  id: string
  nom: string
  poste_reel: string
}

interface Props {
  poste: PosteKey
  nation: NationInfo
  onConfirm: () => void
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function SheetLigne({ poste, nation, onConfirm, onBack }: Props) {
  const [joueurs, setJoueurs] = useState<JoueurRow[]>([])
  const [loading, setLoading] = useState(true)
  const { tag, role, posLabel } = POSTE_META[poste]

  useEffect(() => {
    setLoading(true)
    fetchJoueursLigne(nation.id, poste).then(data => {
      setJoueurs(data as JoueurRow[])
      setLoading(false)
    })
  }, [nation.id, poste])

  return (
    <>
      <div className="eq-overlay eq-overlay--ligne" />
      <div className="eq-sheet eq-sheet--ligne" role="dialog" aria-modal="true">
        <div className="eq-sh-handle eq-sh-handle--lg" />

        <div className="eq-sh-hd">
          <div className="eq-sl-hd-row">
            <button type="button" className="eq-sl-back" onClick={onBack} aria-label="Retour">
              ←
            </button>
            <div>
              <span className="eq-sh-tag eq-sh-tag--ligne">
                {tag} · {role}
              </span>
              <h2 className="eq-sh-title eq-sh-title--sm">
                {nation.flag} {nation.nom}
              </h2>
            </div>
          </div>
          <p className="eq-sh-sub">Ligne {posLabel} — lecture seule</p>
        </div>

        <div className="eq-sl-players">
          {loading && <p className="eq-sh-empty">Chargement…</p>}
          {!loading && joueurs.length === 0 && (
            <p className="eq-sh-empty">Aucun joueur disponible</p>
          )}
          {joueurs.map(j => (
            <div key={j.id} className="eq-sl-item">
              <span className="eq-sl-name">{j.nom}</span>
              <span className="eq-sl-pos">{j.poste_reel}</span>
            </div>
          ))}
        </div>

        <div className="eq-sl-btn-zone">
          <button type="button" className="eq-sl-btn" onClick={onConfirm}>
            Confirmer — {nation.flag} {nation.nom}
          </button>
        </div>
      </div>
    </>
  )
}
