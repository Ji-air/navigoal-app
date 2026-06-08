/**
 * Données de dev — fallback local quand Supabase est inaccessible (RLS, réseau, etc.)
 * Utilisées automatiquement par equipageStore et matchsStore si le fetch Supabase échoue.
 */

import type { JourneeNavigoal, Equipage, PosteReel } from '../lib/supabase'
import type { PosteKey, NationDispo } from '../stores/equipageStore'
import type { MatchAffiche } from '../stores/matchsStore'

// ─── IDs stables pour le dev ──────────────────────────────────────────────────

const J1 = 'mock-journee-j1'

const N = {
  mex: 'mock-nation-mex',
  rsa: 'mock-nation-rsa',
  usa: 'mock-nation-usa',
  can: 'mock-nation-can',
  mar: 'mock-nation-mar',
  por: 'mock-nation-por',
  esp: 'mock-nation-esp',
  uru: 'mock-nation-uru',
} as const

const M = {
  mexRsa: 'mock-match-mex-rsa',
  usaCan: 'mock-match-usa-can',
  marPor: 'mock-match-mar-por',
  espUru: 'mock-match-esp-uru',
} as const

// ─── Journée ──────────────────────────────────────────────────────────────────

export const MOCK_JOURNEE: JourneeNavigoal = {
  id:                      J1,
  numero:                  1,
  heure_premier_match_utc: '2026-06-11T18:00:00Z',
  heure_gel_utc:           '2026-06-11T17:45:00Z',
  statut_gel:              'ouvert',
}

// ─── Équipage vide (brouillon) ────────────────────────────────────────────────

export const MOCK_EQUIPAGE: Equipage = {
  id:              'mock-equipage-demo',
  utilisateur_id:  'demo-user',
  journee_id:      J1,
  cap_nation_id:   null,
  barre_nation_id: null,
  ancre_nation_id: null,
  vigie_nation_id: null,
  statut:          'brouillon',
}

// ─── Nations disponibles ──────────────────────────────────────────────────────

export const MOCK_NATIONS_DISPO: NationDispo[] = [
  { id: N.mex, nom: 'Mexique',       match_id: M.mexRsa, adversaire_id: N.rsa, palier: 'Breeze' },
  { id: N.rsa, nom: 'Afrique du Sud',match_id: M.mexRsa, adversaire_id: N.mex, palier: 'Wind'   },
  { id: N.usa, nom: 'USA',           match_id: M.usaCan, adversaire_id: N.can, palier: 'Wind'   },
  { id: N.can, nom: 'Canada',        match_id: M.usaCan, adversaire_id: N.usa, palier: 'Wind'   },
  { id: N.mar, nom: 'Maroc',         match_id: M.marPor, adversaire_id: N.por, palier: 'Wind'   },
  { id: N.por, nom: 'Portugal',      match_id: M.marPor, adversaire_id: N.mar, palier: 'Breeze' },
  { id: N.esp, nom: 'Espagne',       match_id: M.espUru, adversaire_id: N.uru, palier: 'Breeze' },
  { id: N.uru, nom: 'Uruguay',       match_id: M.espUru, adversaire_id: N.esp, palier: 'Boost'  },
]

// ─── Matchs ───────────────────────────────────────────────────────────────────

export const MOCK_MATCHS: MatchAffiche[] = [
  {
    id: M.mexRsa, nation_a_id: N.mex, nation_b_id: N.rsa,
    nation_a: { id: N.mex, nom: 'Mexique'        },
    nation_b: { id: N.rsa, nom: 'Afrique du Sud' },
    heure_coup_envoi_utc: '2026-06-11T18:00:00Z',
    statut: 'planifié', score_nation_a: null, score_nation_b: null,
    cotes: [
      { nation_id: N.mex, valeur: 1.75, palier: 'Breeze' },
      { nation_id: N.rsa, valeur: 5.00, palier: 'Wind'   },
    ],
  },
  {
    id: M.espUru, nation_a_id: N.esp, nation_b_id: N.uru,
    nation_a: { id: N.esp, nom: 'Espagne' },
    nation_b: { id: N.uru, nom: 'Uruguay' },
    heure_coup_envoi_utc: '2026-06-11T20:00:00Z',
    statut: 'planifié', score_nation_a: null, score_nation_b: null,
    cotes: [
      { nation_id: N.esp, valeur: 1.60, palier: 'Breeze' },
      { nation_id: N.uru, valeur: 5.50, palier: 'Boost'  },
    ],
  },
  {
    id: M.usaCan, nation_a_id: N.usa, nation_b_id: N.can,
    nation_a: { id: N.usa, nom: 'USA'    },
    nation_b: { id: N.can, nom: 'Canada' },
    heure_coup_envoi_utc: '2026-06-11T21:00:00Z',
    statut: 'planifié', score_nation_a: null, score_nation_b: null,
    cotes: [
      { nation_id: N.usa, valeur: 2.10, palier: 'Wind' },
      { nation_id: N.can, valeur: 3.40, palier: 'Wind' },
    ],
  },
  {
    id: M.marPor, nation_a_id: N.mar, nation_b_id: N.por,
    nation_a: { id: N.mar, nom: 'Maroc'    },
    nation_b: { id: N.por, nom: 'Portugal' },
    heure_coup_envoi_utc: '2026-06-12T00:00:00Z',
    statut: 'planifié', score_nation_a: null, score_nation_b: null,
    cotes: [
      { nation_id: N.mar, valeur: 3.80, palier: 'Wind'   },
      { nation_id: N.por, valeur: 1.80, palier: 'Breeze' },
    ],
  },
]

// ─── Joueurs mock (fallback local quand Supabase ne connaît pas les IDs mock) ─

type JoueurMock = { id: string; nom: string; poste_reel: PosteReel }

const MOCK_JOUEURS: Record<string, JoueurMock[]> = {
  [N.mex]: [
    { id: 'mj-mex-1',  nom: 'H. Lozano',     poste_reel: 'FWD' },
    { id: 'mj-mex-2',  nom: 'R. Jiménez',     poste_reel: 'FWD' },
    { id: 'mj-mex-3',  nom: 'A. Vega',        poste_reel: 'FWD' },
    { id: 'mj-mex-4',  nom: 'E. Álvarez',     poste_reel: 'MID' },
    { id: 'mj-mex-5',  nom: 'L. Romo',        poste_reel: 'MID' },
    { id: 'mj-mex-6',  nom: 'H. Herrera',     poste_reel: 'MID' },
    { id: 'mj-mex-7',  nom: 'C. Montes',      poste_reel: 'DEF' },
    { id: 'mj-mex-8',  nom: 'J. Vásquez',     poste_reel: 'DEF' },
    { id: 'mj-mex-9',  nom: 'N. Araujo',      poste_reel: 'DEF' },
    { id: 'mj-mex-10', nom: 'G. Ochoa',       poste_reel: 'GK'  },
    { id: 'mj-mex-11', nom: 'L. Malagón',     poste_reel: 'GK'  },
  ],
  [N.rsa]: [
    { id: 'mj-rsa-1',  nom: 'P. Zwane',       poste_reel: 'FWD' },
    { id: 'mj-rsa-2',  nom: 'K. Dolly',       poste_reel: 'FWD' },
    { id: 'mj-rsa-3',  nom: 'L. Mothiba',     poste_reel: 'FWD' },
    { id: 'mj-rsa-4',  nom: 'T. Mokoena',     poste_reel: 'MID' },
    { id: 'mj-rsa-5',  nom: 'P. Tau',         poste_reel: 'MID' },
    { id: 'mj-rsa-6',  nom: 'E. Zwane',       poste_reel: 'MID' },
    { id: 'mj-rsa-7',  nom: 'T. Hlatshwayo',  poste_reel: 'DEF' },
    { id: 'mj-rsa-8',  nom: 'S. Xulu',        poste_reel: 'DEF' },
    { id: 'mj-rsa-9',  nom: 'L. Mkhize',      poste_reel: 'DEF' },
    { id: 'mj-rsa-10', nom: 'R. Williams',    poste_reel: 'GK'  },
  ],
  [N.usa]: [
    { id: 'mj-usa-1',  nom: 'C. Pulisic',     poste_reel: 'FWD' },
    { id: 'mj-usa-2',  nom: 'T. Weah',        poste_reel: 'FWD' },
    { id: 'mj-usa-3',  nom: 'F. Ferreira',    poste_reel: 'FWD' },
    { id: 'mj-usa-4',  nom: 'W. McKennie',    poste_reel: 'MID' },
    { id: 'mj-usa-5',  nom: 'Y. Musah',       poste_reel: 'MID' },
    { id: 'mj-usa-6',  nom: 'G. Reyna',       poste_reel: 'MID' },
    { id: 'mj-usa-7',  nom: 'C. Richards',    poste_reel: 'DEF' },
    { id: 'mj-usa-8',  nom: 'W. Zimmermann',  poste_reel: 'DEF' },
    { id: 'mj-usa-9',  nom: 'T. Ream',        poste_reel: 'DEF' },
    { id: 'mj-usa-10', nom: 'M. Turner',      poste_reel: 'GK'  },
  ],
  [N.can]: [
    { id: 'mj-can-1',  nom: 'A. Davies',      poste_reel: 'FWD' },
    { id: 'mj-can-2',  nom: 'C. Larin',       poste_reel: 'FWD' },
    { id: 'mj-can-3',  nom: 'J. Buchanan',    poste_reel: 'FWD' },
    { id: 'mj-can-4',  nom: 'A. Hutchinson',  poste_reel: 'MID' },
    { id: 'mj-can-5',  nom: 'S. Eustáquio',   poste_reel: 'MID' },
    { id: 'mj-can-6',  nom: 'C. Henry',       poste_reel: 'MID' },
    { id: 'mj-can-7',  nom: 'K. Johnston',    poste_reel: 'DEF' },
    { id: 'mj-can-8',  nom: 'S. Vitória',     poste_reel: 'DEF' },
    { id: 'mj-can-9',  nom: 'S. Adekugbe',    poste_reel: 'DEF' },
    { id: 'mj-can-10', nom: 'M. Borjan',      poste_reel: 'GK'  },
  ],
  [N.mar]: [
    { id: 'mj-mar-1',  nom: "Y. En-Nesyri",  poste_reel: 'FWD' },
    { id: 'mj-mar-2',  nom: 'H. Ziyech',     poste_reel: 'FWD' },
    { id: 'mj-mar-3',  nom: 'S. Boufal',     poste_reel: 'FWD' },
    { id: 'mj-mar-4',  nom: 'A. Ounahi',     poste_reel: 'MID' },
    { id: 'mj-mar-5',  nom: 'S. Amallah',    poste_reel: 'MID' },
    { id: 'mj-mar-6',  nom: 'I. Benhaima',   poste_reel: 'MID' },
    { id: 'mj-mar-7',  nom: 'R. Saiss',      poste_reel: 'DEF' },
    { id: 'mj-mar-8',  nom: 'A. Hakimi',     poste_reel: 'DEF' },
    { id: 'mj-mar-9',  nom: 'N. Mazraoui',   poste_reel: 'DEF' },
    { id: 'mj-mar-10', nom: 'Y. Bounou',     poste_reel: 'GK'  },
  ],
  [N.por]: [
    { id: 'mj-por-1',  nom: 'C. Ronaldo',    poste_reel: 'FWD' },
    { id: 'mj-por-2',  nom: 'J. Félix',      poste_reel: 'FWD' },
    { id: 'mj-por-3',  nom: 'R. Leão',       poste_reel: 'FWD' },
    { id: 'mj-por-4',  nom: 'B. Silva',      poste_reel: 'MID' },
    { id: 'mj-por-5',  nom: 'Vitinha',       poste_reel: 'MID' },
    { id: 'mj-por-6',  nom: 'R. Neves',      poste_reel: 'MID' },
    { id: 'mj-por-7',  nom: 'R. Dias',       poste_reel: 'DEF' },
    { id: 'mj-por-8',  nom: 'Pepe',          poste_reel: 'DEF' },
    { id: 'mj-por-9',  nom: 'J. Cancelo',    poste_reel: 'DEF' },
    { id: 'mj-por-10', nom: 'D. Costa',      poste_reel: 'GK'  },
  ],
  [N.esp]: [
    { id: 'mj-esp-1',  nom: 'Á. Morata',     poste_reel: 'FWD' },
    { id: 'mj-esp-2',  nom: 'F. Torres',     poste_reel: 'FWD' },
    { id: 'mj-esp-3',  nom: 'M. Oyarzabal',  poste_reel: 'FWD' },
    { id: 'mj-esp-4',  nom: 'Pedri',         poste_reel: 'MID' },
    { id: 'mj-esp-5',  nom: 'Gavi',          poste_reel: 'MID' },
    { id: 'mj-esp-6',  nom: 'S. Busquets',   poste_reel: 'MID' },
    { id: 'mj-esp-7',  nom: 'P. Torres',     poste_reel: 'DEF' },
    { id: 'mj-esp-8',  nom: 'A. Laporte',    poste_reel: 'DEF' },
    { id: 'mj-esp-9',  nom: 'D. Carvajal',   poste_reel: 'DEF' },
    { id: 'mj-esp-10', nom: 'U. Simón',      poste_reel: 'GK'  },
  ],
  [N.uru]: [
    { id: 'mj-uru-1',  nom: 'L. Suárez',     poste_reel: 'FWD' },
    { id: 'mj-uru-2',  nom: 'E. Cavani',     poste_reel: 'FWD' },
    { id: 'mj-uru-3',  nom: 'D. Núñez',      poste_reel: 'FWD' },
    { id: 'mj-uru-4',  nom: 'F. Valverde',   poste_reel: 'MID' },
    { id: 'mj-uru-5',  nom: 'R. Bentancur',  poste_reel: 'MID' },
    { id: 'mj-uru-6',  nom: 'L. Torreira',   poste_reel: 'MID' },
    { id: 'mj-uru-7',  nom: 'D. Godín',      poste_reel: 'DEF' },
    { id: 'mj-uru-8',  nom: 'J. Giménez',    poste_reel: 'DEF' },
    { id: 'mj-uru-9',  nom: 'R. Araújo',     poste_reel: 'DEF' },
    { id: 'mj-uru-10', nom: 'F. Muslera',    poste_reel: 'GK'  },
  ],
}

const POSTE_KEY_TO_REEL: Record<PosteKey, PosteReel> = {
  cap: 'FWD', barre: 'MID', ancre: 'DEF', vigie: 'GK',
}

export function getMockJoueursLigne(nationId: string, poste: PosteKey): JoueurMock[] {
  const posteReel = POSTE_KEY_TO_REEL[poste]
  return (MOCK_JOUEURS[nationId] ?? []).filter(j => j.poste_reel === posteReel)
}
