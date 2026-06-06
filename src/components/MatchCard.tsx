import React from 'react'
import { nationById } from '../data/journee'
import type { MatchJour, PosteNavigoal } from '../types'
import type { MatchEtat, ImpulsionAffichage, TypeImpulsion } from '../stores/matchsStore'

// ---------------------------------------------------------------------------
// Constantes de présentation
// ---------------------------------------------------------------------------

const DRAPEAUX: Record<string, string> = {
  france:     '🇫🇷',
  allemagne:  '🇩🇪',
  espagne:    '🇪🇸',
  bresil:     '🇧🇷',
  argentine:  '🇦🇷',
  angleterre: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
}

const POSTE_COURT: Record<PosteNavigoal, string> = {
  Captain:   'Cap',
  Second:    'Second',
  Navigator: 'Nav',
  Watch:     'Vigie',
  Keeper:    'Keep',
}

function typeEmoji(type: TypeImpulsion): string {
  switch (type) {
    case 'but':          return '⚽'
    case 'assist':       return '🎯'
    case 'pre_assist':   return '🎯'
    case 'arret':        return '🧤'
    case 'clean_sheet':  return '🛡️'
    case 'collectif':    return '🏆'
  }
}

function formatKickoff(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

// crewLabels : nationId → label de poste (ex. "Cap") — vide = nation hors équipage
export interface MatchCardProps {
  match:       MatchJour
  etat:        MatchEtat
  impulsions:  ImpulsionAffichage[]  // pré-filtrées aux nations de l'équipage
  crewLabels:  Record<string, string>
}

// ---------------------------------------------------------------------------
// Sous-composant : ligne d'un événement
// ---------------------------------------------------------------------------

function LigneImpulsion({ imp }: { imp: ImpulsionAffichage }) {
  const palierKey = imp.palier.toLowerCase() as 'breeze' | 'wind' | 'boost'
  return (
    <div className="mc-evt">
      <span className="mc-evt-ico">{typeEmoji(imp.type)}</span>
      <span className="mc-evt-name">
        {imp.joueurNom ?? (imp.poste === 'collectif' ? 'Victoire' : imp.poste)}
      </span>
      <span className={`mc-nm-pill mc-nm-pill--${palierKey}`}>
        +{imp.nm}NM
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function MatchCard({ match, etat, impulsions, crewLabels }: MatchCardProps) {
  const nationA = nationById(match.nationAId)
  const nationB = nationById(match.nationBId)

  const labelA = crewLabels[match.nationAId] ?? ''
  const labelB = crewLabels[match.nationBId] ?? ''
  const crewDansMatch = labelA !== '' || labelB !== ''

  const { statut, scoreNationA, scoreNationB } = etat
  const scoreLabel = statut === 'planifié'
    ? formatKickoff(match.heureKickoffUtc)
    : `${scoreNationA}–${scoreNationB}`

  return (
    <div className="mc">
      {/* En-tête : score + nations */}
      <div className="mc-head">

        {/* Colonne score / heure */}
        <div className="mc-sc">
          {statut === 'planifié' ? (
            <span className="mc-sc-n mc-sc-n--pend">{scoreLabel.toUpperCase()}</span>
          ) : (
            <>
              <span className={`mc-sc-n${statut === 'en_cours' ? ' mc-sc-n--live' : ''}`}>
                {scoreLabel}
              </span>
              {statut === 'en_cours' && (
                <div className="mc-live">
                  <span className="mc-dot" />
                  LIVE
                </div>
              )}
            </>
          )}
        </div>

        {/* Colonne nations */}
        <div className="mc-nats">
          <NationRow
            nationId={match.nationAId}
            nom={nationA?.nom ?? match.nationAId}
            roleLabel={labelA}
          />
          <NationRow
            nationId={match.nationBId}
            nom={nationB?.nom ?? match.nationBId}
            roleLabel={labelB}
          />
        </div>
      </div>

      {/* Section impulsions */}
      {crewDansMatch && statut !== 'planifié' && (
        <div className="mc-evts">
          {impulsions.length === 0 ? (
            <div className="mc-evt-empty">
              {statut === 'en_cours' ? 'En attente d\'événements…' : 'Aucune impulsion'}
            </div>
          ) : (
            impulsions.map(imp => <LigneImpulsion key={imp.id} imp={imp} />)
          )}
        </div>
      )}

      {/* Match planifié avec crew : message heure */}
      {crewDansMatch && statut === 'planifié' && (
        <div className="mc-evts">
          <div className="mc-evt-empty">
            Coup d&apos;envoi {formatKickoff(match.heureKickoffUtc)}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : ligne nation
// ---------------------------------------------------------------------------

function NationRow({
  nationId, nom, roleLabel,
}: {
  nationId:  string
  nom:       string
  roleLabel: string
}) {
  const inCrew = roleLabel !== ''
  const flag   = DRAPEAUX[nationId] ?? '🏳️'

  return (
    <div className={`mc-nat-row${inCrew ? ' mc-nat-row--on' : ''}`}>
      <span className="mc-nat-flag">{flag}</span>
      <span className="mc-nat-name">{nom}</span>
      {inCrew && <span className="mc-nat-role">{roleLabel}</span>}
    </div>
  )
}

// Ré-export pour que MatchsPage n'ait pas à connaître le fichier types.ts
export type { PosteNavigoal }
export { POSTE_COURT }
