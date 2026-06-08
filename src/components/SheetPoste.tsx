import React, { useState } from 'react'
import { fetchJoueursLigne } from '../lib/supabase'
import type { Equipage, PosteReel } from '../lib/supabase'
import type { PosteKey, NationDispo } from '../stores/equipageStore'
import { flag } from './SheetNation'
import { getMockJoueursLigne } from '../data/journee'

interface SheetPosteProps {
  poste:              PosteKey
  equipage:           Equipage | null
  nationsDisponibles: NationDispo[]
  onConfirm:          (nation: NationDispo) => void
  onClose:            () => void
}

const POSTE_LABEL: Record<PosteKey, string> = {
  cap:   'Cap · Attaquants',
  barre: 'Barre · Milieux',
  ancre: 'Ancre · Défenseurs',
  vigie: 'Vigie · Gardiens',
}

const PALIER_NM: Record<string, string> = {
  Breeze: '12nm', Wind: '28nm', Boost: '50nm',
}

const POSTE_REEL_LABEL: Record<PosteReel, string> = {
  FWD: 'ATT', MID: 'MIL', DEF: 'DEF', GK: 'GK',
}

type NationState = 'off-r6' | 'off-r5' | 'normal'
type JoueurRow   = { id: string; nom: string; poste_reel: PosteReel }

function getPosteNationId(eq: Equipage | null, p: PosteKey): string | null {
  if (!eq) return null
  switch (p) {
    case 'cap':   return eq.cap_nation_id
    case 'barre': return eq.barre_nation_id
    case 'ancre': return eq.ancre_nation_id
    case 'vigie': return eq.vigie_nation_id
  }
}

export default function SheetPoste({
  poste, equipage, nationsDisponibles, onConfirm, onClose,
}: SheetPosteProps) {
  const [selectedNation, setSelectedNation] = useState<NationDispo | null>(null)
  const [joueurs,        setJoueurs]        = useState<JoueurRow[]>([])
  const [loadingJoueurs, setLoadingJoueurs] = useState(false)

  // ── R5 / R6 ──────────────────────────────────────────────────────────────

  const otherNationIds: string[] = []
  for (const p of ['cap', 'barre', 'ancre', 'vigie'] as PosteKey[]) {
    if (p === poste) continue
    const id = getPosteNationId(equipage, p)
    if (id) otherNationIds.push(id)
  }

  const r6Blocked = new Set<string>()
  const r6Reason  = new Map<string, string>()
  for (const id of otherNationIds) {
    const n = nationsDisponibles.find(n => n.id === id)
    if (n) { r6Blocked.add(n.adversaire_id); r6Reason.set(n.adversaire_id, n.nom) }
  }

  const countMap = new Map<string, number>()
  for (const id of otherNationIds) countMap.set(id, (countMap.get(id) ?? 0) + 1)
  const r5Blocked = new Set<string>(
    [...countMap.entries()].filter(([, c]) => c >= 2).map(([id]) => id),
  )

  function nationState(id: string): NationState {
    if (r6Blocked.has(id)) return 'off-r6'
    if (r5Blocked.has(id)) return 'off-r5'
    return 'normal'
  }

  // ── Paires de matchs ──────────────────────────────────────────────────────

  const seenMatches = new Set<string>()
  const matchPairs: [NationDispo, NationDispo][] = []
  for (const nation of nationsDisponibles) {
    if (seenMatches.has(nation.match_id)) continue
    seenMatches.add(nation.match_id)
    const adv = nationsDisponibles.find(n => n.id === nation.adversaire_id)
    if (adv) matchPairs.push([nation, adv])
  }

  // ── Tap sur une nation → déploie la liste sous la carte ──────────────────

  async function handleNationSelect(nation: NationDispo) {
    if (selectedNation?.id === nation.id) {
      setSelectedNation(null)
      setJoueurs([])
      return
    }
    setSelectedNation(nation)
    setLoadingJoueurs(true)
    const data = await fetchJoueursLigne(nation.id, poste)
    const rows = (data as JoueurRow[]).length > 0
      ? (data as JoueurRow[])
      : getMockJoueursLigne(nation.id, poste) as JoueurRow[]
    setJoueurs(rows)
    setLoadingJoueurs(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="sh-overlay" onClick={onClose} aria-hidden="true" />
      <div className="sh" role="dialog" aria-modal="true" aria-label={POSTE_LABEL[poste]}>
        <div className="sh-handle" aria-hidden="true" />

        <div className="sh-hd">
          <div className="sh-tag">{POSTE_LABEL[poste]}</div>
          <div className="sh-title">Choisir une nation</div>
        </div>

        <div className="sh-body">
          {matchPairs.length === 0 && (
            <p className="eq-hint">Aucun match disponible.</p>
          )}

          {matchPairs.map(([a, b]) => {
            const stateA    = nationState(a.id)
            const stateB    = nationState(b.id)
            const expandedA = selectedNation?.id === a.id
            const expandedB = selectedNation?.id === b.id

            return (
              <div key={a.match_id} className="nat-card">
                <div className="nat-grid">
                  <NatBtn
                    nation={a} state={stateA} isSelected={expandedA}
                    reason={
                      stateA === 'off-r6' ? `Adv. ${r6Reason.get(a.id) ?? ''}` :
                      stateA === 'off-r5' ? '2 postes' : ''
                    }
                    onSelect={handleNationSelect}
                  />
                  <div className="nat-sep" aria-hidden="true" />
                  <NatBtn
                    nation={b} state={stateB} isSelected={expandedB}
                    reason={
                      stateB === 'off-r6' ? `Adv. ${r6Reason.get(b.id) ?? ''}` :
                      stateB === 'off-r5' ? '2 postes' : ''
                    }
                    onSelect={handleNationSelect}
                  />
                </div>

                {/* Liste des joueurs déployée directement sous la carte */}
                {(expandedA || expandedB) && (
                  <div className="nat-lineup">
                    {loadingJoueurs ? (
                      <p className="eq-hint" style={{ margin: '6px 0' }}>Chargement…</p>
                    ) : joueurs.length === 0 ? (
                      <p className="eq-hint" style={{ margin: '6px 0' }}>Aucun joueur enregistré.</p>
                    ) : (
                      <ul className="lu-list">
                        {joueurs.map(j => (
                          <li key={j.id} className="lu-item">
                            <span className="lu-player">{j.nom}</span>
                            <span className="lu-pos">{POSTE_REEL_LABEL[j.poste_reel]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bouton de confirmation — visible dès qu'une nation est sélectionnée */}
        {selectedNation && (
          <div className="lu-confirm">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onConfirm(selectedNation)}
              disabled={loadingJoueurs}
            >
              Confirmer · {selectedNation.nom}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Bouton nation individuel ──────────────────────────────────────────────────

interface NatBtnProps {
  nation:     NationDispo
  state:      NationState
  isSelected: boolean
  reason:     string
  onSelect:   (n: NationDispo) => Promise<void>
}

function NatBtn({ nation, state, isSelected, reason, onSelect }: NatBtnProps) {
  const isOff = state !== 'normal'
  return (
    <button
      type="button"
      className={`nat-btn${isOff ? ' nat-btn--off' : ''}${isSelected ? ' nat-btn--selected' : ''}`}
      disabled={isOff}
      onClick={() => void onSelect(nation)}
      aria-disabled={isOff}
      aria-expanded={isSelected}
    >
      <span className="nat-flag" aria-hidden="true">{flag(nation.nom)}</span>
      <span className="nat-name">{nation.nom}</span>
      {isOff
        ? <span className="nat-reason">{reason}</span>
        : <span className="nat-tier">{nation.palier ? PALIER_NM[nation.palier] : '—'}</span>
      }
    </button>
  )
}
