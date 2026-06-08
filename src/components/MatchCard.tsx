import React from 'react'
import type { PalierType, ImpulsionPoste } from '../lib/supabase'
import type { MatchAffiche, ImpulsionAffichee } from '../stores/matchsStore'
import { flag } from './SheetNation'

// ─── Types ───────────────────────────────────────────────────────────────────

export type EquipagePostes = {
  cap:   string | null
  barre: string | null
  ancre: string | null
  vigie: string | null
}

interface MatchCardProps {
  match:          MatchAffiche
  impulsions:     ImpulsionAffichee[]
  equipagePostes: EquipagePostes
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POSTE_KEYS = ['cap', 'barre', 'ancre', 'vigie'] as const
const POSTE_ROLE: Record<typeof POSTE_KEYS[number], ImpulsionPoste> = {
  cap: 'Cap', barre: 'Barre', ancre: 'Ancre', vigie: 'Vigie',
}

function getNationRole(id: string, postes: EquipagePostes): ImpulsionPoste | null {
  for (const k of POSTE_KEYS) {
    if (postes[k] === id) return POSTE_ROLE[k]
  }
  return null
}

function formatHeure(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}H${String(d.getUTCMinutes()).padStart(2, '0')}`
}

// ─── NM Badge ─────────────────────────────────────────────────────────────────

function NmBadge({ palier, valeur_nm }: { palier: PalierType; valeur_nm: number }) {
  return (
    <span className={`m-badge m-badge--${palier.toLowerCase()}`}>
      {palier === 'Breeze' && (
        <svg width="11" height="6" viewBox="0 0 11 6" fill="none" aria-hidden="true">
          <path d="M1,4C3,1 5,1 7.5,4C9,6.5 10,5.5 10,3.5"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {palier === 'Wind' && (
        <svg width="13" height="8" viewBox="0 0 13 8" fill="none" aria-hidden="true">
          <path d="M1,2C3.5,0 6,0 8,2C10,4 12,4 12,2"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M1,6C3.5,4 6,4 8,6C10,8 12,8 12,6"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {palier === 'Boost' && (
        <svg width="7" height="10" viewBox="0 0 7 10" fill="currentColor" aria-hidden="true">
          <polygon points="4,0 0,6 2.5,6 2.5,10 7,4 4.5,4"/>
        </svg>
      )}
      <span className="m-badge-nm">+{valeur_nm}NM</span>
    </span>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MatchCard({ match, impulsions, equipagePostes }: MatchCardProps) {
  const { statut, score_nation_a, score_nation_b, heure_coup_envoi_utc, nation_a, nation_b, nation_a_id, nation_b_id } = match

  const roleA = getNationRole(nation_a_id, equipagePostes)
  const roleB = getNationRole(nation_b_id, equipagePostes)
  const hasEquipageNation = roleA !== null || roleB !== null

  const isLive = statut === 'en_cours'
  const isFt   = statut === 'terminé'
  const isNs   = statut === 'planifié'

  // Séparer impulsions de poste et collective (R4)
  const posteImpulsions     = impulsions.filter(i => i.type === 'poste')
  const collectifImpulsion  = impulsions.find(i => i.type === 'collectif')

  // Total nm de ce match
  const matchTotal = impulsions.reduce((s, i) => s + i.valeur_nm, 0)

  return (
    <div className="m-card">

      {/* En-tête : score + nations */}
      <div className="m-hd">

        {/* Colonne score */}
        <div className="m-sc">
          {isNs && (
            <span className="m-sc-n m-sc-n--ns">{formatHeure(heure_coup_envoi_utc)}</span>
          )}
          {(isLive || isFt) && (
            <span className={`m-sc-n${isFt ? ' m-sc-n--ft' : ''}`}>
              {score_nation_a ?? 0}–{score_nation_b ?? 0}
            </span>
          )}
          {isLive && (
            <div className="m-sc-live">
              <span className="m-live-dot" aria-hidden="true" />
              live
            </div>
          )}
        </div>

        {/* Colonne nations */}
        <div className="m-nat">
          <div className={`m-nat-row${roleA ? ' m-nat-row--on' : ''}`}>
            <span className="m-nat-flag" aria-hidden="true">{flag(nation_a.nom)}</span>
            <span className="m-nat-name">{nation_a.nom}</span>
            {roleA && <span className="m-nat-role">{roleA}</span>}
          </div>
          <div className={`m-nat-row${roleB ? ' m-nat-row--on' : ''}`}>
            <span className="m-nat-flag" aria-hidden="true">{flag(nation_b.nom)}</span>
            <span className="m-nat-name">{nation_b.nom}</span>
            {roleB && <span className="m-nat-role">{roleB}</span>}
          </div>
        </div>

      </div>

      {/* Section événements — uniquement si l'équipage a une nation dans ce match */}
      {hasEquipageNation && (
        <div className="m-evts">

          {isNs && (
            <div className="m-evt-empty">
              Coup d'envoi {formatHeure(heure_coup_envoi_utc)}
            </div>
          )}

          {!isNs && posteImpulsions.length === 0 && (
            <div className="m-evt-empty">En attente d'événements…</div>
          )}

          {posteImpulsions.map(imp => (
            <div key={imp.id} className="m-evt">
              {imp.evenement_emoji && (
                <span aria-hidden="true" style={{ fontSize: 11 }}>{imp.evenement_emoji}</span>
              )}
              <span className="m-evt-name">{imp.joueur_nom ?? '—'}</span>
              <NmBadge palier={imp.palier} valeur_nm={imp.valeur_nm} />
            </div>
          ))}

          {/* Bonus collectif R4 */}
          {collectifImpulsion && (
            <div className="m-bonus">
              <span className="m-bonus-lbl">
                Victoire {collectifImpulsion.nation_id === nation_a_id ? nation_a.nom : nation_b.nom}
              </span>
              <span className="m-bonus-val">+{collectifImpulsion.valeur_nm}NM</span>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
