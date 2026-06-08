import { create } from 'zustand'
import {
  fetchLigueUtilisateur,
  fetchMembresAvecScores,
  createLigue as createLigueDB,
  joinLigue as joinLigueDB,
  type MembreScore,
} from '../lib/supabase-classement'
import type { LiguePrive } from '../lib/supabase'

export type LiguePageState = 'loading' | 'no-ligue' | 'with-ligue'

interface LigueStore {
  pageState: LiguePageState
  ligue: LiguePrive | null
  membres: MembreScore[]

  fetchClassement: (userId: string) => Promise<void>
  createLigue: (nom: string, userId: string) => Promise<{ ligue: LiguePrive | null; error: string | null }>
  joinLigue: (code: string, userId: string) => Promise<{ error: string | null }>
  setWithLigue: (ligue: LiguePrive, membres: MembreScore[]) => void
}

export const useLigueStore = create<LigueStore>()((set) => ({
  pageState: 'loading',
  ligue: null,
  membres: [],

  fetchClassement: async (userId) => {
    set({ pageState: 'loading' })
    const ligue = await fetchLigueUtilisateur(userId)
    if (!ligue) {
      set({ pageState: 'no-ligue', ligue: null, membres: [] })
      return
    }
    const membres = await fetchMembresAvecScores(ligue.id)
    set({ pageState: 'with-ligue', ligue, membres })
  },

  createLigue: async (nom, userId) => {
    const { ligue, error } = await createLigueDB(nom, userId)
    if (error || !ligue) return { ligue: null, error: error ?? 'Erreur création' }
    const membres = await fetchMembresAvecScores(ligue.id)
    set({ pageState: 'with-ligue', ligue, membres })
    return { ligue, error: null }
  },

  joinLigue: async (code, userId) => {
    const { ligue, error } = await joinLigueDB(code, userId)
    if (error || !ligue) return { error: error ?? 'Code invalide' }
    const membres = await fetchMembresAvecScores(ligue.id)
    set({ pageState: 'with-ligue', ligue, membres })
    return { error: null }
  },

  setWithLigue: (ligue, membres) => {
    set({ pageState: 'with-ligue', ligue, membres })
  },
}))
