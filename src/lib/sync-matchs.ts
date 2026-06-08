/**
 * sync-matchs — polling 60 s + Realtime Supabase.
 * - Poll: détecte les matchs terminés et déclenche process-match.
 * - Realtime: écoute les INSERT sur impulsions pour un équipage donné.
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchSync {
  id:                   string
  statut:               string
  score_nation_a:       number | null
  score_nation_b:       number | null
  vainqueur_tirs_au_but: string | null
}

export interface ImpulsionSync {
  id:                   string
  equipage_id:          string
  type:                 string
  poste:                string | null
  valeur_nm:            number
  joueur_declencheur_id: string | null
  source_match_id:      string | null
}

export interface SyncHandlers {
  onMatchsUpdate:     (matchs: MatchSync[]) => void
  onImpulsionInsert:  (impulsion: ImpulsionSync) => void
}

// ─── État module ─────────────────────────────────────────────────────────────

let _pollInterval:      ReturnType<typeof setInterval> | null = null
let _realtimeChannel:   RealtimeChannel | null = null
const _matchsTraites    = new Set<string>()   // IDs de matchs dont process-match a été appelé

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Démarre le polling (60 s) et l'écoute Realtime des impulsions.
 *
 * @param journeeId  - ID de la journée en cours
 * @param equipageId - ID de l'équipage de l'utilisateur (pour filtrer les impulsions)
 * @param handlers   - Callbacks appelés sur mise à jour
 */
export async function startSyncMatchs(
  journeeId:  string,
  equipageId: string,
  handlers:   SyncHandlers,
): Promise<void> {
  stopSyncMatchs()

  // ── Première passe immédiate ──────────────────────────────────────────────
  await pollMatchs(journeeId, handlers)

  // ── Polling 60 s ─────────────────────────────────────────────────────────
  _pollInterval = setInterval(() => {
    void pollMatchs(journeeId, handlers)
  }, 60_000)

  // ── Realtime : écoute INSERT sur impulsions ───────────────────────────────
  _realtimeChannel = supabase
    .channel(`impulsions:equipage:${equipageId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'impulsions',
        filter: `equipage_id=eq.${equipageId}`,
      },
      (payload) => {
        handlers.onImpulsionInsert(payload.new as ImpulsionSync)
      },
    )
    .subscribe()
}

/** Arrête le polling et ferme le canal Realtime. */
export function stopSyncMatchs(): void {
  if (_pollInterval) {
    clearInterval(_pollInterval)
    _pollInterval = null
  }
  if (_realtimeChannel) {
    void supabase.removeChannel(_realtimeChannel)
    _realtimeChannel = null
  }
}

// ─── Polling interne ─────────────────────────────────────────────────────────

async function pollMatchs(journeeId: string, handlers: SyncHandlers): Promise<void> {
  const { data, error } = await supabase
    .from('matchs')
    .select('id, statut, score_nation_a, score_nation_b, vainqueur_tirs_au_but')
    .eq('journee_id', journeeId)

  if (error || !data) return

  const matchs = data as MatchSync[]
  handlers.onMatchsUpdate(matchs)

  // Pour chaque match terminé non encore traité : déclencher process-match
  for (const match of matchs) {
    if (match.statut === 'terminé' && !_matchsTraites.has(match.id)) {
      _matchsTraites.add(match.id)  // marquer avant l'appel (idempotent côté Edge Function)
      void appellerProcessMatch(match.id)
    }
  }
}

// ─── Appel Edge Function ──────────────────────────────────────────────────────

async function appellerProcessMatch(matchId: string): Promise<void> {
  const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  try {
    const session = await supabase.auth.getSession()
    const token   = session.data.session?.access_token ?? supabaseAnon

    const res = await fetch(`${supabaseUrl}/functions/v1/process-match`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey':        supabaseAnon,
      },
      body: JSON.stringify({ matchId }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn(`[sync-matchs] process-match ${matchId} → ${res.status}: ${body}`)
    }
  } catch (err) {
    console.error('[sync-matchs] Erreur appel process-match:', err)
    // Retenter au prochain poll (on retire du set)
    _matchsTraites.delete(matchId)
  }
}
