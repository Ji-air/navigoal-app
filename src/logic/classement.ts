export interface EntreeClassement {
  utilisateurId: string
  positionNm: number  // Bateau.position_actuelle_nm — score cumulé depuis J1
  totalBoost: number  // total impulsions valeur_nm = 40nm toutes journées confondues (R15)
}

// COMPORTEMENTS §15 — critère secondaire : Boost count décroissant
export function departagementBoost(a: EntreeClassement, b: EntreeClassement): number {
  return b.totalBoost - a.totalBoost
}

// COMPORTEMENTS §15 — tri : positionNm déc., puis totalBoost déc., puis ex-aequo (pas de 3e critère)
export function trierClassement(entrees: EntreeClassement[]): EntreeClassement[] {
  return [...entrees].sort((a, b) => {
    if (b.positionNm !== a.positionNm) return b.positionNm - a.positionNm
    return departagementBoost(a, b)
  })
}
