import { createClient } from '@supabase/supabase-js'

// =========================================================
// CONFIGURATION
// Ajouter dans .env.local :
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon-key>
// =========================================================

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis dans .env.local')
}

// =========================================================
// TYPES ENUM — miroir des types PostgreSQL
// =========================================================

export type PosteReel    = 'GK' | 'DEF' | 'MID' | 'FWD'
export type MatchPhase   = 'groupes' | 'huitième' | 'quart' | 'demi' | 'troisième_place' | 'finale'
export type MatchStatut  = 'planifié' | 'en_cours' | 'terminé' | 'interrompu'
export type EvenementType = 'but' | 'assist' | 'pré_assist' | 'arrêt' | 'but_encaissé'
export type PhaseJeu     = 'temps_règlementaire' | 'prolongations' | 'tirs_au_but'
export type PalierType   = 'Breeze' | 'Wind' | 'Boost'
export type StatutGel    = 'ouvert' | 'gelé'
export type EquipageStatut = 'brouillon' | 'validé' | 'gelé'
export type ImpulsionType  = 'poste' | 'collectif'
export type ImpulsionPoste = 'Cap' | 'Barre' | 'Ancre' | 'Vigie'
export type NotificationType = 'rappel_gel'

// =========================================================
// TYPE DATABASE — schéma complet pour SupabaseClient<Database>
// =========================================================

export type Database = {
  public: {
    Tables: {

      nations: {
        Row:    { id: string; nom: string }
        Insert: { id?: string; nom: string }
        Update: { id?: string; nom?: string }
      }

      journees_navigoal: {
        Row: {
          id: string
          numero: number
          heure_premier_match_utc: string | null
          heure_gel_utc: string | null
          statut_gel: StatutGel
        }
        Insert: {
          id?: string
          numero: number
          heure_premier_match_utc?: string | null
          heure_gel_utc?: string | null
          statut_gel?: StatutGel
        }
        Update: {
          id?: string
          numero?: number
          heure_premier_match_utc?: string | null
          heure_gel_utc?: string | null
          statut_gel?: StatutGel
        }
      }

      joueurs: {
        Row:    { id: string; nom: string; nation_id: string; poste_reel: PosteReel }
        Insert: { id?: string; nom: string; nation_id: string; poste_reel: PosteReel }
        Update: { id?: string; nom?: string; nation_id?: string; poste_reel?: PosteReel }
      }

      matchs: {
        Row: {
          id: string
          nation_a_id: string
          nation_b_id: string
          phase: MatchPhase
          date_utc: string
          heure_coup_envoi_utc: string
          statut: MatchStatut
          score_nation_a: number | null
          score_nation_b: number | null
          vainqueur_tirs_au_but: string | null
          journee_id: string
        }
        Insert: {
          id?: string
          nation_a_id: string
          nation_b_id: string
          phase: MatchPhase
          date_utc: string
          heure_coup_envoi_utc: string
          statut?: MatchStatut
          score_nation_a?: number | null
          score_nation_b?: number | null
          vainqueur_tirs_au_but?: string | null
          journee_id: string
        }
        Update: {
          id?: string
          nation_a_id?: string
          nation_b_id?: string
          phase?: MatchPhase
          date_utc?: string
          heure_coup_envoi_utc?: string
          statut?: MatchStatut
          score_nation_a?: number | null
          score_nation_b?: number | null
          vainqueur_tirs_au_but?: string | null
          journee_id?: string
        }
      }

      evenements_match: {
        Row: {
          id: string
          match_id: string
          joueur_id: string
          type: EvenementType
          minute: number
          phase_jeu: PhaseJeu
          officiel: boolean
        }
        Insert: {
          id?: string
          match_id: string
          joueur_id: string
          type: EvenementType
          minute: number
          phase_jeu: PhaseJeu
          officiel?: boolean
        }
        Update: {
          id?: string
          match_id?: string
          joueur_id?: string
          type?: EvenementType
          minute?: number
          phase_jeu?: PhaseJeu
          officiel?: boolean
        }
      }

      cotes_match: {
        Row: {
          id: string
          match_id: string
          nation_id: string
          valeur: number
          palier: PalierType | null
          gelee_a: string | null
        }
        Insert: {
          id?: string
          match_id: string
          nation_id: string
          valeur: number
          palier?: PalierType | null
          gelee_a?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          nation_id?: string
          valeur?: number
          palier?: PalierType | null
          gelee_a?: string | null
        }
      }

      utilisateurs: {
        Row: {
          id: string
          pseudo: string
          identifiant_session: string | null
          date_inscription_utc: string
        }
        Insert: {
          id: string              // doit correspondre à auth.users.id
          pseudo: string
          identifiant_session?: string | null
          date_inscription_utc?: string
        }
        Update: {
          id?: string
          pseudo?: string         // immuable selon MODELE.md — à ne pas exposer côté client
          identifiant_session?: string | null
          date_inscription_utc?: string
        }
      }

      bateaux: {
        Row: {
          id: string
          utilisateur_id: string
          position_actuelle_nm: number
          canal: string | null
        }
        Insert: {
          id?: string
          utilisateur_id: string
          position_actuelle_nm?: number
          canal?: string | null
        }
        Update: {
          id?: string
          utilisateur_id?: string
          position_actuelle_nm?: number
          canal?: string | null
        }
      }

      ligues_privees: {
        Row: {
          id: string
          nom: string
          code_invitation: string
          createur_id: string
          date_creation_utc: string
        }
        Insert: {
          id?: string
          nom: string
          code_invitation: string
          createur_id: string
          date_creation_utc?: string
        }
        Update: {
          id?: string
          nom?: string
          code_invitation?: string
          createur_id?: string
          date_creation_utc?: string
        }
      }

      membres_ligue: {
        Row: {
          id: string
          ligue_id: string
          utilisateur_id: string
          date_adhesion_utc: string
        }
        Insert: {
          id?: string
          ligue_id: string
          utilisateur_id: string
          date_adhesion_utc?: string
        }
        Update: {
          id?: string
          ligue_id?: string
          utilisateur_id?: string
          date_adhesion_utc?: string
        }
      }

      equipages: {
        Row: {
          id: string
          utilisateur_id: string
          journee_id: string
          cap_nation_id: string | null
          barre_nation_id: string | null
          ancre_nation_id: string | null
          vigie_nation_id: string | null
          statut: EquipageStatut
        }
        Insert: {
          id?: string
          utilisateur_id: string
          journee_id: string
          cap_nation_id?: string | null
          barre_nation_id?: string | null
          ancre_nation_id?: string | null
          vigie_nation_id?: string | null
          statut?: EquipageStatut
        }
        Update: {
          id?: string
          utilisateur_id?: string
          journee_id?: string
          cap_nation_id?: string | null
          barre_nation_id?: string | null
          ancre_nation_id?: string | null
          vigie_nation_id?: string | null
          statut?: EquipageStatut
        }
      }

      impulsions: {
        Row: {
          id: string
          equipage_id: string
          journee_id: string
          type: ImpulsionType
          poste: ImpulsionPoste | null
          valeur_nm: number
          source_evenement_id: string | null
          source_match_id: string | null
          joueur_declencheur_id: string | null
        }
        Insert: {
          id?: string
          equipage_id: string
          journee_id: string
          type: ImpulsionType
          poste?: ImpulsionPoste | null
          valeur_nm: number
          source_evenement_id?: string | null
          source_match_id?: string | null
          joueur_declencheur_id?: string | null
        }
        Update: {
          id?: string
          equipage_id?: string
          journee_id?: string
          type?: ImpulsionType
          poste?: ImpulsionPoste | null
          valeur_nm?: number
          source_evenement_id?: string | null
          source_match_id?: string | null
          joueur_declencheur_id?: string | null
        }
      }

      scores_journee: {
        Row: {
          id: string
          equipage_id: string
          journee_id: string
          total_nm: number
          calcule_a: string
        }
        Insert: {
          id?: string
          equipage_id: string
          journee_id: string
          total_nm?: number
          calcule_a?: string
        }
        Update: {
          id?: string
          equipage_id?: string
          journee_id?: string
          total_nm?: number
          calcule_a?: string
        }
      }

      classements_ligue: {
        Row: {
          id: string
          ligue_id: string
          utilisateur_id: string
          journee_id: string
          rang: number
          ecart_precedent_nm: number | null
          ecart_suivant_nm: number | null
          mis_a_jour_a: string
        }
        Insert: {
          id?: string
          ligue_id: string
          utilisateur_id: string
          journee_id: string
          rang: number
          ecart_precedent_nm?: number | null
          ecart_suivant_nm?: number | null
          mis_a_jour_a?: string
        }
        Update: {
          id?: string
          ligue_id?: string
          utilisateur_id?: string
          journee_id?: string
          rang?: number
          ecart_precedent_nm?: number | null
          ecart_suivant_nm?: number | null
          mis_a_jour_a?: string
        }
      }

      classements_globaux: {
        Row: {
          id: string
          utilisateur_id: string
          journee_id: string
          rang: number
          cohorte: string
          mis_a_jour_a: string
        }
        Insert: {
          id?: string
          utilisateur_id: string
          journee_id: string
          rang: number
          cohorte: string
          mis_a_jour_a?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string
          journee_id?: string
          rang?: number
          cohorte?: string
          mis_a_jour_a?: string
        }
      }

      notifications_envoyees: {
        Row: {
          id: string
          utilisateur_id: string
          journee_id: string
          type: NotificationType
          envoyee_a: string
        }
        Insert: {
          id?: string
          utilisateur_id: string
          journee_id: string
          type: NotificationType
          envoyee_a?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string
          journee_id?: string
          type?: NotificationType
          envoyee_a?: string
        }
      }
    }

    Enums: {
      poste_reel_type:         PosteReel
      match_phase_type:        MatchPhase
      match_statut_type:       MatchStatut
      evenement_type:          EvenementType
      phase_jeu_type:          PhaseJeu
      palier_type:             PalierType
      journee_statut_gel_type: StatutGel
      equipage_statut_type:    EquipageStatut
      impulsion_type:          ImpulsionType
      impulsion_poste_type:    ImpulsionPoste
      notification_type:       NotificationType
    }
  }
}

// =========================================================
// CLIENT SUPABASE TYPÉ
// =========================================================

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Raccourcis vers les tables les plus utilisées
export const db = {
  nations:           () => supabase.from('nations'),
  journees:          () => supabase.from('journees_navigoal'),
  joueurs:           () => supabase.from('joueurs'),
  matchs:            () => supabase.from('matchs'),
  evenements:        () => supabase.from('evenements_match'),
  cotes:             () => supabase.from('cotes_match'),
  utilisateurs:      () => supabase.from('utilisateurs'),
  bateaux:           () => supabase.from('bateaux'),
  ligues:            () => supabase.from('ligues_privees'),
  membres:           () => supabase.from('membres_ligue'),
  equipages:         () => supabase.from('equipages'),
  impulsions:        () => supabase.from('impulsions'),
  scores:            () => supabase.from('scores_journee'),
  classementsLigue:  () => supabase.from('classements_ligue'),
  classementsGlobal: () => supabase.from('classements_globaux'),
  notifications:     () => supabase.from('notifications_envoyees'),
} as const

// =========================================================
// TYPES ROW — pour typer les retours de requête sans répétition
// =========================================================

type Tables = Database['public']['Tables']

export type Nation             = Tables['nations']['Row']
export type JourneeNavigoal    = Tables['journees_navigoal']['Row']
export type Joueur             = Tables['joueurs']['Row']
export type Match              = Tables['matchs']['Row']
export type EvenementMatch     = Tables['evenements_match']['Row']
export type CoteMatch          = Tables['cotes_match']['Row']
export type Utilisateur        = Tables['utilisateurs']['Row']
export type Bateau             = Tables['bateaux']['Row']
export type LiguePrive         = Tables['ligues_privees']['Row']
export type MembreLigue        = Tables['membres_ligue']['Row']
export type Equipage           = Tables['equipages']['Row']
export type Impulsion          = Tables['impulsions']['Row']
export type ScoreJournee       = Tables['scores_journee']['Row']
export type ClassementLigue    = Tables['classements_ligue']['Row']
export type ClassementGlobal   = Tables['classements_globaux']['Row']
export type NotificationEnvoyee = Tables['notifications_envoyees']['Row']

// =========================================================
// FONCTIONS UTILITAIRES
// =========================================================

/** Récupère la journée courante (statut_gel = ouvert, numero le plus bas). */
export async function fetchJourneeCourante(): Promise<{ data: JourneeNavigoal | null; error: string | null }> {
  const { data, error } = await db.journees()
    .select('*')
    .eq('statut_gel', 'ouvert')
    .order('numero', { ascending: true })
    .limit(1)
    .single()
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Récupère l'équipage d'un utilisateur pour une journée donnée. */
export async function fetchEquipage(
  utilisateurId: string,
  journeeId: string,
): Promise<Equipage | null> {
  const { data, error } = await db.equipages()
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .eq('journee_id', journeeId)
    .single()
  if (error) return null
  return data
}

/** Récupère les matchs d'une journée avec les nations. */
export async function fetchMatchsJournee(journeeId: string) {
  return db.matchs()
    .select(`
      *,
      nation_a:nations!matchs_nation_a_id_fkey ( id, nom ),
      nation_b:nations!matchs_nation_b_id_fkey ( id, nom ),
      cotes:cotes_match ( nation_id, valeur, palier )
    `)
    .eq('journee_id', journeeId)
    .order('heure_coup_envoi_utc', { ascending: true })
}

/** Récupère les membres et leur bateau pour un classement de ligue. */
export async function fetchClassementLigue(ligueId: string, journeeId: string) {
  return db.classementsLigue()
    .select(`
      *,
      utilisateur:utilisateurs ( id, pseudo ),
      bateau:bateaux!inner ( position_actuelle_nm )
    `)
    .eq('ligue_id', ligueId)
    .eq('journee_id', journeeId)
    .order('rang', { ascending: true })
}

/** Récupère les impulsions d'un équipage pour une journée. */
export async function fetchImpulsions(equipageId: string, journeeId: string) {
  return db.impulsions()
    .select(`
      *,
      joueur_declencheur:joueurs ( id, nom, poste_reel )
    `)
    .eq('equipage_id', equipageId)
    .eq('journee_id', journeeId)
    .order('poste', { ascending: true })
}

/** Récupère les joueurs de la ligne correspondant au poste Navigoal pour une nation. */
const POSTE_TO_REEL: Record<'cap' | 'barre' | 'ancre' | 'vigie', PosteReel> = {
  cap: 'FWD', barre: 'MID', ancre: 'DEF', vigie: 'GK',
}

export async function fetchJoueursLigne(
  nationId: string,
  poste: 'cap' | 'barre' | 'ancre' | 'vigie',
): Promise<Pick<Joueur, 'id' | 'nom' | 'poste_reel'>[]> {
  const posteReel = POSTE_TO_REEL[poste]
  const { data, error } = await db.joueurs()
    .select('id, nom, poste_reel')
    .eq('nation_id', nationId)
    .eq('poste_reel', posteReel)
    .order('nom', { ascending: true })
  if (error) return []
  return data ?? []
}
