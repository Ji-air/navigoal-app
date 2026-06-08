/**
 * Moteur d'impulsion Navigoal — fonctions pures, sans I/O.
 * Source : FONCTIONS.md + REGLES.md (R2, R3, R4)
 *
 * Valeurs palier : REGLES.md fait foi (12/28/50 nm).
 * FONCTIONS.md indique 8/22/55 — divergence documentée, à trancher après J3 CM2026.
 */

// ─── Types engine (sans accents — différent des enums DB) ────────────────────

export type PosteMoteur   = 'Cap' | 'Barre' | 'Ancre' | 'Vigie'
export type Palier        = 'Breeze' | 'Wind' | 'Boost'
export type TypeEven      = 'but' | 'assist' | 'pre_assist' | 'arret' | 'but_encaisse'
export type PhaseJeuEng   = 'temps_reglementaire' | 'prolongations' | 'tirs_au_but'
export type PosteReelEng  = 'FWD' | 'MID' | 'DEF' | 'GK'

export interface JoueurMoteur {
  joueurId:  string
  nationId:  string
  posteReel: PosteReelEng
}

export interface JoueurLigne {
  joueurId:      string
  minutesJouees: number    // MVP : 90 pour tous (pas de table stats en schéma)
}

export interface EvenementMoteur {
  id:        string          // UUID DB — pour source_evenement_id
  joueurId:  string
  nationId:  string          // nation_id du joueur (depuis JOIN joueurs)
  posteReel: PosteReelEng    // poste_reel du joueur
  type:      TypeEven
  phaseJeu:  PhaseJeuEng
  officiel:  boolean         // couche appelante garantit true
}

export interface EquipageMoteur {
  id:            string
  utilisateurId: string
  Cap:           string | null
  Barre:         string | null
  Ancre:         string | null
  Vigie:         string | null
}

export interface MatchMoteur {
  id:             string
  nationAId:      string
  nationBId:      string
  statut:         string
  scoreA:         number | null
  scoreB:         number | null
  vainqueurTabId: string | null   // null si pas de TAB
}

export interface CoteMoteur {
  nationId: string
  palier:   Palier            // figé au gel (R7, CL7)
}

export interface ImpulsionResult {
  equipageId:          string
  utilisateurId:       string
  poste:               PosteMoteur | null   // null pour collectif
  type:                'poste' | 'collectif'
  valeur_nm:           number
  joueurB1Id:          string | null
  nationId:            string
  matchId:             string
  sourceEvenementId:   string | null
  sourceMatchId:       string | null
}

// ─── Palier (R3) ─────────────────────────────────────────────────────────────

const PALIER_NM: Record<Palier, number> = { Breeze: 12, Wind: 28, Boost: 50 }

export function calculerPalier(cote: number | null): Palier {
  if (cote === null) return 'Wind'
  if (cote < 2.0)    return 'Breeze'
  if (cote <= 4.5)   return 'Wind'
  return 'Boost'
}

export function impulsionDuPalier(palier: Palier): number {
  return PALIER_NM[palier]
}

// ─── Mapping poste Navigoal → ligne football ──────────────────────────────────

const POSTE_TO_REEL: Record<PosteMoteur, PosteReelEng> = {
  Cap: 'FWD', Barre: 'MID', Ancre: 'DEF', Vigie: 'GK',
}

// ─── B1 — meilleur performer (R2) ────────────────────────────────────────────

export function selectionnerMeilleurPerformer(
  poste:         PosteMoteur,
  ligneJoueurs:  JoueurLigne[],
  evenements:    EvenementMoteur[],   // events pour cette nation, filtrés par posteReel
): string | null {
  const eligibles = ligneJoueurs.filter(j => j.minutesJouees >= 1)
  if (eligibles.length === 0) return null

  function score(joueurId: string): number {
    const evs = evenements.filter(e => e.joueurId === joueurId)
    switch (poste) {
      case 'Cap':
        return evs.filter(e => e.type === 'but' && e.phaseJeu !== 'tirs_au_but').length
      case 'Barre':
        return evs.filter(e => ['but', 'assist', 'pre_assist'].includes(e.type)).length
      case 'Ancre':
        return ligneJoueurs.find(j => j.joueurId === joueurId)?.minutesJouees ?? 0
      case 'Vigie':
        return evs.filter(e => e.type === 'arret').length
    }
  }

  let best: string | null = null
  let bestScore = -1
  for (const j of eligibles) {
    const s = score(j.joueurId)
    if (s > bestScore) { bestScore = s; best = j.joueurId }
  }

  // Seuils minimum par poste (CL1 / R2)
  if (poste === 'Cap'   && bestScore < 1) return null   // ≥1 but hors TAB
  if (poste === 'Barre' && bestScore < 1) return null   // ≥1 événement
  if (poste === 'Vigie' && bestScore < 3) return null   // ≥3 arrêts

  return best
}

// ─── Évaluateurs individuels ──────────────────────────────────────────────────

export function evaluerCap(evenements: EvenementMoteur[], joueurId: string): boolean {
  return evenements.some(
    e => e.joueurId === joueurId && e.type === 'but' && e.phaseJeu !== 'tirs_au_but' && e.officiel,
  )
}

export function evaluerBarre(evenements: EvenementMoteur[], joueurId: string): boolean {
  return evenements.some(
    e => e.joueurId === joueurId
      && ['but', 'assist', 'pre_assist'].includes(e.type)
      && e.officiel,
  )
}

export function evaluerAncre(butsEncaissesNation: number): boolean {
  return butsEncaissesNation <= 1
}

export function evaluerVigie(arretsDuJoueur: number): boolean {
  return arretsDuJoueur >= 3
}

// ─── Impulsion poste (R2 + R3) ───────────────────────────────────────────────

interface ResultatPoste {
  valeur:             number
  joueurB1Id:         string | null
  sourceEvenementId:  string | null
}

export function calculerImpulsionPoste(
  poste:               PosteMoteur,
  nationId:            string | null,
  palier:              Palier,
  ligneJoueurs:        JoueurLigne[],
  evenements:          EvenementMoteur[],  // events de la nation filtrés par posteReel
  butsEncaissesNation: number,             // total but_encaisse hors TAB
  allNationEvents:     EvenementMoteur[],  // tous events nation (pour sourceEvenementId Ancre)
): ResultatPoste {
  const zero: ResultatPoste = { valeur: 0, joueurB1Id: null, sourceEvenementId: null }
  if (!nationId) return zero

  const joueurB1 = selectionnerMeilleurPerformer(poste, ligneJoueurs, evenements)
  if (!joueurB1) return zero

  let triggered = false
  let sourceEvenementId: string | null = null

  switch (poste) {
    case 'Cap': {
      triggered = evaluerCap(evenements, joueurB1)
      if (triggered) {
        sourceEvenementId = evenements.find(
          e => e.joueurId === joueurB1 && e.type === 'but' && e.phaseJeu !== 'tirs_au_but' && e.officiel,
        )?.id ?? null
      }
      break
    }
    case 'Barre': {
      triggered = evaluerBarre(evenements, joueurB1)
      if (triggered) {
        sourceEvenementId = evenements.find(
          e => e.joueurId === joueurB1 && ['but', 'assist', 'pre_assist'].includes(e.type) && e.officiel,
        )?.id ?? null
      }
      break
    }
    case 'Ancre': {
      triggered = evaluerAncre(butsEncaissesNation)
      // Source : dernier but_encaissé si dispo ; null pour clean sheet
      // (migration 003 assouplit la contrainte DB pour ce cas)
      if (triggered) {
        sourceEvenementId = allNationEvents.find(
          e => e.type === 'but_encaisse' && e.phaseJeu !== 'tirs_au_but',
        )?.id ?? null
      }
      break
    }
    case 'Vigie': {
      const arrets = evenements.filter(e => e.joueurId === joueurB1 && e.type === 'arret').length
      triggered = evaluerVigie(arrets)
      if (triggered) {
        sourceEvenementId = evenements.find(
          e => e.joueurId === joueurB1 && e.type === 'arret',
        )?.id ?? null
      }
      break
    }
  }

  if (!triggered) return { valeur: 0, joueurB1Id: joueurB1, sourceEvenementId: null }
  return { valeur: impulsionDuPalier(palier), joueurB1Id: joueurB1, sourceEvenementId }
}

// ─── Impulsion collective (R4) ────────────────────────────────────────────────

export function calculerImpulsionCollective(palier: Palier): number {
  return impulsionDuPalier(palier)
}

// ─── Vainqueur du match ───────────────────────────────────────────────────────

export function determinerVainqueur(match: MatchMoteur): string | null {
  if (match.statut !== 'terminé') return null
  // CL6 : TAB compte comme victoire pour R4
  if (match.vainqueurTabId) return match.vainqueurTabId
  if (match.scoreA === null || match.scoreB === null) return null
  if (match.scoreA > match.scoreB) return match.nationAId
  if (match.scoreB > match.scoreA) return match.nationBId
  return null  // nul
}

// ─── Orchestration journée ────────────────────────────────────────────────────

/**
 * Calcule toutes les impulsions d'une journée pour un équipage.
 *
 * @param joueurs - Liste de tous les joueurs des nations impliquées, avec leur posteReel.
 *   Requis pour que l'Ancre fonctionne en cas de clean sheet (0 événement DEF).
 *   Si omis, l'Ancre clean-sheet retourne 0nm (limitation MVP acceptable).
 */
export function calculerImpulsionsJournee(
  equipage:   EquipageMoteur,
  matchs:     MatchMoteur[],
  evenements: EvenementMoteur[],
  cotes:      CoteMoteur[],
  joueurs:    JoueurMoteur[] = [],
): ImpulsionResult[] {
  const results: ImpulsionResult[] = []
  const postes: PosteMoteur[] = ['Cap', 'Barre', 'Ancre', 'Vigie']

  for (const poste of postes) {
    const nationId = equipage[poste]
    if (!nationId) continue

    const match = matchs.find(
      m => (m.nationAId === nationId || m.nationBId === nationId) && m.statut === 'terminé',
    )
    if (!match) continue

    const cote   = cotes.find(c => c.nationId === nationId)
    const palier = cote?.palier ?? 'Wind'

    const posteReel = POSTE_TO_REEL[poste]

    // Events officiels du match filtrés pour la ligne football de ce poste
    const evsLigne = evenements.filter(
      e => e.nationId === nationId && e.officiel && e.posteReel === posteReel,
    )

    // Tous les events officiels de la nation (pour Ancre : compter buts encaissés)
    const evsNation = evenements.filter(e => e.nationId === nationId && e.officiel)

    // Buts encaissés hors TAB (Ancre condition collective)
    const butsEncaissesNation = evsNation.filter(
      e => e.type === 'but_encaisse' && e.phaseJeu !== 'tirs_au_but',
    ).length

    // JoueurLigne : fusionner joueurs explicites + inférés depuis events
    const joueurMap = new Map<string, number>()
    joueurs
      .filter(j => j.nationId === nationId && j.posteReel === posteReel)
      .forEach(j => joueurMap.set(j.joueurId, 90))   // MVP : 90 min pour tous
    evsLigne.forEach(e => {
      if (!joueurMap.has(e.joueurId)) joueurMap.set(e.joueurId, 90)
    })
    const ligneJoueurs: JoueurLigne[] = [...joueurMap.entries()].map(
      ([joueurId, minutesJouees]) => ({ joueurId, minutesJouees }),
    )

    const { valeur, joueurB1Id, sourceEvenementId } = calculerImpulsionPoste(
      poste, nationId, palier, ligneJoueurs, evsLigne, butsEncaissesNation, evsNation,
    )

    if (valeur > 0) {
      results.push({
        equipageId:        equipage.id,
        utilisateurId:     equipage.utilisateurId,
        poste,
        type:              'poste',
        valeur_nm:         valeur,
        joueurB1Id,
        nationId,
        matchId:           match.id,
        sourceEvenementId,
        sourceMatchId:     sourceEvenementId === null ? match.id : null,
      })
    }
  }

  // R4 — impulsion collective pour chaque nation victorieuse de l'équipage (1 seule par nation)
  const nationsTraitees = new Set<string>()
  const allNationIds = new Set(
    postes.map(p => equipage[p]).filter((id): id is string => id !== null),
  )

  for (const nationId of allNationIds) {
    if (nationsTraitees.has(nationId)) continue
    nationsTraitees.add(nationId)

    const match = matchs.find(
      m => (m.nationAId === nationId || m.nationBId === nationId) && m.statut === 'terminé',
    )
    if (!match) continue

    const vainqueur = determinerVainqueur(match)
    if (vainqueur !== nationId) continue

    const cote   = cotes.find(c => c.nationId === nationId)
    const palier = cote?.palier ?? 'Wind'

    results.push({
      equipageId:        equipage.id,
      utilisateurId:     equipage.utilisateurId,
      poste:             null,
      type:              'collectif',
      valeur_nm:         calculerImpulsionCollective(palier),
      joueurB1Id:        null,
      nationId,
      matchId:           match.id,
      sourceEvenementId: null,
      sourceMatchId:     match.id,
    })
  }

  return results
}

// ─── Score journée (COMPORTEMENTS.md §13) ────────────────────────────────────

export function calculerScoreJournee(impulsions: number[]): number {
  return impulsions.reduce((sum, v) => sum + v, 0)
}
