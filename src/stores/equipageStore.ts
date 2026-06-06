import { create } from 'zustand'

export type PosteKey = 'cap' | 'barre' | 'ancre' | 'vigie'

export interface PosteRempli {
  nationId: string
  flag: string
}

interface EquipageStore {
  journeeNumero: number
  postes: Record<PosteKey, PosteRempli | null>
  valide: boolean
  setPoste: (poste: PosteKey, nationId: string, flag: string) => void
  clearPoste: (poste: PosteKey) => void
  validerEquipage: () => Promise<void>
}

export const useEquipageStore = create<EquipageStore>((set, get) => ({
  journeeNumero: 1,
  postes: { cap: null, barre: null, ancre: null, vigie: null },
  valide: false,

  setPoste: (poste, nationId, flag) =>
    set(s => ({ postes: { ...s.postes, [poste]: { nationId, flag } }, valide: false })),

  clearPoste: (poste) =>
    set(s => ({ postes: { ...s.postes, [poste]: null }, valide: false })),

  validerEquipage: async () => {
    const { postes } = get()
    if (!Object.values(postes).every(p => p !== null)) return
    // TODO: upsert Supabase quand session disponible
    set({ valide: true })
  },
}))
