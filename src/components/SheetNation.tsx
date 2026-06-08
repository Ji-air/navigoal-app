import React from 'react'
import type { Equipage, PalierType } from '../lib/supabase'
import type { PosteKey, NationDispo } from '../stores/equipageStore'

interface SheetNationProps {
  poste:              PosteKey
  equipage:           Equipage | null
  nationsDisponibles: NationDispo[]
  onSelect:           (nation: NationDispo) => void
  onClose:            () => void
}

const POSTE_LABEL: Record<PosteKey, string> = {
  cap:   'Cap · Attaquants',
  barre: 'Barre · Milieux',
  ancre: 'Ancre · Défenseurs',
  vigie: 'Vigie · Gardiens',
}

const PALIER_NM: Record<PalierType, string> = {
  Breeze: '12nm',
  Wind:   '28nm',
  Boost:  '50nm',
}

/* Drapeaux emoji pour les nations CM2026 les plus probables.
   Fallback : 3 premières lettres majuscules (divergence vs mockup). */
const FLAG_MAP: Record<string, string> = {
  'France':          '🇫🇷',
  'Espagne':         '🇪🇸',
  'Allemagne':       '🇩🇪',
  'Angleterre':      '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Portugal':        '🇵🇹',
  'Italie':          '🇮🇹',
  'Brésil':          '🇧🇷',
  'Argentine':       '🇦🇷',
  'Uruguay':         '🇺🇾',
  'Colombie':        '🇨🇴',
  'Mexique':         '🇲🇽',
  'États-Unis':      '🇺🇸',
  'USA':             '🇺🇸',
  'Canada':          '🇨🇦',
  'Maroc':           '🇲🇦',
  'Sénégal':         '🇸🇳',
  'Nigeria':         '🇳🇬',
  "Côte d'Ivoire":   '🇨🇮',
  'Australie':       '🇦🇺',
  'Japon':           '🇯🇵',
  'Corée du Sud':    '🇰🇷',
  'Arabie Saoudite': '🇸🇦',
  'Pays-Bas':        '🇳🇱',
  'Belgique':        '🇧🇪',
  'Croatie':         '🇭🇷',
  'Serbie':          '🇷🇸',
  'Danemark':        '🇩🇰',
  'Suisse':          '🇨🇭',
  'Autriche':        '🇦🇹',
  'Turquie':         '🇹🇷',
  'Pologne':         '🇵🇱',
  'Équateur':        '🇪🇨',
  'Chili':           '🇨🇱',
  'Pérou':           '🇵🇪',
  'Venezuela':       '🇻🇪',
  'Panama':          '🇵🇦',
  'Costa Rica':      '🇨🇷',
  'Jamaïque':        '🇯🇲',
  'Ghana':           '🇬🇭',
  'Cameroun':        '🇨🇲',
  'Égypte':          '🇪🇬',
  'Algérie':         '🇩🇿',
  'Tunisie':         '🇹🇳',
  'Afrique du Sud':  '🇿🇦',
  'Mali':            '🇲🇱',
  'Chine':           '🇨🇳',
  'Iran':            '🇮🇷',
  'Irak':            '🇮🇶',
  'Qatar':           '🇶🇦',
  'Suède':           '🇸🇪',
}

export function flag(nom: string): string {
  return FLAG_MAP[nom] ?? nom.slice(0, 3).toUpperCase()
}

function getPosteNationId(eq: Equipage | null, p: PosteKey): string | null {
  if (!eq) return null
  switch (p) {
    case 'cap':   return eq.cap_nation_id
    case 'barre': return eq.barre_nation_id
    case 'ancre': return eq.ancre_nation_id
    case 'vigie': return eq.vigie_nation_id
  }
}

type NationState = 'off-r6' | 'off-r5' | 'normal'

export default function SheetNation({
  poste, equipage, nationsDisponibles, onSelect, onClose,
}: SheetNationProps) {

  /* Nations retenues dans les AUTRES postes (pas celui en cours d'édition) */
  const otherNationIds: string[] = []
  const posteKeys: PosteKey[] = ['cap', 'barre', 'ancre', 'vigie']
  for (const p of posteKeys) {
    if (p === poste) continue
    const id = getPosteNationId(equipage, p)
    if (id) otherNationIds.push(id)
  }

  /* R6 — adversaires des nations des autres postes */
  const r6Blocked = new Set<string>()
  const r6Reason  = new Map<string, string>()   // nationId → nom de la nation qui bloque
  for (const id of otherNationIds) {
    const n = nationsDisponibles.find(n => n.id === id)
    if (n) {
      r6Blocked.add(n.adversaire_id)
      r6Reason.set(n.adversaire_id, n.nom)
    }
  }

  /* R5 — nations déjà affectées à 2 autres postes */
  const countMap = new Map<string, number>()
  for (const id of otherNationIds) {
    countMap.set(id, (countMap.get(id) ?? 0) + 1)
  }
  const r5Blocked = new Set<string>(
    [...countMap.entries()].filter(([, c]) => c >= 2).map(([id]) => id),
  )

  function nationState(id: string): NationState {
    if (r6Blocked.has(id)) return 'off-r6'
    if (r5Blocked.has(id)) return 'off-r5'
    return 'normal'
  }

  /* Grouper les nations par match (paires, dédupliquées) */
  const seenMatches = new Set<string>()
  const matchPairs: [NationDispo, NationDispo][] = []
  for (const nation of nationsDisponibles) {
    if (seenMatches.has(nation.match_id)) continue
    seenMatches.add(nation.match_id)
    const adversaire = nationsDisponibles.find(n => n.id === nation.adversaire_id)
    if (adversaire) matchPairs.push([nation, adversaire])
  }

  return (
    <>
      <div className="sh-overlay" onClick={onClose} aria-hidden="true" />
      <div className="sh" role="dialog" aria-modal="true" aria-label="Choisir une nation">
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
            const stateA = nationState(a.id)
            const stateB = nationState(b.id)
            return (
              <div key={a.match_id} className="nat-card">
                <div className="nat-grid">
                  <NatBtn
                    nation={a}
                    state={stateA}
                    reason={
                      stateA === 'off-r6' ? `Adv. ${r6Reason.get(a.id) ?? ''}` :
                      stateA === 'off-r5' ? '2 postes' : ''
                    }
                    onSelect={onSelect}
                  />
                  <div className="nat-sep" aria-hidden="true" />
                  <NatBtn
                    nation={b}
                    state={stateB}
                    reason={
                      stateB === 'off-r6' ? `Adv. ${r6Reason.get(b.id) ?? ''}` :
                      stateB === 'off-r5' ? '2 postes' : ''
                    }
                    onSelect={onSelect}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* ── Bouton nation individuel ── */

interface NatBtnProps {
  nation:   NationDispo
  state:    NationState
  reason:   string
  onSelect: (n: NationDispo) => void
}

function NatBtn({ nation, state, reason, onSelect }: NatBtnProps) {
  const isOff = state !== 'normal'
  return (
    <button
      type="button"
      className={`nat-btn${isOff ? ' nat-btn--off' : ''}`}
      disabled={isOff}
      onClick={() => onSelect(nation)}
      aria-disabled={isOff}
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
