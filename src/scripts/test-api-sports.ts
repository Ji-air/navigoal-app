/**
 * Script de validation API-Sports → Navigoal
 * Usage : npx tsx src/scripts/test-api-sports.ts
 *
 * SECTION A — CM2026  : fixtures NS (planifiés) → odds + lineups
 * SECTION B — Saves   : match terminé Copa América → fetchPlayerStats
 */

import { readFileSync } from 'fs'
import { resolve }      from 'path'
import axios            from 'axios'
import {
  mapPosteToNavigoal,
  mapOddsToPalier,
  extractWinOdd,
  isButOfficiel,
} from '../lib/api-sports-mapper.js'
import type {
  ApiFixtureItem,
  ApiLineupItem,
  ApiEventItem,
  ApiStatisticsItem,
  ApiOddsItem,
  ApiLeagueItem,
  ApiPlayerStatsItem,
  ApiResponse,
} from '../lib/api-sports.js'

// ─────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────

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

const env    = loadEnvLocal()
const API_KEY = env.VITE_API_SPORTS_KEY ?? process.env.VITE_API_SPORTS_KEY ?? ''
if (!API_KEY) { console.error('❌  VITE_API_SPORTS_KEY manquant dans .env.local'); process.exit(1) }

// ─────────────────────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': API_KEY },
  timeout: 15_000,
})

async function get<T>(path: string): Promise<{ data: T[]; errors: Record<string, string> }> {
  const res = await client.get<ApiResponse<T>>(path)
  const errors = (res.data.errors && !Array.isArray(res.data.errors))
    ? res.data.errors as Record<string, string>
    : {}
  return { data: res.data.response, errors }
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const HR  = '─'.repeat(62)
const sep = (t: string) => console.log(`\n${HR}\n  ${t}\n${HR}`)
const ok  = (l: string, v: unknown) => console.log(`  ✅  ${l} :`, v)
const warn = (l: string, v: unknown) => console.log(`  ⚠️   ${l} :`, v)
const info = (l: string, v: unknown) => console.log(`  ℹ️   ${l} :`, v)

// ═════════════════════════════════════════════════════════
// SECTION A — CM2026
// ═════════════════════════════════════════════════════════

// ─── A1 : League ─────────────────────────────────────────

async function a1_league(): Promise<number | null> {
  sep('A1 — Ligue FIFA World Cup')

  const { data: leagues, errors } = await get<ApiLeagueItem>('/leagues?name=World+Cup&type=Cup')

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return null }
  if (!leagues.length) { warn('Aucune ligue trouvée', ''); return null }

  for (const l of leagues) {
    const cur = l.seasons.find(s => s.current)
    console.log(`  ${l.league.name} (ID ${l.league.id}) — ${l.country.name}`)
    console.log(`    Saisons : ${l.seasons.map(s => s.year).join(', ')}`)
    if (cur) console.log(`    Saison courante : ${cur.year}  ${cur.start} → ${cur.end}`)
  }

  const wc = leagues.find(l => l.country.name === 'World')
  if (wc) { ok('ID confirmé', `league=${wc.league.id}`); return wc.league.id }

  warn('FIFA World Cup (World) introuvable', leagues.map(l => `${l.league.id}:${l.league.name}`))
  return null
}

// ─── A2 : Fixtures CM2026 ────────────────────────────────

async function a2_fixtures(leagueId: number): Promise<ApiFixtureItem[]> {
  sep(`A2 — Fixtures CM2026  (league=${leagueId}, season=2026)`)

  const { data: all, errors } = await get<ApiFixtureItem>(
    `/fixtures?league=${leagueId}&season=2026`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return [] }

  ok('Total fixtures', all.length)
  if (!all.length) { warn('Aucun fixture retourné', ''); return [] }

  // Répartition par statut
  const byStatus: Record<string, number> = {}
  for (const f of all) byStatus[f.fixture.status.short] = (byStatus[f.fixture.status.short] ?? 0) + 1
  info('Par statut', byStatus)

  // Répartition par date (uniquement premiers jours)
  const byDate: Record<string, number> = {}
  for (const f of all) {
    const d = f.fixture.date.slice(0, 10)
    byDate[d] = (byDate[d] ?? 0) + 1
  }
  const dates = Object.keys(byDate).sort().slice(0, 5)
  info('Premiers jours', Object.fromEntries(dates.map(d => [d, byDate[d]])))

  // Matchs du 11 juin (jour 1)
  const june11 = all.filter(f => f.fixture.date.startsWith('2026-06-11'))
  console.log(`\n  Matchs du 11 juin (${june11.length}) :`)
  for (const f of june11) {
    console.log(
      `    [${f.fixture.id}] ${f.teams.home.name} vs ${f.teams.away.name}`,
      `| ${f.fixture.status.short} | ${f.league.round}`,
    )
  }

  return all
}

// ─── A3 : Odds sur fixture NS ────────────────────────────

async function a3_odds(fixture: ApiFixtureItem): Promise<void> {
  sep(`A3 — Cotes  [${fixture.fixture.id}] ${fixture.teams.home.name} vs ${fixture.teams.away.name}`)
  info('Statut', `${fixture.fixture.status.short} | ${fixture.fixture.date.slice(0, 10)}`)

  const { data: oddsData, errors } = await get<ApiOddsItem>(
    `/odds?fixture=${fixture.fixture.id}`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return }

  if (!oddsData.length) {
    warn('Aucune cote disponible', '(cotes pas encore publiées ou endpoint non couvert par le plan)')
    return
  }

  const item = oddsData[0]
  ok('Bookmakers disponibles', item.bookmakers.length)
  info('Mise à jour cotes', item.update)

  for (const bk of item.bookmakers.slice(0, 3)) {
    console.log(`\n  Bookmaker : ${bk.name}`)
    const homeOdd = extractWinOdd(bk.bets, 'Home')
    const awayOdd = extractWinOdd(bk.bets, 'Away')

    if (homeOdd !== null) {
      const palier = mapOddsToPalier(homeOdd)
      console.log(`    Home (${fixture.teams.home.name}) : cote=${homeOdd.toFixed(2)} → palier=${palier}`)
    } else warn('  Cote Home absente dans Match Winner', '')

    if (awayOdd !== null) {
      const palier = mapOddsToPalier(awayOdd)
      console.log(`    Away (${fixture.teams.away.name}) : cote=${awayOdd.toFixed(2)} → palier=${palier}`)
    } else warn('  Cote Away absente dans Match Winner', '')
  }

  // Marchés disponibles (premier bookmaker)
  const bk0 = item.bookmakers[0]
  if (bk0) {
    console.log(`\n  Marchés disponibles (${bk0.name}) :`)
    for (const b of bk0.bets) console.log(`    • ${b.name}`)
  }
}

// ─── A4 : Lineups sur fixture NS ─────────────────────────

async function a4_lineups_ns(fixture: ApiFixtureItem): Promise<void> {
  sep(`A4 — Lineups NS  [${fixture.fixture.id}]  (comportement attendu : vide)`)
  info('Statut fixture', fixture.fixture.status.short)

  const { data: lineups, errors } = await get<ApiLineupItem>(
    `/fixtures/lineups?fixture=${fixture.fixture.id}`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return }

  if (!lineups.length) {
    ok('Réponse vide confirmée', 'Lineups non disponibles avant le match — comportement normal')
    info('À retester', 'Environ 1h avant le coup d\'envoi')
    return
  }

  // Si disponibles malgré NS (prédictions publiées à l'avance)
  warn('Lineups présents sur match NS', '(données prévisionnelles ou erreur de statut API)')
  for (const l of lineups) {
    console.log(`  ${l.team.name} — Formation : ${l.formation}`)
    for (const { player } of l.startXI) {
      console.log(`    [${player.pos}] → ${mapPosteToNavigoal(player.pos) ?? '❌'} | ${player.name}`)
    }
  }
}

// ─── A5 : Events + Statistics sur fixture NS ─────────────

async function a5_events_stats_ns(fixture: ApiFixtureItem): Promise<void> {
  sep(`A5 — Events + Stats NS  [${fixture.fixture.id}]  (comportement attendu : vide)`)

  const { data: events } = await get<ApiEventItem>(
    `/fixtures/events?fixture=${fixture.fixture.id}`,
  )
  const { data: stats } = await get<ApiStatisticsItem>(
    `/fixtures/statistics?fixture=${fixture.fixture.id}`,
  )

  if (!events.length) ok('Events vide', 'Normal pour un match planifié (NS)')
  else warn('Events non vide sur NS', `${events.length} événements présents`)

  if (!stats.length) ok('Stats vides', 'Normal pour un match planifié (NS)')
  else warn('Stats non vides sur NS', `${stats.length} équipes avec stats`)
}

// ═════════════════════════════════════════════════════════
// SECTION B — Saves Vigie (Copa América 2024 terminé)
// ═════════════════════════════════════════════════════════

// ─── B1 : Trouver un match terminé Copa América ──────────

async function b1_findCompletedFixture(): Promise<ApiFixtureItem | null> {
  sep('B1 — Recherche match terminé (Copa América 2024) pour test Saves')

  const { data: fixtures, errors } = await get<ApiFixtureItem>(
    '/fixtures?league=9&season=2024&status=FT-AET-PEN',
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return null }
  if (!fixtures.length) { warn('Aucun match terminé trouvé en Copa América 2024', ''); return null }

  // Trier par date décroissante — finale en premier
  const sorted = [...fixtures].sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
  const pick   = sorted[0]

  ok('Match sélectionné', `[${pick.fixture.id}] ${pick.teams.home.name} vs ${pick.teams.away.name}`)
  info('Date / statut', `${pick.fixture.date.slice(0, 10)} | ${pick.fixture.status.short}`)
  info('Score', `${pick.goals.home} - ${pick.goals.away}`)
  if (pick.score.penalty.home !== null) {
    info('Score TAB', `${pick.score.penalty.home} - ${pick.score.penalty.away}`)
  }

  return pick
}

// ─── B2 : Events sur match terminé ──────────────────────

async function b2_events(fixture: ApiFixtureItem): Promise<void> {
  sep(`B2 — Events  [${fixture.fixture.id}] ${fixture.teams.home.name} vs ${fixture.teams.away.name}`)

  const { data: events, errors } = await get<ApiEventItem>(
    `/fixtures/events?fixture=${fixture.fixture.id}`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return }
  if (!events.length) { warn('Aucun événement', ''); return }

  ok('Total événements', events.length)

  const goals   = events.filter(e => e.type === 'Goal')
  const cards   = events.filter(e => e.type === 'Card')
  const varEvts = events.filter(e => e.type === 'Var')
  const subst   = events.filter(e => e.type === 'subst')

  info('Buts', goals.length)
  info('Cartons', cards.length)
  info('VAR', varEvts.length)
  info('Remplacements', subst.length)

  console.log('\n  Détail des buts :')
  for (const g of goals) {
    console.log(
      `    ${String(g.time.elapsed).padStart(3)}'${g.time.extra ? `+${g.time.extra}` : '  '}`,
      `| ${(g.player.name ?? '?').padEnd(22)}`,
      `(${g.team.name})`,
      `| "${g.detail}"`,
      `| officiel=${isButOfficiel(g) ? '✅' : '❌'}`,
    )
    if (g.assist.name) console.log(`         Assist : ${g.assist.name}`)
  }

  if (varEvts.length) {
    console.log('\n  Événements VAR :')
    for (const v of varEvts) console.log(`    ${v.time.elapsed}' | ${v.detail} | ${v.team.name}`)
  }

  // Audit mapper : tous les types rencontrés
  const types = [...new Set(events.map(e => `${e.type}::${e.detail}`))]
  console.log('\n  Types d\'événements (audit mapper) :')
  for (const t of types) console.log(`    ${t}`)
}

// ─── B3 : Player stats → Saves Vigie ─────────────────────

async function b3_playerStats(fixture: ApiFixtureItem): Promise<void> {
  sep(`B3 — Player Stats / Saves  [${fixture.fixture.id}]`)
  info('Endpoint', '/fixtures/players?fixture=')

  const { data: teams, errors } = await get<ApiPlayerStatsItem>(
    `/fixtures/players?fixture=${fixture.fixture.id}`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return }
  if (!teams.length) { warn('Aucune donnée joueur', ''); return }

  ok('Équipes retournées', teams.map(t => t.team.name))

  for (const team of teams) {
    console.log(`\n  🟦 ${team.team.name}`)

    for (const { player, statistics } of team.players) {
      const s    = statistics[0]
      if (!s) continue
      const pos  = s.games.position
      const nav  = mapPosteToNavigoal(pos)
      const mins = s.games.minutes ?? 0

      // Gardiens : afficher saves
      if (pos === 'G') {
        const saves = s.goals.saves
        console.log(
          `    [G→vigie] ${player.name.padEnd(24)}`,
          `| ${mins}'`,
          `| saves=${saves ?? 'null'}`,
          `| conceded=${s.goals.conceded ?? 'null'}`,
          `| rating=${s.games.rating ?? '?'}`,
        )
        if (saves !== null && saves !== undefined) {
          ok(`"saves" disponible pour ${player.name}`, saves)
        } else {
          warn(`"saves" null pour ${player.name}`, 'vérifier si gardien titulaire ou remplaçant non entré')
        }
      }

      // Attaquants : afficher goals + assists (Cap — R2 B1 FWD)
      if (pos === 'F') {
        console.log(
          `    [F→cap]   ${player.name.padEnd(24)}`,
          `| ${mins}'`,
          `| goals=${s.goals.total ?? 0}`,
          `| assists=${s.goals.assists ?? 0}`,
          `| shots.on=${s.shots.on ?? 0}`,
          `| rating=${s.games.rating ?? '?'}`,
        )
      }

      // Midfielders : assists + passes clés (Barre)
      if (pos === 'M') {
        console.log(
          `    [M→barre] ${player.name.padEnd(24)}`,
          `| ${mins}'`,
          `| assists=${s.goals.assists ?? 0}`,
          `| key_passes=${s.passes.key ?? 0}`,
          `| rating=${s.games.rating ?? '?'}`,
        )
      }

      // Défenseurs : interceptions + tackles (Ancre)
      if (pos === 'D') {
        console.log(
          `    [D→ancre] ${player.name.padEnd(24)}`,
          `| ${mins}'`,
          `| tackles=${s.tackles.total ?? 0}`,
          `| interceptions=${s.tackles.interceptions ?? 0}`,
          `| rating=${s.games.rating ?? '?'}`,
        )
      }

      // Postes inconnus
      if (nav === null) warn(`Position inconnue pour ${player.name}`, pos)
    }
  }

  // Vérification globale Saves
  const allGoalkeepers = teams
    .flatMap(t => t.players)
    .filter(p => p.statistics[0]?.games.position === 'G')

  const withSaves    = allGoalkeepers.filter(p => (p.statistics[0]?.goals.saves ?? null) !== null)
  const withoutSaves = allGoalkeepers.filter(p => (p.statistics[0]?.goals.saves ?? null) === null)

  console.log('\n  Bilan Saves :')
  ok('Gardiens avec saves renseignés', withSaves.map(p => p.player.name))
  if (withoutSaves.length) info('Gardiens sans saves (remplaçants ?)', withoutSaves.map(p => p.player.name))
}

// ─── B4 : Statistics équipe (arrêts niveau équipe) ───────

async function b4_statistics(fixture: ApiFixtureItem): Promise<void> {
  sep(`B4 — Statistics équipe  [${fixture.fixture.id}]`)
  info('Endpoint', '/fixtures/statistics?fixture=')

  const { data: stats, errors } = await get<ApiStatisticsItem>(
    `/fixtures/statistics?fixture=${fixture.fixture.id}`,
  )

  if (Object.keys(errors).length) { warn('Erreurs API', errors); return }
  if (!stats.length) { warn('Aucune statistique', ''); return }

  for (const team of stats) {
    console.log(`\n  ${team.team.name}`)
    for (const s of team.statistics) {
      if (s.value !== null) console.log(`    ${s.type.padEnd(35)} : ${s.value}`)
    }
  }

  // API-Sports nomme la stat "Goalkeeper Saves" (pas "Saves") dans cet endpoint
  const hasSaves = stats.some(t => t.statistics.some(s =>
    s.type === 'Goalkeeper Saves' || s.type === 'Saves',
  ))
  if (hasSaves) ok('"Goalkeeper Saves" présent dans /fixtures/statistics', '✓ utilisable pour niveau équipe')
  else warn('"Goalkeeper Saves" absent', '→ utiliser /fixtures/players → goals.saves pour le gardien titulaire')
}

// ═════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════

async function main() {
  console.log('🚢  Navigoal — Validation API-Sports')
  console.log(`    Plan upgradé — accès CM2026 attendu`)
  console.log(`    Clé : ${API_KEY.slice(0, 6)}${'*'.repeat(Math.max(0, API_KEY.length - 6))}`)

  // ── SECTION A : CM2026 ─────────────────────────────────

  const leagueId = await a1_league()
  if (!leagueId) { console.error('\n❌ Ligue introuvable, arrêt.'); process.exit(1) }

  const allFixtures = await a2_fixtures(leagueId)
  if (!allFixtures.length) { console.error('\n❌ Aucun fixture CM2026.'); process.exit(1) }

  // Fixture NS du 11 juin pour odds + lineups
  const nsFixture =
    allFixtures.find(f => f.fixture.status.short === 'NS' && f.fixture.date.startsWith('2026-06-11'))
    ?? allFixtures.find(f => f.fixture.status.short === 'NS')

  if (!nsFixture) {
    warn('Aucun fixture NS trouvé', 'Tous les matchs seraient déjà commencés ?')
  } else {
    await a3_odds(nsFixture)
    await a4_lineups_ns(nsFixture)
    await a5_events_stats_ns(nsFixture)
  }

  // ── SECTION B : Saves via Copa América 2024 terminé ────

  const completedFixture = await b1_findCompletedFixture()
  if (completedFixture) {
    await b2_events(completedFixture)
    await b3_playerStats(completedFixture)
    await b4_statistics(completedFixture)
  }

  // ── RÉSUMÉ ─────────────────────────────────────────────

  sep('RÉSUMÉ VALIDATION')
  console.log(`
  SECTION A — CM2026
  ──────────────────
  A1 League   : league=1, saison 2026 accessible ?
  A2 Fixtures : nb total, matchs du 11 juin présents ?
  A3 Odds     : cotes disponibles sur NS ? paliers R3 corrects ?
  A4 Lineups  : vide sur NS confirmé (comportement attendu)
  A5 Events   : vide sur NS confirmé (comportement attendu)

  SECTION B — Saves Vigie (Copa América 2024)
  ───────────────────────────────────────────
  B2 Events       : structure Goal/Assist/VAR validée
  B3 PlayerStats  : /fixtures/players → goals.saves disponible ?
  B4 Statistics   : /fixtures/statistics → "Saves" team-level ?
  `)
}

main().catch(err => {
  console.error('\n❌  Erreur fatale :',
    (err as { response?: { data?: unknown }; message?: string })?.response?.data
    ?? (err as Error)?.message
    ?? err,
  )
  process.exit(1)
})
