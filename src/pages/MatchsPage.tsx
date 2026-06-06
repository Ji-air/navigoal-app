import React from "react"
import { useEquipage } from "../store/equipage"
import { useScoreJournee } from "../hooks/useScoreJournee"
import { nationById, MATCHS_JOUR } from "../data/mock"
import type { MatchImpulsions, PosteDetail } from "../hooks/useScoreJournee"

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

const POSTE_LABELS: Record<string, string> = {
  Captain: "Captain", Second: "Second", Navigator: "Navigator",
  Watch: "Watch", Keeper: "Keeper",
}

function formatScore(m: MatchImpulsions): string {
  if (m.statut !== "terminé") return "–"
  const base = `${m.scoreNationA}–${m.scoreNationB}`
  return m.vainqueurTirsAuBut ? `${base} (TAB)` : base
}

function nomNation(id: string | null): string {
  if (!id) return "—"
  return nationById(id)?.nom ?? id
}

// ---------------------------------------------------------------------------
// Sous-composant : ligne d'un poste dans la carte match
// ---------------------------------------------------------------------------

function PosteLigne({ detail }: { detail: PosteDetail }) {
  return (
    <div className={`match-poste${detail.declenchee ? " match-poste--on" : " match-poste--off"}`}>
      <span className="match-poste__label">{POSTE_LABELS[detail.poste]}</span>
      <span className="match-poste__b1">
        {detail.joueurB1Nom ?? "—"}
      </span>
      <span className={`match-poste__nm${detail.declenchee ? " match-poste__nm--on" : ""}`}>
        {detail.declenchee ? `+${detail.nm}nm` : "0nm"}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : carte d'un match
// ---------------------------------------------------------------------------

function MatchCard({ m, matchIdx }: { m: MatchImpulsions; matchIdx: number }) {
  const match = MATCHS_JOUR[matchIdx]
  const nationA = nationById(match.nationAId)
  const nationB = nationById(match.nationBId)
  const aucunPoste = m.postesDeclenches.length === 0

  return (
    <div className="match-card-result">
      {/* En-tête match */}
      <div className="match-card-result__header">
        <span className="match-card-result__nation">{nationA?.nom ?? match.nationAId}</span>
        <span className="match-card-result__score">{formatScore(m)}</span>
        <span className="match-card-result__nation match-card-result__nation--right">
          {nationB?.nom ?? match.nationBId}
        </span>
      </div>

      {/* Corps : postes */}
      {m.statut === "terminé" ? (
        <div className="match-card-result__body">
          {aucunPoste ? (
            <p className="match-card-result__empty">Aucune nation de ton équipage dans ce match</p>
          ) : (
            m.postesDeclenches.map(d => <PosteLigne key={d.poste} detail={d} />)
          )}

          {/* R4 collectif */}
          {m.collectifNm > 0 && (
            <div className="match-collectif">
              <span className="match-collectif__label">
                Victoire {nomNation(m.nationVictorieuse)} (R4)
              </span>
              <span className="match-collectif__nm">+{m.collectifNm}nm</span>
            </div>
          )}
        </div>
      ) : (
        <p className="match-card-result__empty">
          {m.statut === "en_cours" ? "Match en cours…" : "Match à venir"}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Matchs
// ---------------------------------------------------------------------------

export default function MatchsPage() {
  const { state } = useEquipage()
  const result = useScoreJournee(state.crew)

  const crewVide = Object.values(state.crew).every(v => v === null)

  return (
    <div className="matchs-page">
      <div className="matchs-page__header">
        <h1 className="matchs-page__title">Journée 1 — Résultats</h1>
        {crewVide && (
          <p className="matchs-page__hint">
            Compose ton équipage pour voir tes impulsions
          </p>
        )}
      </div>

      <div className="match-list">
        {result.parMatch.map((m, i) => (
          <MatchCard key={m.matchId} m={m} matchIdx={i} />
        ))}
      </div>

      {/* Pied de page : R5 + total */}
      <div className="score-footer">
        {result.bonusDiversite > 0 && (
          <div className="score-footer__row score-footer__row--bonus">
            <span>Bonus diversité (R5)</span>
            <span>+{result.bonusDiversite}nm</span>
          </div>
        )}
        <div className="score-footer__row score-footer__row--total">
          <span>Total journée</span>
          <span>{result.totalNm}nm</span>
        </div>
      </div>
    </div>
  )
}
