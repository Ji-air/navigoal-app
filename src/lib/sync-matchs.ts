import { supabase } from './supabase'
import type { Equipage, Joueur, Match, ImpulsionPoste } from './supabase'
import type { Palier } from '../types'

// =========================================================
// TYPES
// =========================================================

export interface MatchSync {
  id: string
  statut: 'planifié' | 'en_cours' | 'terminé' | 'interrompu'
  scoreNationA: number
  scoreNationB: number
  vainqueurTirsAuBut: string | null
}

export interface ImpulsionSync {
  id: string
  matchId: string
  nationId: string | null   // null pour collectif si nation non déductible
  poste: ImpulsionPoste | null
  type: 'poste' | 'collectif'
  joueurNom: string | null
  nm: number
  palier: Palier
}

export interface SyncHandlers {
  onMatchUpdate: (match: MatchSync) => void
  onImpulsion: (imp: ImpulsionSync) => void
}

// =========================================================
// ÉTAT INTERNE
// =========================================================

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let pollingTimer: ReturnType<typeof setInterval> | null = null

let equipageSnapshot: Partial<Record<ImpulsionPoste, string>> = {}
const matchsTraites = new Set<string>()

// =========================================================
// DÉMARRAGE
// =========================================================

export async function startSyncMatchs(
  equipageId: string,
  journeeId: string,
  handlers: SyncHandlers,
): Promise<void> {
  stopSyncMatchs()
  matchsTraites.clear()

  // Snapshot équipage : poste → nationId (pour dériver la nation dans onImpulsion)
  const { data: eq } = await supabase
    .from('equipages')
    .select('*')
    .eq('id', equipageId)
    .single() as { data: Equipage | null; error: unknown }

  equipageSnapshot = eq
    ? {
        Cap:   eq.cap_nation_id   ?? undefined,
        Barre: eq.barre_nation_id ?? undefined,
        Ancre: eq.ancre_nation_id ?? undefined,
        Vigie: eq.vigie_nation_id ?? undefined,
      }
    : {}

  // ── Realtime : INSERT sur impulsions pour cet équipage ──
  realtimeChannel = supabase
    .channel(`sync-matchs:${equipageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'impulsions',
        filter: `equipage_id=eq.${equipageId}`,
      },
      async (payload) => {
        const raw = payload.new as {
          id: string
          source_match_id: string | null
          type: 'poste' | 'collectif'
          poste: ImpulsionPoste | null
          valeur_nm: number
          joueur_declencheur_id: string | null
        }

        let joueurNom: string | null = null
        if (raw.joueur_declencheur_id) {
          const { data: j } = await supabase
            .from('joueurs')
            .select('*')
            .eq('id', raw.joueur_declencheur_id)
            .single() as { data: Joueur | null; error: unknown }
          joueurNom = j?.nom ?? null
        }

        const nationId = raw.poste ? (equipageSnapshot[raw.poste] ?? null) : null

        handlers.onImpulsion({
          id: raw.id,
          matchId: raw.source_match_id ?? '',
          nationId,
          poste: raw.poste,
          type: raw.type,
          joueurNom,
          nm: raw.valeur_nm,
          palier: nmToPalier(raw.valeur_nm),
        })
      },
    )
    .subscribe()

  // ── Polling 60s : sync scores + déclenchement Edge Function ──
  pollingTimer = setInterval(async () => {
    const { data: matchs } = await supabase
      .from('matchs')
      .select('*')
      .eq('journee_id', journeeId) as { data: Match[] | null; error: unknown }

    if (!matchs) return

    for (const m of matchs) {
      handlers.onMatchUpdate({
        id: m.id,
        statut: m.statut as MatchSync['statut'],
        scoreNationA: m.score_nation_a ?? 0,
        scoreNationB: m.score_nation_b ?? 0,
        vainqueurTirsAuBut: m.vainqueur_tirs_au_but,
      })

      if (m.statut === 'terminé' && !matchsTraites.has(m.id)) {
        matchsTraites.add(m.id)
        supabase.functions
          .invoke('process-match', { body: { matchId: m.id } })
          .catch((e: unknown) => console.error('[sync-matchs] process-match:', e))
      }
    }
  }, 60_000)
}

// =========================================================
// ARRÊT
// =========================================================

export function stopSyncMatchs(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// =========================================================
// UTILITAIRES
// =========================================================

function nmToPalier(nm: number): Palier {
  if (nm <= 12) return 'Breeze'
  if (nm <= 28) return 'Wind'
  return 'Boost'
}
