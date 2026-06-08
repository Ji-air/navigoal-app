import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── Constants ───────────────────────────────────────────────────────────────

const LS_SESSION_KEY = 'ng_session'
const LS_PENDING_KEY = 'ng_pending_pseudo'

// Compte prototype partagé — tous les utilisateurs en mode prototype utilisent
// ce compte Supabase. Le pseudo est stocké localement dans localStorage.
const PROTO_EMAIL    = 'prototype@navigoal.dev'
const PROTO_PASSWORD = 'navigoal-proto-2026'

interface ProtoSession {
  userId:      string
  pseudo:      string
  isPrototype: true
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthStore {
  userId:   string | null
  pseudo:   string | null
  loading:  boolean
  authStep: 'idle' | 'email_sent'

  restoreSession:  () => Promise<void>
  /** Variante B / nouveau compte : pseudo + email → lien magique */
  signUp:          (pseudo: string, email: string) => Promise<{ error: string | null }>
  /** Variante C / compte existant : email seul → lien magique */
  signIn:          (email: string) => Promise<{ error: string | null }>
  /** Mode prototype : pseudo seul → compte partagé prototype@navigoal.dev */
  signInPrototype: (pseudo: string) => Promise<void>
  signOut:         () => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (table: string) => (supabase as any).from(table)

async function fetchPseudo(userId: string): Promise<string | null> {
  const { data } = await q('utilisateurs').select('pseudo').eq('id', userId).maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.pseudo ?? null
}

async function upsertUtilisateur(userId: string, pseudo: string): Promise<void> {
  await q('utilisateurs')
    .upsert({ id: userId, pseudo }, { onConflict: 'id', ignoreDuplicates: true })
}

// ── Store ────────────────────────────────────────────────────────────────────

let _authListenerReady = false

export const useAuthStore = create<AuthStore>()((set) => ({
  userId:   null,
  pseudo:   null,
  loading:  true,
  authStep: 'idle',

  restoreSession: async () => {
    set({ loading: true })

    // Abonnement unique aux changements d'état Supabase Auth
    if (!_authListenerReady) {
      _authListenerReady = true
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[auth] onAuthStateChange', event, session?.user?.id ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id

          // LS_PENDING_KEY a la priorité sur la DB :
          // - nouveaux utilisateurs OTP / prototype : pseudo choisi à la connexion
          // - compte prototype partagé : la DB ne contient que le pseudo du premier utilisateur
          const pendingPseudo = localStorage.getItem(LS_PENDING_KEY)
          const dbPseudo      = pendingPseudo ?? await fetchPseudo(userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pseudo: string = dbPseudo
            ?? (session.user.user_metadata as any)?.pseudo
            ?? session.user.email?.split('@')[0]
            ?? 'Capitaine'

          await upsertUtilisateur(userId, pseudo)
          if (pendingPseudo) localStorage.removeItem(LS_PENDING_KEY)

          set({ userId, pseudo, loading: false, authStep: 'idle' })
        }

        if (event === 'SIGNED_OUT') {
          set({ userId: null, pseudo: null, authStep: 'idle' })
        }
      })
    }

    // 1. Session Supabase Auth encore active
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // Pour les sessions prototype, le pseudo de référence est dans LS_SESSION_KEY
      // (le compte DB est partagé et ne reflète pas le pseudo de l'utilisateur courant)
      let pseudo: string | null = null
      try {
        const raw = localStorage.getItem(LS_SESSION_KEY)
        if (raw) {
          const saved = JSON.parse(raw) as ProtoSession
          if (saved.isPrototype) pseudo = saved.pseudo
        }
      } catch { /* ignore */ }
      if (!pseudo) pseudo = await fetchPseudo(session.user.id)
      set({ userId: session.user.id, pseudo, loading: false })
      return
    }

    // 2. Session prototype expirée — marqueur isPrototype dans localStorage
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as ProtoSession
        if (saved.isPrototype && saved.pseudo) {
          const { data: rd, error: re } = await supabase.auth.signInWithPassword({
            email: PROTO_EMAIL, password: PROTO_PASSWORD,
          })
          if (!re && rd.session?.user) {
            const userId = rd.session.user.id
            localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ userId, pseudo: saved.pseudo, isPrototype: true }))
            set({ userId, pseudo: saved.pseudo, loading: false })
            return
          }
          localStorage.removeItem(LS_SESSION_KEY)
        }
      }
    } catch {
      localStorage.removeItem(LS_SESSION_KEY)
    }

    // Aucune session trouvée
    set({ loading: false })
  },

  signUp: async (pseudo, email) => {
    localStorage.setItem(LS_PENDING_KEY, pseudo)
    const redirectTo = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: { pseudo },
        shouldCreateUser: true,
      },
    })
    if (error) {
      localStorage.removeItem(LS_PENDING_KEY)
      return { error: error.message }
    }
    set({ authStep: 'email_sent' })
    return { error: null }
  },

  signIn: async (email) => {
    const redirectTo = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
    if (error) return { error: error.message }
    set({ authStep: 'email_sent' })
    return { error: null }
  },

  signInPrototype: async (pseudo) => {
    set({ loading: true })
    // LS_PENDING_KEY lu par onAuthStateChange si le SIGNED_IN arrive avant setState
    localStorage.setItem(LS_PENDING_KEY, pseudo)

    // 1. Connexion avec le compte prototype partagé
    const { data, error } = await supabase.auth.signInWithPassword({
      email: PROTO_EMAIL, password: PROTO_PASSWORD,
    })

    if (error || !data.session?.user) {
      console.error('[auth] proto signInWithPassword failed:', error?.message ?? 'no session')
      localStorage.removeItem(LS_PENDING_KEY)
      set({ loading: false })
      return
    }

    // 2. userId réel depuis la session
    const userId = data.session.user.id

    // 3. Toujours écrire le pseudo courant (compte partagé — on écrase)
    await q('utilisateurs').upsert({ id: userId, pseudo }, { onConflict: 'id' })

    // 4. Persister la session prototype localement
    localStorage.setItem(
      LS_SESSION_KEY,
      JSON.stringify({ userId, pseudo, isPrototype: true } as ProtoSession),
    )
    localStorage.removeItem(LS_PENDING_KEY)

    // 5. Mettre à jour le store
    set({ userId, pseudo, loading: false, authStep: 'idle' })
  },

  signOut: async () => {
    localStorage.removeItem(LS_SESSION_KEY)
    localStorage.removeItem(LS_PENDING_KEY)
    await supabase.auth.signOut()
    set({ userId: null, pseudo: null, authStep: 'idle' })
  },
}))
