import { create } from 'zustand'
import {
  db,
  fetchJourneeCourante,
  fetchEquipage,
  fetchMatchsJournee,
} from '../lib/supabase'
import type { JourneeNavigoal, Equipage, PalierType } from '../lib/supabase'

export type PosteKey = 'cap' | 'barre' | 'ancre' | 'vigie'

export interface NationDispo {
  id: string
  nom: string
  match_id: string
  adversaire_id: string
  palier: PalierType | null
}

interface EquipageStore {
  journee:            JourneeNavigoal | null
  equipage:           Equipage | null
  nationsDisponibles: NationDispo[]
  loading:            boolean
  error:              string | null

  init:             (userId: string) => Promise<void>
  setPoste:         (poste: PosteKey, nationId: string) => Promise<void>
  clearPoste:       (poste: PosteKey) => Promise<void>
  validerEquipage:  () => Promise<boolean>
  clearError:       () => void
}

function posteField(poste: PosteKey): keyof Pick<
  Equipage,
  'cap_nation_id' | 'barre_nation_id' | 'ancre_nation_id' | 'vigie_nation_id'
> {
  const map = {
    cap:   'cap_nation_id',
    barre: 'barre_nation_id',
    ancre: 'ancre_nation_id',
    vigie: 'vigie_nation_id',
  } as const
  return map[poste]
}

function applyPoste(
  eq: Equipage,
  poste: PosteKey,
  value: string | null,
): Equipage {
  switch (poste) {
    case 'cap':   return { ...eq, cap_nation_id:   value }
    case 'barre': return { ...eq, barre_nation_id: value }
    case 'ancre': return { ...eq, ancre_nation_id: value }
    case 'vigie': return { ...eq, vigie_nation_id: value }
  }
}

export const useEquipageStore = create<EquipageStore>()((set, get) => ({
  journee:            null,
  equipage:           null,
  nationsDisponibles: [],
  loading:            false,
  error:              null,

  init: async (userId) => {
    set({ loading: true, error: null })

    // 1. Journée courante
    const journee = await fetchJourneeCourante()
    if (!journee) {
      set({ loading: false, error: 'Aucune journée en cours.' })
      return
    }

    // 2. Équipage existant ou création
    let equipage = await fetchEquipage(userId, journee.id)
    if (!equipage) {
      const { data, error } = await db.equipages()
        .insert({ utilisateur_id: userId, journee_id: journee.id })
        .select()
        .single()
      if (error || !data) {
        set({ loading: false, error: "Impossible de créer l'équipage." })
        return
      }
      equipage = data
    }

    // 3. Nations disponibles (matchs de la journée + cotes)
    const { data: matchsData } = await fetchMatchsJournee(journee.id)
    const nationsDisponibles: NationDispo[] = []

    if (matchsData) {
      for (const m of matchsData as any[]) {
        const cotes: any[] = m.cotes ?? []
        const coteA = cotes.find((c) => c.nation_id === m.nation_a_id)
        const coteB = cotes.find((c) => c.nation_id === m.nation_b_id)

        nationsDisponibles.push({
          id:           m.nation_a.id,
          nom:          m.nation_a.nom,
          match_id:     m.id,
          adversaire_id: m.nation_b.id,
          palier:       coteA?.palier ?? null,
        })
        nationsDisponibles.push({
          id:           m.nation_b.id,
          nom:          m.nation_b.nom,
          match_id:     m.id,
          adversaire_id: m.nation_a.id,
          palier:       coteB?.palier ?? null,
        })
      }
    }

    set({ journee, equipage, nationsDisponibles, loading: false })
  },

  setPoste: async (poste, nationId) => {
    const { equipage } = get()
    if (!equipage) return

    // Optimistic update
    const prev = equipage
    set({ equipage: applyPoste(equipage, poste, nationId) })

    const field = posteField(poste)
    const { data, error } = await db.equipages()
      .update({ [field]: nationId })
      .eq('id', equipage.id)
      .select()
      .single()

    if (error || !data) {
      set({ equipage: prev, error: error?.message ?? 'Erreur réseau.' })
      return
    }
    set({ equipage: data })
  },

  clearPoste: async (poste) => {
    const { equipage } = get()
    if (!equipage) return

    const prev = equipage
    set({ equipage: applyPoste(equipage, poste, null) })

    const field = posteField(poste)
    const { data, error } = await db.equipages()
      .update({ [field]: null })
      .eq('id', equipage.id)
      .select()
      .single()

    if (error || !data) {
      set({ equipage: prev, error: error?.message ?? 'Erreur réseau.' })
      return
    }
    set({ equipage: data })
  },

  validerEquipage: async () => {
    const { equipage } = get()
    if (!equipage) return false

    const { cap_nation_id, barre_nation_id, ancre_nation_id, vigie_nation_id } = equipage
    if (!cap_nation_id || !barre_nation_id || !ancre_nation_id || !vigie_nation_id) {
      set({ error: "L'équipage doit être complet pour être validé." })
      return false
    }

    const { data, error } = await db.equipages()
      .update({ statut: 'validé' })
      .eq('id', equipage.id)
      .select()
      .single()

    if (error || !data) {
      set({ error: error?.message ?? "Impossible de valider l'équipage." })
      return false
    }
    set({ equipage: data })
    return true
  },

  clearError: () => set({ error: null }),
}))
