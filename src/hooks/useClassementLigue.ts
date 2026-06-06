import { useMemo } from "react"
import { trierClassement } from "../logic/classement"
import type { MembreLigue } from "../data/ligue"

export interface EntreeClassementLigue {
  utilisateurId: string
  pseudo: string
  positionNm: number
  totalBoost: number
  isCurrentUser: boolean
  rang: number
  ecartPrecedentNm: number | null  // null si rang = 1
  ecartSuivantNm: number | null    // null si dernier
}

function computeClassement(
  membres: MembreLigue[],
  monScore: number,
  monTotalBoost: number,
): EntreeClassementLigue[] {
  // Injecter le score live de l'utilisateur courant
  const entrees = membres.map(m =>
    m.isCurrentUser
      ? { ...m, positionNm: monScore, totalBoost: monTotalBoost }
      : m,
  )

  // Tri §15 : positionNm déc., puis totalBoost déc.
  const sorted = trierClassement(entrees)

  // Calcul des rangs (ex-aequo si positionNm ET totalBoost identiques — §15)
  const avecRangs = sorted.map((e, i) => {
    let rang: number
    if (i === 0) {
      rang = 1
    } else {
      const prev = sorted[i - 1] as EntreeClassementLigue
      const sameNm = e.positionNm === prev.positionNm
      const sameBoost = e.totalBoost === prev.totalBoost
      rang = sameNm && sameBoost ? prev.rang : i + 1
    }
    return { ...e, rang, ecartPrecedentNm: null as number | null, ecartSuivantNm: null as number | null }
  }) as EntreeClassementLigue[]

  // Calcul des écarts en nm
  for (let i = 0; i < avecRangs.length; i++) {
    if (i > 0) {
      avecRangs[i].ecartPrecedentNm = avecRangs[i - 1].positionNm - avecRangs[i].positionNm
    }
    if (i < avecRangs.length - 1) {
      avecRangs[i].ecartSuivantNm = avecRangs[i].positionNm - avecRangs[i + 1].positionNm
    }
  }

  return avecRangs
}

export function useClassementLigue(
  membres: MembreLigue[],
  monScore: number,
  monTotalBoost: number,
): EntreeClassementLigue[] {
  return useMemo(
    () => computeClassement(membres, monScore, monTotalBoost),
    [membres, monScore, monTotalBoost],
  )
}
