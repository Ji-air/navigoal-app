import type { Palier } from '../types'

// =========================================================
// TYPES — alignés sur FONCTIONS.md (sans accents, 4 postes)
// =========================================================

export type PosteMoteur = 'Cap' | 'Barre' | 'Ancre' | 'Vigie'

export type PhaseJeu =
  | 'temps_reglementaire'
  | 'prolongations'
  | 'tirs_au_but'

export type TypeEvenement =
  | 'but'
  | 'assist'
  | 'pre_assist'
  | 'arret'
  | 'but_encaisse'

export interface EvenementMatch {
  id: string
  joueurId: string
  type: TypeEvenement
  phaseJeu: PhaseJeu
  officiel: boolean       // false = annulé VAR (CL5) — filtré par l'appelant
  minutesJouees: number   // >= 1 requis (CL1)
}

export interface JoueurLigne {
  joueurId: string
  minutesJouees: number   // 0 si absent (CL1)
}

export interface ContextePoste {
  poste: PosteMoteur
  nationId: string | null           // null = poste vide → 0nm
  palier: Palier                    // figé au gel (CL7)
  ligneJoueurs: JoueurLigne[]       // joueurs de la nation pour la ligne football du poste
  evenements: EvenementMatch[]      // officiel=true garanti par l'appelant
  butsEncaissesNation: number       // but_encaisse hors tirs_au_but pour ce match
}

export interface ResultatPoste {
  poste: PosteMoteur
  nationId: string | null
  joueurB1Id: string | null
  nm: number
  palier: Palier
}

export interface ResultatCollectif {
  nationId: string
  nm: number
  palier: Palier
}

export interface ResultatImpulsionsMatch {
  postes: ResultatPoste[]
  collectifs: ResultatCollectif[]
}

// =========================================================
// PALIER (R3) — calibré CM2018 + CM2022
// =========================================================

const PALIER_NM: Record<Palier, number> = { Breeze: 12, Wind: 28, Boost: 50 }

export function impulsionDuPalier(palier: Palier): number {
  return PALIER_NM[palier]
}

export function calculerPalier(cote: number | null): Palier {
  if (cote === null) return 'Wind'
  if (cote < 2.0) return 'Breeze'
  if (cote <= 4.5) return 'Wind'
  return 'Boost'
}

// =========================================================
// B1 — SÉLECTION MEILLEUR PERFORMER (R2)
//
// Égalité : premier dans l'ordre stable de ligneJoueurs (FONCTIONS.md §b1).
// =========================================================

export function selectionnerMeilleurPerformer(
  poste: PosteMoteur,
  ligneJoueurs: JoueurLigne[],
  evenements: EvenementMatch[],
): string | null {
  const joueurs = ligneJoueurs.filter(j => j.minutesJouees >= 1)
  if (joueurs.length === 0) return null

  switch (poste) {
    case 'Cap': {
      const buts = new Map<string, number>()
      for (const ev of evenements) {
        if (ev.type === 'but' && ev.phaseJeu !== 'tirs_au_but' && ev.officiel) {
          buts.set(ev.joueurId, (buts.get(ev.joueurId) ?? 0) + 1)
        }
      }
      const eligible = joueurs.filter(j => (buts.get(j.joueurId) ?? 0) > 0)
      if (eligible.length === 0) return null
      return eligible.reduce((best, j) =>
        (buts.get(j.joueurId) ?? 0) > (buts.get(best.joueurId) ?? 0) ? j : best
      ).joueurId
    }

    case 'Barre': {
      const pts = new Map<string, number>()
      for (const ev of evenements) {
        if (
          (ev.type === 'but' || ev.type === 'assist' || ev.type === 'pre_assist') &&
          ev.officiel
        ) {
          pts.set(ev.joueurId, (pts.get(ev.joueurId) ?? 0) + 1)
        }
      }
      const eligible = joueurs.filter(j => (pts.get(j.joueurId) ?? 0) > 0)
      if (eligible.length === 0) return null
      return eligible.reduce((best, j) =>
        (pts.get(j.joueurId) ?? 0) > (pts.get(best.joueurId) ?? 0) ? j : best
      ).joueurId
    }

    case 'Ancre': {
      // Joueur DEF avec le plus de minutes — condition collective vérifiée séparément
      return joueurs.reduce((best, j) =>
        j.minutesJouees > best.minutesJouees ? j : best
      ).joueurId
    }

    case 'Vigie': {
      const arrets = new Map<string, number>()
      for (const ev of evenements) {
        if (ev.type === 'arret') {
          arrets.set(ev.joueurId, (arrets.get(ev.joueurId) ?? 0) + 1)
        }
      }
      const eligible = joueurs.filter(j => (arrets.get(j.joueurId) ?? 0) >= 3)
      if (eligible.length === 0) return null
      return eligible.reduce((best, j) =>
        (arrets.get(j.joueurId) ?? 0) > (arrets.get(best.joueurId) ?? 0) ? j : best
      ).joueurId
    }
  }
}

// =========================================================
// ÉVALUATEURS (R2)
// =========================================================

export function evaluerCap(evenements: EvenementMatch[], joueurId: string): boolean {
  return evenements.some(
    ev =>
      ev.joueurId === joueurId &&
      ev.type === 'but' &&
      ev.phaseJeu !== 'tirs_au_but' &&
      ev.officiel,
  )
}

export function evaluerBarre(evenements: EvenementMatch[], joueurId: string): boolean {
  return evenements.some(
    ev =>
      ev.joueurId === joueurId &&
      (ev.type === 'but' || ev.type === 'assist' || ev.type === 'pre_assist') &&
      ev.officiel,
  )
}

export function evaluerAncre(butsEncaissesNation: number): boolean {
  return butsEncaissesNation <= 1
}

export function evaluerVigie(arretsDuJoueur: number): boolean {
  return arretsDuJoueur >= 3
}

// =========================================================
// CALCUL IMPULSION POSTE (R2 + R3)
// =========================================================

export function calculerImpulsionPoste(ctx: ContextePoste): ResultatPoste {
  const { poste, nationId, palier, ligneJoueurs, evenements, butsEncaissesNation } = ctx

  if (nationId === null) {
    return { poste, nationId, joueurB1Id: null, nm: 0, palier }
  }

  const joueurB1Id = selectionnerMeilleurPerformer(poste, ligneJoueurs, evenements)
  if (joueurB1Id === null) {
    return { poste, nationId, joueurB1Id: null, nm: 0, palier }
  }

  let declenche: boolean
  switch (poste) {
    case 'Cap':
      declenche = evaluerCap(evenements, joueurB1Id)
      break
    case 'Barre':
      declenche = evaluerBarre(evenements, joueurB1Id)
      break
    case 'Ancre':
      declenche = evaluerAncre(butsEncaissesNation)
      break
    case 'Vigie': {
      const arrets = evenements.filter(
        ev => ev.joueurId === joueurB1Id && ev.type === 'arret',
      ).length
      declenche = evaluerVigie(arrets)
      break
    }
  }

  return {
    poste,
    nationId,
    joueurB1Id,
    nm: declenche ? impulsionDuPalier(palier) : 0,
    palier,
  }
}

// =========================================================
// CALCUL IMPULSION COLLECTIVE (R4)
// =========================================================

export function calculerImpulsionCollective(palier: Palier): number {
  return impulsionDuPalier(palier)
}

// =========================================================
// CALCUL COMPLET MATCH (R2 + R3 + R4)
//
// Pré-conditions (gérées par l'appelant) :
//   - match.statut === 'terminé' (CL16)
//   - CL10 double match : appeler avec la dernière victoire de la journée
//   - donneesParPoste filtrés sur officiel=true (CL5)
// =========================================================

export function calculerImpulsionsMatch(
  donneesParPoste: ContextePoste[],
  vainqueurId: string | null,
  palierParNation: Map<string, Palier>,
): ResultatImpulsionsMatch {
  const postes = donneesParPoste.map(ctx => calculerImpulsionPoste(ctx))

  const collectifs: ResultatCollectif[] = []

  if (vainqueurId !== null) {
    // Une seule R4 par nation victorieuse même si elle occupe 2 postes (R5)
    const nationsEquipage = new Set(
      donneesParPoste.map(ctx => ctx.nationId).filter((n): n is string => n !== null),
    )
    if (nationsEquipage.has(vainqueurId)) {
      const palier = palierParNation.get(vainqueurId) ?? 'Wind'
      collectifs.push({
        nationId: vainqueurId,
        nm: calculerImpulsionCollective(palier),
        palier,
      })
    }
  }

  return { postes, collectifs }
}

// =========================================================
// UTILITAIRES CLASSEMENT
// =========================================================

export interface EntreeClassement {
  utilisateurId: string
  positionNm: number
  totalBoost: number
}

export function trierClassement(entrees: EntreeClassement[]): EntreeClassement[] {
  return [...entrees].sort((a, b) => {
    if (b.positionNm !== a.positionNm) return b.positionNm - a.positionNm
    return b.totalBoost - a.totalBoost
  })
}
