import { useEffect, useState } from 'react'
import type { PosteKey } from '../stores/equipageStore'
import { useEquipageStore } from '../stores/equipageStore'
import { fetchMatchsJournee, type PalierType } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Flag mapping — client-side
// ---------------------------------------------------------------------------

const NATION_FLAGS: Record<string, string> = {
  'france': '🇫🇷',
  'allemagne': '🇩🇪',
  'espagne': '🇪🇸',
  'portugal': '🇵🇹',
  'angleterre': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'brésil': '🇧🇷', 'bresil': '🇧🇷',
  'argentine': '🇦🇷',
  'italie': '🇮🇹',
  'pays-bas': '🇳🇱',
  'belgique': '🇧🇪',
  'croatie': '🇭🇷',
  'maroc': '🇲🇦',
  'sénégal': '🇸🇳', 'senegal': '🇸🇳',
  'ghana': '🇬🇭',
  'japon': '🇯🇵',
  'corée du sud': '🇰🇷', 'corée': '🇰🇷',
  'australie': '🇦🇺',
  'usa': '🇺🇸', 'états-unis': '🇺🇸',
  'mexique': '🇲🇽',
  'colombie': '🇨🇴',
  'uruguay': '🇺🇾',
  'équateur': '🇪🇨',
  'canada': '🇨🇦',
  'suisse': '🇨🇭',
  'danemark': '🇩🇰',
  'pologne': '🇵🇱',
  'serbie': '🇷🇸',
  'cameroun': '🇨🇲',
  'tunisie': '🇹🇳',
  'arabie saoudite': '🇸🇦',
  'qatar': '🇶🇦',
  'iran': '🇮🇷',
}

export function getFlag(nom: string): string {
  return NATION_FLAGS[nom.toLowerCase()] ?? '🏳️'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PALIER_NM: Record<PalierType, string> = { Breeze: '8nm', Wind: '22nm', Boost: '55nm' }

const POSTE_LABEL: Record<PosteKey, string> = {
  cap: 'Cap · Attaquants',
  barre: 'Barre · Milieu',
  ancre: 'Ancre · Défense',
  vigie: 'Vigie · Gardiens',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NationInfo {
  id: string
  nom: string
  flag: string
}

interface MatchAvecNations {
  id: string
  nation_a_id: string
  nation_b_id: string
  nation_a: { id: string; nom: string } | null
  nation_b: { id: string; nom: string } | null
  cotes: Array<{ nation_id: string; valeur: number; palier: string | null }> | null
}

interface Props {
  poste: PosteKey
  journeeId: string
  onSelect: (nation: NationInfo) => void
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function SheetNation({ poste, journeeId, onSelect, onClose }: Props) {
  const [matchs, setMatchs] = useState<MatchAvecNations[]>([])
  const [loading, setLoading] = useState(true)
  const { postes } = useEquipageStore()

  useEffect(() => {
    setLoading(true)
    if (!journeeId) { setLoading(false); return }
    fetchMatchsJournee(journeeId).then(({ data }) => {
      setMatchs((data as unknown as MatchAvecNations[]) ?? [])
      setLoading(false)
    })
  }, [journeeId])

  // R5: count how many postes each nation occupies
  const nationCount: Record<string, number> = {}
  for (const p of Object.values(postes)) {
    if (p) nationCount[p.nationId] = (nationCount[p.nationId] ?? 0) + 1
  }

  // R6: collect opponents of all chosen nations
  const chosenIds = new Set(
    Object.values(postes).filter(Boolean).map(p => p!.nationId)
  )
  const greyedR6 = new Set<string>()
  for (const m of matchs) {
    if (chosenIds.has(m.nation_a_id)) greyedR6.add(m.nation_b_id)
    if (chosenIds.has(m.nation_b_id)) greyedR6.add(m.nation_a_id)
  }

  function isGreyed(nationId: string) {
    return greyedR6.has(nationId) || (nationCount[nationId] ?? 0) >= 2
  }

  function getPalier(match: MatchAvecNations, nationId: string): string {
    const cote = match.cotes?.find(c => c.nation_id === nationId)
    if (!cote?.palier) return '22nm'
    return PALIER_NM[cote.palier as PalierType] ?? '22nm'
  }

  return (
    <>
      <div className="eq-overlay" onClick={onClose} />
      <div className="eq-sheet" role="dialog" aria-modal="true">
        <div className="eq-sh-handle" />
        <div className="eq-sh-hd">
          <span className="eq-sh-tag">{POSTE_LABEL[poste]}</span>
          <h2 className="eq-sh-title">Choisir une nation</h2>
        </div>

        <div className="eq-sh-body">
          {loading && (
            <p className="eq-sh-empty">Chargement…</p>
          )}
          {!loading && matchs.length === 0 && (
            <p className="eq-sh-empty">Aucun match disponible</p>
          )}

          {matchs.map(match => {
            const natA = match.nation_a
            const natB = match.nation_b
            if (!natA || !natB) return null

            const flagA = getFlag(natA.nom)
            const flagB = getFlag(natB.nom)
            const greyedA = isGreyed(natA.id)
            const greyedB = isGreyed(natB.id)
            // Dim the card when this match already has one nation chosen
            const hasPick = chosenIds.has(natA.id) || chosenIds.has(natB.id)

            return (
              <div key={match.id} className={`eq-nat-card${hasPick ? ' eq-nat-card--dim' : ''}`}>
                <div className="eq-nat-grid">
                  <button
                    type="button"
                    className={`eq-nat-btn${chosenIds.has(natA.id) ? ' eq-nat-btn--on' : ''}${greyedA ? ' eq-nat-btn--off' : ''}`}
                    onClick={() => !greyedA && onSelect({ id: natA.id, nom: natA.nom, flag: flagA })}
                    disabled={greyedA}
                  >
                    <span className="eq-nat-flag">{flagA}</span>
                    <span className={`eq-nat-name${chosenIds.has(natA.id) ? ' eq-nat-name--on' : ''}`}>
                      {natA.nom}
                    </span>
                    <span className="eq-nat-tier">{getPalier(match, natA.id)}</span>
                  </button>

                  <div className="eq-nat-sep" />

                  <button
                    type="button"
                    className={`eq-nat-btn${chosenIds.has(natB.id) ? ' eq-nat-btn--on' : ''}${greyedB ? ' eq-nat-btn--off' : ''}`}
                    onClick={() => !greyedB && onSelect({ id: natB.id, nom: natB.nom, flag: flagB })}
                    disabled={greyedB}
                  >
                    <span className="eq-nat-flag">{flagB}</span>
                    <span className={`eq-nat-name${chosenIds.has(natB.id) ? ' eq-nat-name--on' : ''}`}>
                      {natB.nom}
                    </span>
                    <span className="eq-nat-tier">{getPalier(match, natB.id)}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
