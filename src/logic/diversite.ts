import type { Palier } from "./palier"

// R5 / COMPORTEMENTS §13 action 1 — N = matchs "terminé" uniquement
export function seuilDiversite(nombreMatchesTermines: number): number | null {
  if (nombreMatchesTermines >= 2 && nombreMatchesTermines <= 3) return 1
  if (nombreMatchesTermines >= 4 && nombreMatchesTermines <= 6) return 2
  return null
}

export interface ParamsBonusDiversite {
  nombreMatchesTermines: number
  // Palier de chaque nation DISTINCTE présente dans l'équipage (R5 : nations distinctes)
  paliersNationsEquipage: Palier[]
  // Impulsions avec valeur_nm > 0 (VAR-neutralisées exclues — COMPORTEMENTS §13 note)
  nombreImpulsionsDeclenchees: number
}

// R5 — +10nm par impulsion déclenchée si condition outsiders remplie
export function calculerBonusDiversite(params: ParamsBonusDiversite): number {
  const { nombreMatchesTermines, paliersNationsEquipage, nombreImpulsionsDeclenchees } = params

  const seuil = seuilDiversite(nombreMatchesTermines)
  if (seuil === null) return 0

  const outsiders = paliersNationsEquipage.filter(p => p === "Wind" || p === "Boost").length
  if (outsiders < seuil) return 0

  return nombreImpulsionsDeclenchees * 10
}
