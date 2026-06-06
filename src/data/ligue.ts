// §20 — false = phase finale atteinte, adhésion impossible
export const PHASE_GROUPES_OUVERTE = true

export interface MembreLigue {
  utilisateurId: string
  pseudo: string
  positionNm: number
  totalBoost: number    // impulsions 40nm cumulées toutes journées (pour départage §15)
  isCurrentUser: boolean
}

export interface LigueData {
  id: string
  nom: string
  codeInvitation: string
  membres: MembreLigue[]
}

// NPC de la ligue pré-semée
// Carlos (80nm, Boost=1) devant Diana (80nm, Boost=0) — départage §15 visible
export const MEMBRES_LIGUE: MembreLigue[] = [
  { utilisateurId: 'user-alice',  pseudo: 'Alice',   positionNm: 160, totalBoost: 0, isCurrentUser: false },
  { utilisateurId: 'user-bob',    pseudo: 'Bob',     positionNm: 120, totalBoost: 0, isCurrentUser: false },
  { utilisateurId: 'user-carlos', pseudo: 'Carlos',  positionNm: 80,  totalBoost: 1, isCurrentUser: false },
  { utilisateurId: 'user-diana',  pseudo: 'Diana',   positionNm: 80,  totalBoost: 0, isCurrentUser: false },
  { utilisateurId: 'user-moi',    pseudo: 'Moi',     positionNm: 0,   totalBoost: 0, isCurrentUser: true  },
]

export const CODE_LIGUE_PIRATES = 'PIRATES'

// Ligue pré-semée — rejoignable avec le code PIRATES
export const LIGUE_SEED: LigueData = {
  id: 'ligue-pirates',
  nom: 'Les Pirates du Ballon',
  codeInvitation: CODE_LIGUE_PIRATES,
  membres: MEMBRES_LIGUE,
}

// Ancien export conservé pour rétrocompatibilité (non utilisé dans P0-5+)
export const LIGUE_MOCK = LIGUE_SEED
