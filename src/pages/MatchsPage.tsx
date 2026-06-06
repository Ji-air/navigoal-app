import React, { useEffect, useMemo } from 'react'
import { useEquipageStore } from '../stores/equipageStore'
import { useMatchsStore }   from '../stores/matchsStore'
import { JOURNEE_COURANTE } from '../data/journee'
import type { MatchJour }   from '../types'
import type { MatchEtat, ImpulsionAffichage } from '../stores/matchsStore'
import MatchCard, { POSTE_COURT } from '../components/MatchCard'
import type { PosteNavigoal } from '../components/MatchCard'

// Mapping PosteKey (equipageStore) → PosteNavigoal (matchsStore)
const POSTE_KEY_TO_NAV: Record<string, PosteNavigoal> = {
  cap:    'Captain',
  barre:  'Second',
  ancre:  'Watch',
  vigie:  'Keeper',
}

// ---------------------------------------------------------------------------
// Ordre de tri des statuts
// ---------------------------------------------------------------------------

const ORDRE_STATUT: Record<string, number> = { en_cours: 0, planifié: 1, terminé: 2 }

// ---------------------------------------------------------------------------
// Label journée
// ---------------------------------------------------------------------------

function statutJournee(etats: Record<string, MatchEtat>): { label: string; live: boolean } {
  const vals = Object.values(etats)
  if (vals.some(e => e.statut === 'en_cours'))  return { label: 'En cours',  live: true  }
  if (vals.every(e => e.statut === 'terminé'))  return { label: 'Terminée',  live: false }
  return { label: 'À venir', live: false }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatchsPage() {
  const { postes } = useEquipageStore()
  const { matchs, etats, startPolling, stopPolling } = useMatchsStore()

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  // crewLabels : nationId → label de poste (ex. "Cap") pour MatchCard
  const crewLabels = useMemo<Record<string, string>>(() => {
    const labels: Record<string, string> = {}
    for (const [key, rempli] of Object.entries(postes)) {
      if (!rempli) continue
      const posteNav = POSTE_KEY_TO_NAV[key]
      if (posteNav) {
        const label = POSTE_COURT[posteNav]
        // Si la même nation est déjà présente (autre poste), concaténer
        labels[rempli.nationId] = labels[rempli.nationId]
          ? `${labels[rempli.nationId]} / ${label}`
          : label
      }
    }
    return labels
  }, [postes])

  // crewNationIds pour filtrer les impulsions
  const crewNationIds = useMemo<Set<string>>(
    () => new Set(Object.values(crewLabels)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(crewLabels)],
  )

  // Impulsions filtrées aux nations du crew
  function filtrerImpulsions(
    impulsions: ImpulsionAffichage[],
    nationIds: Set<string>,
  ): ImpulsionAffichage[] {
    if (nationIds.size === 0) return []
    return impulsions.filter(i => crewLabels[i.nationId] !== undefined)
  }

  // Matchs triés
  const matchsAffiches = useMemo(() => {
    return [...matchs]
      .sort((a, b) => {
        const sa = ORDRE_STATUT[etats[a.id]?.statut ?? 'planifié'] ?? 3
        const sb = ORDRE_STATUT[etats[b.id]?.statut ?? 'planifié'] ?? 3
        if (sa !== sb) return sa - sb
        return a.heureKickoffUtc.getTime() - b.heureKickoffUtc.getTime()
      })
      .map((match: MatchJour) => {
        const etat = etats[match.id] ?? {
          matchId: match.id,
          statut: 'planifié' as const,
          scoreNationA: 0, scoreNationB: 0,
          vainqueurTirsAuBut: null,
          impulsions: [],
        }
        return {
          match,
          etat,
          impulsions: filtrerImpulsions(etat.impulsions, crewNationIds),
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchs, etats, crewLabels])

  const totalNm = matchsAffiches
    .flatMap(m => m.impulsions)
    .reduce((s, i) => s + i.nm, 0)

  const journee = statutJournee(etats)

  return (
    <div className="matchs-page-v2">
      <div className="mc-pg-label">
        {journee.live && <span className="mc-dot" />}
        {`Journée ${JOURNEE_COURANTE.numero} · ${journee.label}`}
      </div>
      <div className="mc-pg-h1">Matchs</div>

      <div className="mc-list">
        {matchsAffiches.map(({ match, etat, impulsions }) => (
          <MatchCard
            key={match.id}
            match={match}
            etat={etat}
            impulsions={impulsions}
            crewLabels={crewLabels}
          />
        ))}
      </div>

      <div className="mc-total">
        {journee.live ? (
          <>
            <div className="mc-total-row mc-total-row--live">
              <span className="mc-total-lbl">En cours</span>
              <span className="mc-total-val">+{totalNm}NM</span>
            </div>
            <div className="mc-total-row mc-total-row--sum">
              <span className="mc-total-lbl">Total J{JOURNEE_COURANTE.numero}</span>
              <span className="mc-total-val">{totalNm}NM</span>
            </div>
          </>
        ) : (
          <>
            <div className="mc-total-row">
              <span className="mc-total-lbl">Impulsions</span>
              <span className="mc-total-val">+{totalNm}NM</span>
            </div>
            <div className="mc-total-row mc-total-row--sum">
              <span className="mc-total-lbl">Total J{JOURNEE_COURANTE.numero}</span>
              <span className="mc-total-val">{totalNm}NM</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
