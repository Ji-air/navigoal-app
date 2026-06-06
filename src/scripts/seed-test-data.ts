/**
 * Seed de données de test Navigoal — Journée 1 (CM2026, 11 juin)
 * Usage : npx tsx src/scripts/seed-test-data.ts [--reset]
 *
 * Ordre d'insertion (respect FK) :
 *   1. Nations
 *   2. JourneeNavigoal J1
 *   3. Matchs (API-Sports ou fallback statique)
 *   4. CotesMatch (API-Sports ou fallback)
 *   5. Joueurs (lineup API ou fallback statique)
 */

import { readFileSync } from 'node:fs'
import { resolve }      from 'node:path'
import axios            from 'axios'
import { createClient } from '@supabase/supabase-js'
import type { PalierType, PosteReel } from '../lib/supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────────────────────────

function loadEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    return Object.fromEntries(
      raw.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
    )
  } catch { return {} }
}

const env         = loadEnvLocal()
const API_KEY        = env.VITE_API_SPORTS_KEY ?? process.env.VITE_API_SPORTS_KEY ?? ''
const SB_URL         = env.VITE_SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL   ?? ''
const SB_ANON_KEY    = env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
// La clé service_role bypasse le RLS — nécessaire pour les scripts de seed
const SB_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!API_KEY) { console.error('❌  VITE_API_SPORTS_KEY manquant dans .env.local'); process.exit(1) }
if (!SB_URL || !SB_ANON_KEY) { console.error('❌  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants'); process.exit(1) }
if (!SB_SERVICE_KEY) {
  console.error(`
❌  SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local

    Le client anon est bloqué par le RLS pour les insertions.
    La clé service_role bypasse le RLS (usage dev/seed uniquement).

    1. Supabase Dashboard → Settings → API → "service_role" key
    2. Ajouter dans .env.local :
         SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
    3. Relancer : npx tsx src/scripts/seed-test-data.ts
`)
  process.exit(1)
}

const RESET = process.argv.includes('--reset')

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': API_KEY },
  timeout: 15_000,
})

// Client service_role — bypasse RLS pour le seed (ne jamais exposer côté client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = createClient(SB_URL, SB_SERVICE_KEY) as ReturnType<typeof createClient<any>>

// ─────────────────────────────────────────────────────────────────────────────
// TYPES LOCAUX
// ─────────────────────────────────────────────────────────────────────────────

interface ApiResponse<T> { response: T[]; errors: unknown }

interface ApiFixture {
  fixture: { id: number; date: string; timestamp: number }
  league:  { round: string }
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } }
}

interface ApiOddsItem {
  bookmakers: Array<{
    bets: Array<{ name: string; values: Array<{ value: string; odd: string }> }>
  }>
}

interface ApiLineupItem {
  team:      { id: number; name: string }
  startXI:   Array<{ player: { name: string; pos: string } }>
  substitutes: Array<{ player: { name: string; pos: string } }>
}

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES STATIQUES
// ─────────────────────────────────────────────────────────────────────────────

// Noms français des nations → nom API-Sports (pour le matching des fixtures)
// Inclut Afrique du Sud — vrai adversaire du Mexique au match d'ouverture CM2026
const NATIONS_J1 = [
  'Mexique', 'Afrique du Sud', 'USA', 'Canada', 'Maroc', 'Portugal', 'Espagne', 'Uruguay',
]

// Noms API-Sports → nom interne français
const API_NAME_TO_NOM: Record<string, string> = {
  'Mexico': 'Mexique',
  'South Africa': 'Afrique du Sud',
  'Ecuador': 'Équateur',
  'USA': 'USA',
  'United States': 'USA',
  'Canada': 'Canada',
  'Morocco': 'Maroc',
  'Portugal': 'Portugal',
  'Spain': 'Espagne',
  'Uruguay': 'Uruguay',
}

// Matchs fallback si l'API ne retourne pas tous les matchs du 11 juin
// Match 1 : ouverture officielle CM2026 (Mexico vs South Africa — Estadio Azteca)
const FALLBACK_FIXTURES = [
  { homeNom: 'Mexique',       awayNom: 'Afrique du Sud', heure: '2026-06-11T18:00:00Z', homeOdds: 1.75, awayOdds: 5.00 },
  { homeNom: 'USA',           awayNom: 'Canada',          heure: '2026-06-11T21:00:00Z', homeOdds: 2.10, awayOdds: 3.40 },
  { homeNom: 'Maroc',         awayNom: 'Portugal',        heure: '2026-06-12T00:00:00Z', homeOdds: 3.80, awayOdds: 1.80 },
  { homeNom: 'Espagne',       awayNom: 'Uruguay',         heure: '2026-06-11T20:00:00Z', homeOdds: 1.60, awayOdds: 5.50 },
]

// Joueurs statiques — fallback si lineups NS vides
type PosCode = 'GK' | 'DEF' | 'MID' | 'FWD'
const STATIC_JOUEURS: Record<string, Record<PosCode, string[]>> = {
  Mexique: {
    GK:  ['Guillermo Ochoa', 'Luis Malagón', 'Rodolfo Cota'],
    DEF: ['César Montes', 'Johan Vásquez', 'Jorge Sánchez', 'Néstor Araujo'],
    MID: ['Edson Álvarez', 'Luis Romo', 'Orbelín Pineda', 'Héctor Herrera'],
    FWD: ['Hirving Lozano', 'Raúl Jiménez', 'Alexis Vega', 'Roberto Alvarado'],
  },
  'Afrique du Sud': {
    GK:  ['Ronwen Williams', 'Bruce Bvuma', 'Veli Mothwa'],
    DEF: ['Siyanda Xulu', 'Rushine De Reuck', 'Lyle Foster', 'Reeve Frosler'],
    MID: ['Themba Zwane', 'Ethan Nclutch', 'Teboho Mokoena', 'Bongani Zungu'],
    FWD: ['Percy Tau', 'Lyle Foster', 'Bradley Grobler', 'Mhango'],
  },
  USA: {
    GK:  ['Matt Turner', 'Ethan Horvath', 'Patrick Schulte'],
    DEF: ['Sergino Dest', 'Walker Zimmermann', 'Miles Robinson', 'Tim Ream'],
    MID: ['Weston McKennie', 'Tyler Adams', 'Yunus Musah', 'Luca de la Torre'],
    FWD: ['Christian Pulisic', 'Ricardo Pepi', 'Josh Sargent', 'Folarin Balogun'],
  },
  Canada: {
    GK:  ['Milan Borjan', 'Maxime Crépeau', 'James Pantemis'],
    DEF: ['Alistair Johnston', 'Kamal Miller', 'Steven Vitória', 'Derek Cornelius'],
    MID: ['Atiba Hutchinson', 'Jonathan Osorio', 'Samuel Piette', 'Stephen Eustáquio'],
    FWD: ['Alphonso Davies', 'Jonathan David', 'Cyle Larin', 'Tajon Buchanan'],
  },
  Maroc: {
    GK:  ['Yassine Bounou', 'Anas Zniti', 'Ahmed Reda Tagnaouti'],
    DEF: ['Achraf Hakimi', 'Nayef Aguerd', 'Romain Saïss', 'Noussair Mazraoui'],
    MID: ['Sofyan Amrabat', 'Azzedine Ounahi', 'Selim Amallah', 'Ilias Chair'],
    FWD: ['Hakim Ziyech', 'Youssef En-Nesyri', 'Abderrazak Hamdallah', 'Soufiane Rahimi'],
  },
  Portugal: {
    GK:  ['Diogo Costa', 'Rui Patrício', 'José Sá'],
    DEF: ['Rúben Dias', 'João Cancelo', 'Nuno Mendes', 'Danilo Pereira'],
    MID: ['Bruno Fernandes', 'Bernardo Silva', 'Vitinha', 'João Palhinha'],
    FWD: ['Cristiano Ronaldo', 'Rafael Leão', 'João Félix', 'Gonçalo Ramos'],
  },
  Espagne: {
    GK:  ['Unai Simón', 'David Raya', 'Robert Sánchez'],
    DEF: ['Dani Carvajal', 'Aymeric Laporte', 'Pau Torres', 'José Luis Gayà'],
    MID: ['Pedri', 'Rodri', 'Gavi', 'Fabián Ruiz'],
    FWD: ['Álvaro Morata', 'Ferrán Torres', 'Dani Olmo', 'Marco Asensio'],
  },
  Uruguay: {
    GK:  ['Fernando Muslera', 'Sergio Rochet', 'Santiago Mele'],
    DEF: ['José María Giménez', 'Ronald Araújo', 'Nahitan Nández', 'Mathías Olivera'],
    MID: ['Federico Valverde', 'Rodrigo Bentancur', 'Matías Vecino', 'Manuel Ugarte'],
    FWD: ['Darwin Núñez', 'Luis Suárez', 'Edinson Cavani', 'Facundo Torres'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const HR  = '─'.repeat(60)
const sep = (t: string) => console.log(`\n${HR}\n  ${t}\n${HR}`)

function calcPalier(odds: number): PalierType {
  if (odds < 2.0)  return 'Breeze'
  if (odds <= 4.5) return 'Wind'
  return 'Boost'
}

function extractWinOdd(
  bets: ApiOddsItem['bookmakers'][0]['bets'],
  label: 'Home' | 'Away',
): number | null {
  const mw = bets.find(b => b.name === 'Match Winner' || b.name === 'Match Winner (Including Overtime)')
  const entry = mw?.values.find(v => v.value === label)
  const parsed = parseFloat(entry?.odd ?? '')
  return isNaN(parsed) ? null : parsed
}

function minus15min(iso: string): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - 15)
  return d.toISOString()
}

function posCodeToPosteReel(pos: string): PosteReel | null {
  switch (pos.toUpperCase()) {
    case 'G': return 'GK'
    case 'D': return 'DEF'
    case 'M': return 'MID'
    case 'F': return 'FWD'
    default:  return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 0 — RESET
// ─────────────────────────────────────────────────────────────────────────────

async function resetJ1(): Promise<void> {
  sep('0 — Reset J1 existant')

  // Trouver la journée J1
  const { data: journees } = await sb.from('journees_navigoal').select('id').eq('numero', 1)
  const journeeId = journees?.[0]?.id
  if (!journeeId) { console.log('  ℹ️  Aucune journée J1 à supprimer.'); return }

  // Matchs J1
  const { data: matchsJ1 } = await sb.from('matchs').select('id').eq('journee_id', journeeId)
  const matchIds = matchsJ1?.map(m => m.id) ?? []

  if (matchIds.length) {
    await sb.from('cotes_match').delete().in('match_id', matchIds)
    console.log('  ✅  cotes_match supprimées')
  }

  await sb.from('matchs').delete().eq('journee_id', journeeId)
  console.log('  ✅  matchs supprimés')

  await sb.from('journees_navigoal').delete().eq('id', journeeId)
  console.log('  ✅  journée J1 supprimée')

  // Joueurs des nations J1 (les nations resteront — on ne les supprime pas)
  const { data: nations } = await sb.from('nations').select('id').in('nom', NATIONS_J1)
  const nationIds = nations?.map(n => n.id) ?? []
  if (nationIds.length) {
    await sb.from('joueurs').delete().in('nation_id', nationIds)
    console.log('  ✅  joueurs supprimés')
    await sb.from('nations').delete().in('id', nationIds)
    console.log('  ✅  nations J1 supprimées')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — NATIONS
// ─────────────────────────────────────────────────────────────────────────────

async function seedNations(): Promise<Map<string, string>> {
  sep('1 — Nations')
  const nationMap = new Map<string, string>() // nom → id

  const rows = NATIONS_J1.map(nom => ({ nom }))
  const { data, error } = await sb.from('nations').insert(rows).select('id, nom')

  if (error) throw new Error(`Nations insert: ${error.message}`)
  for (const n of data ?? []) {
    nationMap.set(n.nom, n.id)
    console.log(`  ✅  ${n.nom.padEnd(12)} → ${n.id}`)
  }
  return nationMap
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — JOURNÉE J1
// ─────────────────────────────────────────────────────────────────────────────

async function seedJournee(heuresPremierMatch: string): Promise<string> {
  sep('2 — Journée J1')

  const gelUtc = minus15min(heuresPremierMatch)
  const { data, error } = await sb.from('journees_navigoal')
    .insert({
      numero: 1,
      heure_premier_match_utc: heuresPremierMatch,
      heure_gel_utc: gelUtc,
      statut_gel: 'ouvert',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Journée insert: ${error.message}`)

  console.log(`  ✅  journee_id  : ${data.id}`)
  console.log(`  ✅  premier match   : ${heuresPremierMatch}`)
  console.log(`  ✅  gel à           : ${gelUtc}`)
  return data.id
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — MATCHS (API + fallback)
// ─────────────────────────────────────────────────────────────────────────────

interface MatchSeed {
  homeNom:  string
  awayNom:  string
  heure:    string
  apiId:    number | null   // fixture_id API-Sports (pour récup odds)
  homeOdds: number | null
  awayOdds: number | null
}

async function discoverFixtures(): Promise<MatchSeed[]> {
  console.log('  📡 Recherche league World Cup (league=1, season=2026)…')

  let allFixtures: ApiFixture[] = []
  try {
    const res = await api.get<ApiResponse<ApiFixture>>('/fixtures?league=1&season=2026')
    allFixtures = res.data.response
  } catch (e) {
    console.log(`  ⚠️  Erreur API fixtures : ${(e as Error).message}`)
  }

  const june11 = allFixtures.filter(f => {
    // Couvrir les TZ — on compare la date UTC
    const dateUtc = new Date(f.fixture.date).toISOString().slice(0, 10)
    return dateUtc === '2026-06-11'
  })

  if (!june11.length) {
    console.log('  ⚠️  Aucun fixture API pour le 11 juin → fallback statique')
    return FALLBACK_FIXTURES.map(f => ({ ...f, apiId: null, homeOdds: f.homeOdds, awayOdds: f.awayOdds }))
  }

  console.log(`  ✅  ${june11.length} fixture(s) API trouvé(s) pour le 11 juin`)
  const seeds: MatchSeed[] = []

  for (const f of june11) {
    const homeNom = API_NAME_TO_NOM[f.teams.home.name]
    const awayNom = API_NAME_TO_NOM[f.teams.away.name]

    if (!homeNom || !awayNom) {
      console.log(`  ⚠️  Nation inconnue: "${f.teams.home.name}" vs "${f.teams.away.name}" — ignoré`)
      continue
    }

    // Essayer de récupérer les cotes
    let homeOdds: number | null = null
    let awayOdds: number | null = null

    try {
      const oddsRes = await api.get<ApiResponse<ApiOddsItem>>(`/odds?fixture=${f.fixture.id}`)
      const item = oddsRes.data.response[0]
      const bk   = item?.bookmakers[0]
      if (bk) {
        homeOdds = extractWinOdd(bk.bets, 'Home')
        awayOdds = extractWinOdd(bk.bets, 'Away')
      }
    } catch { /* cotes non dispo */ }

    if (!homeOdds || !awayOdds) {
      // Fallback odds depuis les données statiques si disponibles
      const fb = FALLBACK_FIXTURES.find(x => x.homeNom === homeNom && x.awayNom === awayNom)
      homeOdds = homeOdds ?? fb?.homeOdds ?? 2.0
      awayOdds = awayOdds ?? fb?.awayOdds ?? 2.0
      console.log(`  ℹ️  ${homeNom} vs ${awayNom} — cotes fallback (${homeOdds}/${awayOdds})`)
    } else {
      console.log(`  ✅  ${homeNom} vs ${awayNom} — cotes API (${homeOdds}/${awayOdds})`)
    }

    seeds.push({ homeNom, awayNom, heure: f.fixture.date, apiId: f.fixture.id, homeOdds, awayOdds })
  }

  return seeds.length ? seeds : FALLBACK_FIXTURES.map(f => ({ ...f, apiId: null }))
}

async function seedMatchs(
  seeds: MatchSeed[],
  nationMap: Map<string, string>,
  journeeId: string,
): Promise<Array<{ id: string; homeNom: string; awayNom: string; homeOdds: number; awayOdds: number }>> {
  sep('3 — Matchs')

  const rows = seeds
    .filter(s => nationMap.has(s.homeNom) && nationMap.has(s.awayNom))
    .map(s => ({
      nation_a_id:          nationMap.get(s.homeNom)!,
      nation_b_id:          nationMap.get(s.awayNom)!,
      phase:                'groupes' as const,
      date_utc:             new Date(s.heure).toISOString().slice(0, 10),
      heure_coup_envoi_utc: new Date(s.heure).toISOString(),
      statut:               'planifié' as const,
      journee_id:           journeeId,
    }))

  const { data, error } = await sb.from('matchs').insert(rows).select('id, nation_a_id, nation_b_id')
  if (error) throw new Error(`Matchs insert: ${error.message}`)

  const results = (data ?? []).map((m, i) => {
    const seed = seeds.find(
      s => nationMap.get(s.homeNom) === m.nation_a_id && nationMap.get(s.awayNom) === m.nation_b_id,
    ) ?? seeds[i]
    console.log(`  ✅  [${m.id.slice(0, 8)}…] ${seed?.homeNom ?? '?'} vs ${seed?.awayNom ?? '?'}`)
    return {
      id:       m.id,
      homeNom:  seed?.homeNom ?? '',
      awayNom:  seed?.awayNom ?? '',
      homeOdds: seed?.homeOdds ?? 2.0,
      awayOdds: seed?.awayOdds ?? 2.0,
    }
  })

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — COTES
// ─────────────────────────────────────────────────────────────────────────────

async function seedCotes(
  matchs: Array<{ id: string; homeNom: string; awayNom: string; homeOdds: number; awayOdds: number }>,
  nationMap: Map<string, string>,
  heure_gel_utc: string,
): Promise<void> {
  sep('4 — Cotes')

  const rows = matchs.flatMap(m => {
    const homeId = nationMap.get(m.homeNom)
    const awayId = nationMap.get(m.awayNom)
    if (!homeId || !awayId) return []

    return [
      {
        match_id:  m.id,
        nation_id: homeId,
        valeur:    m.homeOdds,
        palier:    calcPalier(m.homeOdds),
        gelee_a:   heure_gel_utc,
      },
      {
        match_id:  m.id,
        nation_id: awayId,
        valeur:    m.awayOdds,
        palier:    calcPalier(m.awayOdds),
        gelee_a:   heure_gel_utc,
      },
    ]
  })

  const { error } = await sb.from('cotes_match').insert(rows)
  if (error) throw new Error(`Cotes insert: ${error.message}`)

  for (const r of rows) {
    const nom = [...nationMap.entries()].find(([, id]) => id === r.nation_id)?.[0] ?? '?'
    console.log(`  ✅  ${nom.padEnd(12)} cote=${r.valeur.toFixed(2)} → palier=${r.palier}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 5 — JOUEURS (lineup API + fallback statique)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLineupByApiTeamName(
  seeds: MatchSeed[],
): Promise<Map<string, Array<{ nom: string; poste: PosteReel }>>> {
  // Retourne Map<nomInterne, joueurs[]>
  const result = new Map<string, Array<{ nom: string; poste: PosteReel }>>()

  for (const seed of seeds) {
    if (!seed.apiId) continue
    try {
      const res = await api.get<ApiResponse<ApiLineupItem>>(`/fixtures/lineups?fixture=${seed.apiId}`)
      const lineups = res.data.response

      for (const lu of lineups) {
        const nomInterne = API_NAME_TO_NOM[lu.team.name]
        if (!nomInterne) continue

        const joueurs: Array<{ nom: string; poste: PosteReel }> = []
        const allPlayers = [...lu.startXI, ...lu.substitutes]

        for (const { player } of allPlayers) {
          const poste = posCodeToPosteReel(player.pos)
          if (poste) joueurs.push({ nom: player.name, poste })
        }

        if (joueurs.length) result.set(nomInterne, joueurs)
      }
    } catch { /* lineup non dispo */ }
  }

  return result
}

async function seedJoueurs(
  nationMap: Map<string, string>,
  lineupMap: Map<string, Array<{ nom: string; poste: PosteReel }>>,
): Promise<void> {
  sep('5 — Joueurs')

  const rows: Array<{ nom: string; nation_id: string; poste_reel: PosteReel }> = []

  for (const nomNation of NATIONS_J1) {
    const nationId = nationMap.get(nomNation)
    if (!nationId) continue

    // Priorité : lineup API, fallback : données statiques
    const apiJoueurs = lineupMap.get(nomNation)
    const source = apiJoueurs?.length ? 'API' : 'statique'

    const joueurs = apiJoueurs?.length
      ? apiJoueurs
      : Object.entries(STATIC_JOUEURS[nomNation] ?? {}).flatMap(([pos, noms]) =>
          (noms as string[]).map(nom => ({ nom, poste: pos as PosteReel })),
        )

    for (const j of joueurs) {
      rows.push({ nom: j.nom, nation_id: nationId, poste_reel: j.poste })
    }

    console.log(`  ✅  ${nomNation.padEnd(12)} → ${joueurs.length} joueurs (${source})`)
  }

  const { error } = await sb.from('joueurs').insert(rows)
  if (error) throw new Error(`Joueurs insert: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉSUMÉ
// ─────────────────────────────────────────────────────────────────────────────

async function printSummary(nationMap: Map<string, string>, journeeId: string): Promise<void> {
  sep('RÉSUMÉ')

  const { count: nbMatchs }  = await sb.from('matchs').select('*', { count: 'exact', head: true }).eq('journee_id', journeeId)
  const { count: nbCotes }   = await sb.from('cotes_match').select('*', { count: 'exact', head: true })
  const nationIds = [...nationMap.values()]
  const { count: nbJoueurs } = await sb.from('joueurs').select('*', { count: 'exact', head: true }).in('nation_id', nationIds)

  console.log(`
  Nations  insérées : ${nationMap.size}
  Matchs   insérés  : ${nbMatchs ?? '?'}
  Cotes    insérées : ${nbCotes ?? '?'}
  Joueurs  insérés  : ${nbJoueurs ?? '?'}

  journee_id : ${journeeId}

  Tester dans l'app :
    → Tap sur un poste Équipage → nations s'affichent
    → Tap sur une nation → joueurs de la ligne apparaissent
    → Cotes au format "8nm / 22nm / 55nm" (texte neutre)
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚢  Navigoal — Seed données test J1')
  console.log(`    Supabase : ${SB_URL.slice(0, 30)}…`)
  console.log(`    API-Sports clé : ${API_KEY.slice(0, 6)}${'*'.repeat(Math.max(0, API_KEY.length - 6))}`)
  if (RESET) console.log('    Mode : --reset (suppression + re-seed)')

  // Vérifier si J1 existe déjà
  const { data: existing } = await sb.from('journees_navigoal').select('id').eq('numero', 1)
  if (existing?.length && !RESET) {
    console.error(`
❌  Journée J1 déjà présente (id: ${existing[0].id}).
    Pour re-seeder, relancer avec :
      npx tsx src/scripts/seed-test-data.ts --reset
`)
    process.exit(1)
  }

  if (RESET && existing?.length) await resetJ1()

  // ── 3 — Découvrir les fixtures (API ou fallback)
  sep('3 — Découverte des fixtures')
  const seeds = await discoverFixtures()
  console.log(`  → ${seeds.length} matchs à insérer`)

  // Heure premier match = la plus ancienne UTC parmi les seeds
  const heuresPremierMatch = [...seeds]
    .sort((a, b) => new Date(a.heure).getTime() - new Date(b.heure).getTime())[0].heure

  // ── 1 — Nations
  const nationMap = await seedNations()

  // ── 2 — Journée
  const journeeId = await seedJournee(heuresPremierMatch)

  // ── 3 — Matchs (on a déjà les seeds, on insère maintenant)
  const matchsInseres = await seedMatchs(seeds, nationMap, journeeId)

  // ── 4 — Cotes
  const { data: journeeRow } = await sb.from('journees_navigoal').select('heure_gel_utc').eq('id', journeeId).single()
  await seedCotes(matchsInseres, nationMap, journeeRow?.heure_gel_utc ?? minus15min(heuresPremierMatch))

  // ── 5 — Joueurs (essayer lineup API d'abord)
  sep('5 — Joueurs (tentative lineup API)')
  const lineupMap = await fetchLineupByApiTeamName(seeds)
  if (lineupMap.size === 0) console.log('  ℹ️  Lineups NS vides (attendu) → fallback statique')
  await seedJoueurs(nationMap, lineupMap)

  // ── Résumé
  await printSummary(nationMap, journeeId)
}

main().catch(err => {
  console.error('\n❌  Erreur fatale :',
    (err as { response?: { data?: unknown }; message?: string })?.response?.data
    ?? (err as Error)?.message
    ?? err,
  )
  process.exit(1)
})
