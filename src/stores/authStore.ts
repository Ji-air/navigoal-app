import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const PENDING_PSEUDO_KEY = 'navigoal_pending_pseudo'
const PROTO_SESSION_KEY  = 'navigoal_proto_session'

interface ProtoSession { userId: string; pseudo: string }

function loadProtoSession(): ProtoSession | null {
  try {
    const raw = localStorage.getItem(PROTO_SESSION_KEY)
    return raw ? (JSON.parse(raw) as ProtoSession) : null
  } catch { return null }
}

interface AuthStore {
  userId: string | null
  pseudo: string | null
  loading: boolean
  error: string | null
  modePrototype: boolean

  restoreSession: () => Promise<void>
  signUp: (pseudo: string, email: string) => Promise<boolean>
  signIn: (email: string) => Promise<boolean>
  signInPrototype: (pseudo: string) => void
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Résoudre la session Supabase → lire ou créer le profil utilisateur
  async function resolveSession(userId: string) {
    if (get().modePrototype) return

    const { data: row } = await supabase
      .from('utilisateurs')
      .select('id, pseudo')
      .eq('id', userId)
      .single()

    if (row) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ userId, pseudo: (row as any).pseudo as string, loading: false })
      return
    }

    // Premier login — créer le profil et le bateau
    const pendingPseudo = localStorage.getItem(PENDING_PSEUDO_KEY) ?? 'Capitaine'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { error: errUser } = await sb
      .from('utilisateurs')
      .insert({ id: userId, pseudo: pendingPseudo })
    if (!errUser) {
      await sb.from('bateaux').insert({ utilisateur_id: userId })
      localStorage.removeItem(PENDING_PSEUDO_KEY)
    }
    set({ userId, pseudo: pendingPseudo, loading: false })
  }

  // Écouter les changements de session (ex : clic sur le lien magique)
  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
      void resolveSession(session.user.id)
    } else if (event === 'SIGNED_OUT') {
      set({ userId: null, pseudo: null, loading: false })
    }
  })

  return {
    userId: null,
    pseudo: null,
    loading: true,
    error: null,
    modePrototype: false,

    restoreSession: async () => {
      const { modePrototype, userId } = get()
      console.log('restoreSession called, modePrototype:', modePrototype, 'userId:', userId)
      // 1. Mode prototype (session navigateur uniquement)
      const proto = loadProtoSession()
      if (proto) {
        set({ userId: proto.userId, pseudo: proto.pseudo, loading: false, modePrototype: true })
        return
      }
      // 2. Session Supabase — onAuthStateChange(INITIAL_SESSION) prend le relais
      const { data } = await supabase.auth.getSession()
      if (!data.session) set({ loading: false })
    },

    signUp: async (pseudo, email) => {
      set({ loading: true, error: null })
      // Stocker le pseudo pour l'associer au profil après clic sur le lien magique
      localStorage.setItem(PENDING_PSEUDO_KEY, pseudo.trim())
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      })
      if (error) { set({ loading: false, error: error.message }); return false }
      set({ loading: false })
      return true
    },

    signIn: async (email) => {
      set({ loading: true, error: null })
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      })
      if (error) { set({ loading: false, error: error.message }); return false }
      set({ loading: false })
      return true
    },

    signInPrototype: (pseudo) => {
      const userId = 'proto-' + Math.random().toString(36).slice(2, 10)
      const session: ProtoSession = { userId, pseudo: pseudo.trim() }
      localStorage.setItem(PROTO_SESSION_KEY, JSON.stringify(session))
      set({ userId, pseudo: pseudo.trim(), loading: false, modePrototype: true })
    },

    signOut: async () => {
      localStorage.removeItem(PROTO_SESSION_KEY)
      localStorage.removeItem(PENDING_PSEUDO_KEY)
      if (!get().modePrototype) await supabase.auth.signOut()
      set({ userId: null, pseudo: null, modePrototype: false, loading: false })
    },

    clearError: () => set({ error: null }),
  }
})
