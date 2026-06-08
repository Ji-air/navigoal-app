import { create } from 'zustand'
import { fetchMatchsJournee, db } from '../lib/supabase'
import type { MatchStatut, PalierType, ImpulsionType, ImpulsionPoste } from '../lib/supabase'
import { MOCK_MATCHS } from '../data/journee'

// ─── Types d'affichage ────────────────────────────────────────────────────────

export interface NationInfo { id: string; nom: string }

export interface CoteInfo {
  nation_id: string
  valeur:    number
  palier:    PalierType | null
}

export interface MatchAffiche {
  id:                   string
  nation_a_id:          string
  nation_b_id:          string
  nation_a:             NationInfo
  nation_b:             NationInfo
  heure_coup_envoi_utc: string
  statut:               MatchStatut
  score_nation_a:       number | null
  score_nation_b:       number | null
  cotes:                CoteInfo[]
}

export interface ImpulsionAffichee {
  id:             string
  match_id:       string
  nation_id:      string
  poste:          ImpulsionPoste | null  // null = collectif R4
  type:           ImpulsionType
  valeur_nm:      number
  joueur_nom:     string | null
  evenement_emoji: string | null         // '⚽' | '🛡️' | '🧤'
  palier:         PalierType
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface MatchsStore {
  journeeId:   string | null
  matchs:      MatchAffiche[]
  impulsions:  ImpulsionAffichee[]   // vide jusqu'à l'implémentation du moteur
  loading:     boolean
  error:       string | null

  init:         (journeeId: string) => Promise<void>
  refresh:      () => Promise<void>
  startPolling: () => void
  stopPolling:  () => void
}

let _intervalId: ReturnType<typeof setInterval> | null = null

export const useMatchsStore = create<MatchsStore>()((set, get) => ({
  journeeId:  null,
  matchs:     [],
  impulsions: [],
  loading:    false,
  error:      null,

  init: async (journeeId) => {
    set({ loading: true, error: null, journeeId })

    const { data, error } = await fetchMatchsJournee(journeeId)
    if (error || !data?.length) {
      // Fallback local si Supabase échoue ou journée mock sans matchs en DB
      const isMock = journeeId === 'mock-journee-j1'
      set({ matchs: isMock ? MOCK_MATCHS : [], loading: false, error: null })
      return
    }

    const matchs: MatchAffiche[] = ((data ?? []) as any[]).map((m) => ({
      id:                   m.id,
      nation_a_id:          m.nation_a_id,
      nation_b_id:          m.nation_b_id,
      nation_a:             m.nation_a as NationInfo,
      nation_b:             m.nation_b as NationInfo,
      heure_coup_envoi_utc: m.heure_coup_envoi_utc,
      statut:               m.statut as MatchStatut,
      score_nation_a:       m.score_nation_a ?? null,
      score_nation_b:       m.score_nation_b ?? null,
      cotes:                (m.cotes ?? []) as CoteInfo[],
    }))

    set({ matchs, loading: false })
  },

  refresh: async () => {
    const { journeeId, matchs: current } = get()
    if (!journeeId || !current.length) return

    const ids = current.map(m => m.id)
    const { data } = await (db.matchs() as any)
      .select('id, statut, score_nation_a, score_nation_b')
      .in('id', ids)

    if (!data) return

    const updated = current.map(m => {
      const fresh = (data as any[]).find(d => d.id === m.id)
      if (!fresh) return m
      return {
        ...m,
        statut:        fresh.statut as MatchStatut,
        score_nation_a: fresh.score_nation_a ?? null,
        score_nation_b: fresh.score_nation_b ?? null,
      }
    })
    set({ matchs: updated })
  },

  startPolling: () => {
    if (_intervalId) clearInterval(_intervalId)
    _intervalId = setInterval(() => {
      const { matchs, refresh } = get()
      if (matchs.some(m => m.statut === 'en_cours')) void refresh()
    }, 30_000)
  },

  stopPolling: () => {
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null }
  },
}))
