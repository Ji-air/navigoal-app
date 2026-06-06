import { create } from 'zustand'
import { MATCHS_JOUR } from '../data/journee'
import type { MatchJour, Palier, PosteNavigoal } from '../types'

export type StatutMatch = 'planifié' | 'en_cours' | 'terminé'

export type TypeImpulsion =
  | 'but'
  | 'assist'
  | 'pre_assist'
  | 'arret'
  | 'clean_sheet'
  | 'collectif'

export interface ImpulsionAffichage {
  id: string
  nationId: string
  poste: PosteNavigoal | 'collectif'
  joueurNom: string | null
  type: TypeImpulsion
  nm: number
  palier: Palier
}

export interface MatchEtat {
  matchId: string
  statut: StatutMatch
  scoreNationA: number
  scoreNationB: number
  vainqueurTirsAuBut: string | null
  impulsions: ImpulsionAffichage[]
}

interface MatchsState {
  matchs: MatchJour[]
  etats: Record<string, MatchEtat>
  pollingId: ReturnType<typeof setInterval> | null
  fetchMatchsJournee: () => Promise<void>
  updateScore: (matchId: string, scoreA: number, scoreB: number, statut?: StatutMatch) => void
  addImpulsion: (matchId: string, impulsion: Omit<ImpulsionAffichage, 'id'>) => void
  startPolling: () => void
  stopPolling: () => void
}

// ---------------------------------------------------------------------------
// Mock — état initial : 2 matchs en cours, 1 planifié
// Impulsions couvrent toutes les nations pour que n'importe quel équipage
// puisse voir des données. La page filtre selon le crew réel.
// ---------------------------------------------------------------------------

const ETATS_INIT: Record<string, MatchEtat> = {
  m1: {
    matchId: 'm1',
    statut: 'en_cours',
    scoreNationA: 2,
    scoreNationB: 1,
    vainqueurTirsAuBut: null,
    impulsions: [
      { id: 'i1',  nationId: 'france',    poste: 'Captain',   joueurNom: 'Mbappé',      type: 'but',         nm: 12, palier: 'Breeze' },
      { id: 'i2',  nationId: 'france',    poste: 'Second',    joueurNom: 'Griezmann',   type: 'assist',      nm: 12, palier: 'Breeze' },
      { id: 'i3',  nationId: 'france',    poste: 'Navigator', joueurNom: 'Griezmann',   type: 'pre_assist',  nm: 12, palier: 'Breeze' },
      { id: 'i4',  nationId: 'france',    poste: 'Watch',     joueurNom: 'Upamecano',   type: 'clean_sheet', nm: 12, palier: 'Breeze' },
      { id: 'i5',  nationId: 'france',    poste: 'Keeper',    joueurNom: 'Maignan',     type: 'arret',       nm: 12, palier: 'Breeze' },
      { id: 'i6',  nationId: 'allemagne', poste: 'Captain',   joueurNom: 'Havertz',     type: 'but',         nm: 28, palier: 'Wind'   },
      { id: 'i7',  nationId: 'allemagne', poste: 'Second',    joueurNom: 'Kimmich',     type: 'assist',      nm: 28, palier: 'Wind'   },
    ],
  },
  m2: {
    matchId: 'm2',
    statut: 'en_cours',
    scoreNationA: 1,
    scoreNationB: 2,
    vainqueurTirsAuBut: null,
    impulsions: [
      { id: 'i8',  nationId: 'bresil',    poste: 'Captain',   joueurNom: 'Vinicius Jr', type: 'but',         nm: 28, palier: 'Wind'   },
      { id: 'i9',  nationId: 'bresil',    poste: 'Second',    joueurNom: 'Paquetá',     type: 'but',         nm: 28, palier: 'Wind'   },
      { id: 'i10', nationId: 'bresil',    poste: 'Keeper',    joueurNom: 'Alisson',     type: 'arret',       nm: 28, palier: 'Wind'   },
      { id: 'i11', nationId: 'espagne',   poste: 'Captain',   joueurNom: 'Morata',      type: 'but',         nm: 28, palier: 'Wind'   },
      { id: 'i12', nationId: 'espagne',   poste: 'Second',    joueurNom: 'Pedri',       type: 'assist',      nm: 28, palier: 'Wind'   },
    ],
  },
  m3: {
    matchId: 'm3',
    statut: 'planifié',
    scoreNationA: 0,
    scoreNationB: 0,
    vainqueurTirsAuBut: null,
    impulsions: [],
  },
}

let _nextId = 200

export const useMatchsStore = create<MatchsState>((set, get) => ({
  matchs: MATCHS_JOUR,
  etats:  ETATS_INIT,
  pollingId: null,

  fetchMatchsJournee: async () => {
    // TODO: appel API réel quand disponible
  },

  updateScore: (matchId, scoreA, scoreB, statut) =>
    set(s => ({
      etats: {
        ...s.etats,
        [matchId]: {
          ...s.etats[matchId],
          scoreNationA: scoreA,
          scoreNationB: scoreB,
          ...(statut ? { statut } : {}),
        },
      },
    })),

  addImpulsion: (matchId, impulsion) =>
    set(s => ({
      etats: {
        ...s.etats,
        [matchId]: {
          ...s.etats[matchId],
          impulsions: [
            ...s.etats[matchId].impulsions,
            { ...impulsion, id: `dyn-${_nextId++}` },
          ],
        },
      },
    })),

  startPolling: () => {
    if (get().pollingId) return
    const id = setInterval(() => {
      const hasLive = Object.values(get().etats).some(e => e.statut === 'en_cours')
      if (hasLive) get().fetchMatchsJournee()
    }, 30_000)
    set({ pollingId: id })
  },

  stopPolling: () => {
    const { pollingId } = get()
    if (!pollingId) return
    clearInterval(pollingId)
    set({ pollingId: null })
  },
}))
