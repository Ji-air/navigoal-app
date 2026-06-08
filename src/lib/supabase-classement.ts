import { supabase } from './supabase'
import type { LiguePrive } from './supabase'

export interface MembreScore {
  utilisateurId: string
  pseudo: string
  nmTotal: number
}

function genCode(): string {
  const pool = 'BCDFGHJKLMNPRSTUVWXZ'
  const dig  = '23456789'
  const r = (n: number, s: string) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('')
  return `${r(3, pool)}-${r(2, dig)}${r(1, pool)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (table: string) => (supabase as any).from(table)

export async function fetchLigueUtilisateur(utilisateurId: string): Promise<LiguePrive | null> {
  const { data } = await q('membres_ligue')
    .select('ligue:ligues_privees(*)')
    .eq('utilisateur_id', utilisateurId)
    .limit(1)
    .maybeSingle()
  return (data?.ligue as LiguePrive) ?? null
}

export async function fetchMembresAvecScores(ligueId: string): Promise<MembreScore[]> {
  const { data } = await q('membres_ligue')
    .select('utilisateur_id, utilisateur:utilisateurs(pseudo), bateau:bateaux(position_actuelle_nm)')
    .eq('ligue_id', ligueId)
  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .map((m: any) => ({
      utilisateurId: m.utilisateur_id,
      pseudo:  m.utilisateur?.pseudo ?? '?',
      nmTotal: m.bateau?.position_actuelle_nm ?? 0,
    }))
    .sort((a: MembreScore, b: MembreScore) => b.nmTotal - a.nmTotal)
}

export async function createLigue(
  nom: string,
  utilisateurId: string,
): Promise<{ ligue: LiguePrive | null; error: string | null }> {
  const code = genCode()
  const { data, error } = await q('ligues_privees')
    .insert({ nom, code_invitation: code, createur_id: utilisateurId })
    .select()
    .single()
  if (error || !data) return { ligue: null, error: error?.message ?? 'Erreur création' }
  await q('membres_ligue').insert({ ligue_id: data.id, utilisateur_id: utilisateurId })
  return { ligue: data as LiguePrive, error: null }
}

export async function joinLigue(
  code: string,
  utilisateurId: string,
): Promise<{ ligue: LiguePrive | null; error: string | null }> {
  const { data: ligue } = await q('ligues_privees')
    .select('*')
    .eq('code_invitation', code.trim().toUpperCase())
    .maybeSingle()
  if (!ligue) return { ligue: null, error: 'Code invalide ou ligue introuvable' }
  const { error } = await q('membres_ligue')
    .insert({ ligue_id: ligue.id, utilisateur_id: utilisateurId })
  if (error) {
    if (error.code === '23505') return { ligue: null, error: 'Tu es déjà dans cette ligue' }
    return { ligue: null, error: error.message }
  }
  return { ligue: ligue as LiguePrive, error: null }
}

export interface LiguePreview {
  ligue: LiguePrive
  nbMembres: number
  pseudosMembres: string[]
}

export async function fetchLigueParCode(code: string): Promise<LiguePreview | null> {
  const { data: ligue } = await q('ligues_privees')
    .select('*')
    .eq('code_invitation', code.trim().toUpperCase())
    .maybeSingle()
  if (!ligue) return null

  const { data: membres } = await q('membres_ligue')
    .select('utilisateur:utilisateurs(pseudo)')
    .eq('ligue_id', (ligue as LiguePrive).id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pseudos: string[] = ((membres ?? []) as any[]).map((m: any) => m.utilisateur?.pseudo ?? '?')

  return {
    ligue: ligue as LiguePrive,
    nbMembres: pseudos.length,
    pseudosMembres: pseudos,
  }
}
