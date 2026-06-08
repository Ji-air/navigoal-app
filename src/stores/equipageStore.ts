import { create } from 'zustand'
import {
  db,
  fetchJourneeCourante,
  fetchEquipage,
  fetchMatchsJournee,
} from '../lib/supabase'
import type { JourneeNavigoal, Equipage, PalierType } from '../lib/supabase'
import { MOCK_JOURNEE, MOCK_EQUIPAGE, MOCK_NATIONS_DISPO } from '../data/journee'

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
    const { data: journee, error: journeeError } = await fetchJourneeCourante()
    if (!journee) {
      // Fallback local — Supabase inaccessible (RLS, réseau, env de dev)
      set({
        journee:            MOCK_JOURNEE,
        equipage:           MOCK_EQUIPAGE,
        nationsDisponibles: MOCK_NATIONS_DISPO,
        loading:            false,
        error:              `[dev] Supabase: ${journeeError ?? 'journée introuvable'} — données mock actives`,
      })
      return
    }

    // Exposer la journée immédiatement — MatchsPage peut démarrer sans attendre l'équipage
    set({ journee })

    // 2. Équipage existant ou création
    let equipage = await fetchEquipage(userId, journee.id)
    if (!equipage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db.equipages() as any)
        .insert({ utilisateur_id: userId, journee_id: journee.id })
        .select()
        .single()
      if (error || !data) {
        set({ loading: false, error: error?.message ?? "Impossible de créer l'équipage." })
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

    const updateNation = (() => {
      switch (poste) {
        case 'cap':   return { cap_nation_id: nationId }
        case 'barre': return { barre_nation_id: nationId }
        case 'ancre': return { ancre_nation_id: nationId }
        case 'vigie': return { vigie_nation_id: nationId }
      }
    })()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.equipages() as any)
      .update(updateNation)
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

    const clearNation = (() => {
      switch (poste) {
        case 'cap':   return { cap_nation_id: null }
        case 'barre': return { barre_nation_id: null }
        case 'ancre': return { ancre_nation_id: null }
        case 'vigie': return { vigie_nation_id: null }
      }
    })()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.equipages() as any)
      .update(clearNation)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.equipages() as any)
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
