import React, { useEffect } from 'react'
import { useMatchsStore } from '../stores/matchsStore'
import { useEquipageStore } from '../stores/equipageStore'
import MatchCard from '../components/MatchCard'
import TabBar from '../components/TabBar'
import type { AppPage } from '../App'

interface MatchsPageProps {
  onNavigate: (page: AppPage) => void
}

const STATUT_ORDER: Record<string, number> = {
  en_cours: 0, planifié: 1, terminé: 2, interrompu: 3,
}

export default function MatchsPage({ onNavigate }: MatchsPageProps) {
  const { journee, equipage, loading: equipageLoading, error: equipageError } = useEquipageStore()
  const { matchs, impulsions, loading, error, init, startPolling, stopPolling } = useMatchsStore()

  useEffect(() => {
    if (journee?.id) void init(journee.id)
  }, [journee?.id])

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [])

  const equipagePostes = {
    cap:   equipage?.cap_nation_id   ?? null,
    barre: equipage?.barre_nation_id ?? null,
    ancre: equipage?.ancre_nation_id ?? null,
    vigie: equipage?.vigie_nation_id ?? null,
  }

  const sorted = [...matchs].sort((a, b) => {
    const da = STATUT_ORDER[a.statut] ?? 9
    const db = STATUT_ORDER[b.statut] ?? 9
    if (da !== db) return da - db
    return new Date(a.heure_coup_envoi_utc).getTime() - new Date(b.heure_coup_envoi_utc).getTime()
  })

  const isLive    = matchs.some(m => m.statut === 'en_cours')
  const allFt     = matchs.length > 0 && matchs.every(m => m.statut === 'terminé' || m.statut === 'interrompu')
  const statLabel = isLive ? '· En cours' : allFt ? '· Terminée' : ''

  // Totaux
  const totalPoste   = impulsions.filter(i => i.type === 'poste').reduce((s, i) => s + i.valeur_nm, 0)
  const totalCollect = impulsions.filter(i => i.type === 'collectif').reduce((s, i) => s + i.valeur_nm, 0)
  const grandTotal   = totalPoste + totalCollect
  const anyTotal     = grandTotal > 0 || matchs.length > 0

  return (
    <div className="ms-screen">

      <div className="ms-scr">
        <div className="ms-pg-label">
          {isLive && <span className="ms-pg-dot" aria-hidden="true" />}
          {journee ? `Journée ${journee.numero}` : '—'} {statLabel}
        </div>
        <div className="ms-pg-h1">Matchs</div>

        {(loading || equipageLoading) && <p className="eq-hint">Chargement…</p>}
        {(error || equipageError) && <p className="eq-error">{error ?? equipageError}</p>}

        {!loading && !equipageLoading && !journee && !equipageError && (
          <p className="eq-hint">Aucune journée en cours.</p>
        )}

        {!loading && !equipageLoading && journee && matchs.length === 0 && (
          <p className="eq-hint">Aucun match ce jour.</p>
        )}

        {!loading && sorted.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            impulsions={impulsions.filter(i => i.match_id === match.id)}
            equipagePostes={equipagePostes}
          />
        ))}

        {/* Récapitulatif total */}
        {!loading && anyTotal && (
          <div className="ms-total">
            {(totalPoste > 0 || isLive) && (
              <div className="ms-total-row">
                <span className="ms-total-lbl">{isLive ? 'En cours' : 'Impulsions'}</span>
                <span className="ms-total-val">+{totalPoste}NM</span>
              </div>
            )}
            {totalCollect > 0 && (
              <div className="ms-total-row ms-total-row--bonus">
                <span className="ms-total-lbl">Bonus</span>
                <span className="ms-total-val">+{totalCollect}NM</span>
              </div>
            )}
            <div className="ms-total-row ms-total-row--sum">
              <span className="ms-total-lbl">Total J{journee?.numero ?? '—'}</span>
              <span className="ms-total-val">{grandTotal}NM</span>
            </div>
          </div>
        )}
      </div>

      <TabBar active="matchs" onNavigate={onNavigate} />
    </div>
  )
}
