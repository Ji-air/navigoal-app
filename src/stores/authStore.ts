import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── Constants ───────────────────────────────────────────────────────────────

const LS_SESSION_KEY = 'ng_session'
const LS_PENDING_KEY = 'ng_pending_pseudo'

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
  /** Mode prototype : pseudo seul → session Supabase anonyme réelle */
  signInPrototype: (pseudo: string) => Promise<void>
  signOut:         () => Promise<void>
}

// ── Helper ───────────────────────────────────────────────────────────────────

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
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id
          let pseudo = await fetchPseudo(userId)

          if (!pseudo) {
            // Nouvel utilisateur — crée l'enregistrement public.utilisateurs
            const pending =
              localStorage.getItem(LS_PENDING_KEY) ??
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (session.user.user_metadata as any)?.pseudo ??
              session.user.email?.split('@')[0] ??
              'Capitaine'
            await upsertUtilisateur(userId, pending)
            localStorage.removeItem(LS_PENDING_KEY)
            pseudo = pending
          }

          set({ userId, pseudo, loading: false, authStep: 'idle' })
        }

        if (event === 'SIGNED_OUT') {
          set({ userId: null, pseudo: null, authStep: 'idle' })
        }
      })
    }

    // 1. Session Supabase Auth active ?
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const pseudo = await fetchPseudo(session.user.id)
      set({ userId: session.user.id, pseudo, loading: false })
      return
    }

    // 2. Session anonyme expirée — marqueur isPrototype présent dans localStorage
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as ProtoSession
        if (saved.isPrototype && saved.pseudo) {
          // Supabase n'a plus de session valide : créer une nouvelle session anonyme
          localStorage.setItem(LS_PENDING_KEY, saved.pseudo)
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
          if (!anonError && anonData.session?.user) {
            const userId = anonData.session.user.id
            localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ userId, pseudo: saved.pseudo, isPrototype: true }))
            // onAuthStateChange (SIGNED_IN) prend le relais : upsert + setState
            return
          }
          // signInAnonymously indisponible (désactivé dans le dashboard)
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
    // LS_PENDING_KEY est lu par onAuthStateChange pour upsert le pseudo correct
    localStorage.setItem(LS_PENDING_KEY, pseudo)

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.session?.user) {
      // Anonymous auth désactivé dans le Dashboard Supabase
      console.error('[auth] signInAnonymously failed:', error?.message)
      localStorage.removeItem(LS_PENDING_KEY)
      set({ loading: false })
      return
    }

    const userId = data.session.user.id
    // Persister le marqueur prototype avec le vrai userId Supabase
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ userId, pseudo, isPrototype: true } as ProtoSession))
    // onAuthStateChange (SIGNED_IN) prend le relais : fetchPseudo → upsert → setState
  },

  signOut: async () => {
    localStorage.removeItem(LS_SESSION_KEY)
    localStorage.removeItem(LS_PENDING_KEY)
    await supabase.auth.signOut()
    set({ userId: null, pseudo: null, authStep: 'idle' })
  },
}))
