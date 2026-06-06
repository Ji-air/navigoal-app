import type { ApiEventItem, ApiOddsBet } from './api-sports'

// =========================================================
// TYPES
// =========================================================

export type NavigoalPoste = 'cap' | 'barre' | 'ancre' | 'vigie'
export type Palier = 'Breeze' | 'Wind' | 'Boost'

// =========================================================
// MAPPING POSTES
// =========================================================

/**
 * Mappe les positions API-Sports vers les postes Navigoal.
 *
 * API-Sports pos :  "G"  "D"  "M"  "F"
 * Navigoal          vigie ancre barre cap
 *
 * Correspondances game design :
 *   Cap   = FWD (attaquant, buts — R2 B1 FWD)
 *   Barre = MID (milieu, assists + pré-assists)
 *   Ancre = DEF (défenseur, clean sheet partiel)
 *   Vigie = GK  (gardien, arrêts — stat "Saves")
 *
 * Retourne null si la position est inconnue ou absente (joueurs sans pos renseigné).
 */
export function mapPosteToNavigoal(pos: string | null | undefined): NavigoalPoste | null {
  switch ((pos ?? '').toUpperCase()) {
    case 'G':          return 'vigie'
    case 'D':          return 'ancre'
    case 'M':          return 'barre'
    case 'F':          return 'cap'
    default:           return null
  }
}

/**
 * Version verbeuse — accepte les valeurs longues retournées par certains endpoints.
 * Ex: "Goalkeeper" | "Defender" | "Midfielder" | "Attacker" | "Forward"
 */
export function mapPosteVerboseToNavigoal(position: string | null | undefined): NavigoalPoste | null {
  const p = (position ?? '').toLowerCase()
  if (p.startsWith('goal'))   return 'vigie'
  if (p.startsWith('def'))    return 'ancre'
  if (p.startsWith('mid'))    return 'barre'
  if (p.startsWith('att') || p.startsWith('for')) return 'cap'
  return null
}

// =========================================================
// MAPPING PALIERS (R3)
// =========================================================

/**
 * Mappe une cote décimale vers un palier Navigoal selon R3.
 *
 * Seuils R3 :
 *   Breeze : cote < 2.0   → favori        → impulsion légère
 *   Wind   : 2.0 ≤ cote ≤ 4.5 → outsider modéré → impulsion standard
 *   Boost  : cote > 4.5   → outsider fort → impulsion maximale
 *
 * Note : si aucune cote n'est disponible, le modèle définit Wind comme défaut (MODELE.md).
 */
export function mapOddsToPalier(odds: number): Palier {
  if (odds < 2.0)  return 'Breeze'
  if (odds <= 4.5) return 'Wind'
  return 'Boost'
}

// =========================================================
// EXTRACTION COTE DE VICTOIRE
// =========================================================

/**
 * Extrait la cote de victoire "Match Winner" pour une équipe.
 * teamLabel : 'Home' | 'Away' (valeurs API-Sports pour 1X2)
 * Retourne null si le marché ou l'équipe est absent.
 */
export function extractWinOdd(
  bets: ApiOddsBet[],
  teamLabel: 'Home' | 'Away',
): number | null {
  const matchWinner = bets.find(
    b => b.name === 'Match Winner' || b.name === 'Match Winner (Including Overtime)',
  )
  if (!matchWinner) return null
  const entry = matchWinner.values.find(v => v.value === teamLabel)
  if (!entry) return null
  const parsed = parseFloat(entry.odd)
  return isNaN(parsed) ? null : parsed
}

// =========================================================
// FILTRES ÉVÉNEMENTS
// =========================================================

/** Retourne true si l'événement est un but officiel (hors but contre son camp). */
export function isButOfficiel(event: ApiEventItem): boolean {
  return (
    event.type === 'Goal' &&
    event.detail !== 'Own Goal' &&
    event.detail !== 'Missed Penalty'
  )
}

/** Retourne true si l'événement est un but contre son camp. */
export function isButContreSonCamp(event: ApiEventItem): boolean {
  return event.type === 'Goal' && event.detail === 'Own Goal'
}

/** Retourne true si l'événement est un but annulé VAR. */
export function isButAnnuleVar(event: ApiEventItem): boolean {
  return event.type === 'Var' && event.detail === 'Goal Disallowed - offside'
}

/** Retourne true si l'événement est en phase tirs au but (exclu de B1 FWD — CL6). */
export function isEnTirsAuBut(event: ApiEventItem & { time: { elapsed: number } }): boolean {
  // API-Sports marque les TAB avec elapsed > 90+30 (AET) ou detail "Penalty"
  // La distinction fiable est via le statut du match (score.penalty) plutôt que l'événement seul.
  // Ce flag est indicatif — la vérification définitive se fait sur ApiFixtureItem.score.penalty.
  return event.detail === 'Penalty' && event.time.elapsed > 120
}
