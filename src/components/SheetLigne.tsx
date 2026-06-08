import React, { useEffect, useState } from 'react'
import { fetchJoueursLigne } from '../lib/supabase'
import type { PosteReel } from '../lib/supabase'
import type { PosteKey, NationDispo } from '../stores/equipageStore'
import { flag } from './SheetNation'

interface SheetLigneProps {
  poste:     PosteKey
  nation:    NationDispo
  onConfirm: () => void
  onBack:    () => void
}

const POSTE_HEADER: Record<PosteKey, string> = {
  cap:   'Cap · Attaquants',
  barre: 'Barre · Milieux',
  ancre: 'Ancre · Défenseurs',
  vigie: 'Vigie · Gardiens',
}

const POSTE_REEL_LABEL: Record<PosteReel, string> = {
  FWD: 'ATT', MID: 'MIL', DEF: 'DEF', GK: 'GK',
}

type JoueurRow = { id: string; nom: string; poste_reel: PosteReel }

export default function SheetLigne({ poste, nation, onConfirm, onBack }: SheetLigneProps) {
  const [joueurs, setJoueurs] = useState<JoueurRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchJoueursLigne(nation.id, poste).then(data => {
      setJoueurs(data as JoueurRow[])
      setLoading(false)
    })
  }, [nation.id, poste])

  return (
    <>
      <div className="sh-overlay" onClick={onBack} aria-hidden="true" />
      <div className="sh" role="dialog" aria-modal="true" aria-label={nation.nom}>
        <div className="sh-handle" aria-hidden="true" />
        <div className="sh-hd">
          <button type="button" className="sh-back" onClick={onBack}>
            ← Retour
          </button>
          <div className="sh-tag">{POSTE_HEADER[poste]}</div>
          <div className="sh-title">
            <span aria-hidden="true">{flag(nation.nom)}&nbsp;</span>
            {nation.nom}
          </div>
        </div>

        <div className="sh-body">
          {loading && <p className="eq-hint">Chargement…</p>}

          {!loading && joueurs.length === 0 && (
            <p className="eq-hint">Aucun joueur enregistré pour cette nation.</p>
          )}

          {!loading && joueurs.length > 0 && (
            <>
              <p className="lu-intro">Effectif · lecture seule</p>
              <ul className="lu-list">
                {joueurs.map(j => (
                  <li key={j.id} className="lu-item">
                    <span className="lu-player">{j.nom}</span>
                    <span className="lu-pos">{POSTE_REEL_LABEL[j.poste_reel]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="lu-confirm">
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            Confirmer · {nation.nom}
          </button>
        </div>
      </div>
    </>
  )
}
