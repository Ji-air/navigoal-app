/**
 * calibrate-impulsions.ts
 *
 * Simule CM2022 + CM2018 pour calibrer les valeurs d'impulsion Navigoal.
 * Usage : npx tsx src/scripts/calibrate-impulsions.ts [--no-cache] [--delay=200] [--verbose]
 *
 * Cache  : .calibration-cache/  (JSON par fixture — survit entre sessions)
 * API    : league=1 (FIFA World Cup), seasons 2022 et 2018
 * Coût   : CM2022 = 0 req (tout caché) · CM2018 = ~65 req (players seulement,
 *           odds inutiles pour données historiques)
 *
 * Note sur les pré-assists (Barre) : /fixtures/players ne fournit pas les
 * pré-assists. Score = goals+assists uniquement — sous-estime Barre de ~10-15%.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import axios from 'axios'

import type {
  ApiFixtureItem,
  ApiPlayerStatsItem,
  ApiOddsItem,
  ApiResponse,
} from '../lib/api-sports'
import { mapOddsToPalier, extractWinOdd } from '../lib/api-sports-mapper'
import type { Palier } from '../types'

// ── ENV ───────────────────────────────────────────────────────────────────────

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

const env     = loadEnvLocal()
const API_KEY = env.VITE_API_SPORTS_KEY ?? process.env.VITE_API_SPORTS_KEY ?? ''

if (!API_KEY) {
  console.error('❌  VITE_API_SPORTS_KEY manquant dans .env.local')
  process.exit(1)
}

const DELAY_MS = (() => {
  const arg = process.argv.find(a => a.startsWith('--delay='))
  return arg ? parseInt(arg.slice('--delay='.length), 10) : 200
})()
const NO_CACHE = process.argv.includes('--no-cache')
const VERBOSE  = process.argv.includes('--verbose')

// ── CACHE ─────────────────────────────────────────────────────────────────────

const CACHE_DIR = resolve(process.cwd(), '.calibration-cache')
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

function cacheFile(key: string): string {
  return join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`)
}
function fromCache<T>(key: string): T | null {
  if (NO_CACHE) return null
  const p = cacheFile(key)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) as T }
  catch { return null }
}
function toCache(key: string, data: unknown): void {
  writeFileSync(cacheFile(key), JSON.stringify(data), 'utf8')
}

// ── CLIENT API ────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers:  { 'x-apisports-key': API_KEY },
  timeout:  15_000,
})

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

async function getWithCache<T>(path: string, key: string): Promise<T[]> {
  const hit = fromCache<T[]>(key)
  if (hit !== null) return hit
  await sleep(DELAY_MS)
  const { data } = await api.get<ApiResponse<T>>(path)
  toCache(key, data.response)
  return data.response
}

// ── VALEURS NM (Option A) ─────────────────────────────────────────────────────
//
// Ratio : 1 : 2,33 : 4,17  (ancien 8/22/55 = 1 : 2,75 : 6,87 — trop écrasant)

const NM: Record<Palier, number> = { Breeze: 12, Wind: 28, Boost: 50 }

// ── PALIERS — TABLE UNIFIÉE CM2018 + CM2022 ───────────────────────────────────
//
// API-Sports ne fournit pas de cotes historiques (/odds = temps réel).
// Classification basée sur la position de marché pré-tournoi connue.

const PALIERS: Record<string, Palier> = {
  // Breeze — cote < 2,0 (grands favoris)
  Argentina:   'Breeze', Belgium:     'Breeze', Brazil:    'Breeze',
  Colombia:    'Breeze', England:     'Breeze', France:    'Breeze',
  Germany:     'Breeze', Netherlands: 'Breeze', Portugal:  'Breeze',
  Spain:       'Breeze', Uruguay:     'Breeze',
  // Wind — cote 2,0–4,5 (outsiders modérés)
  Croatia:     'Wind',   Denmark:     'Wind',   Ecuador:   'Wind',
  Iceland:     'Wind',   Mexico:      'Wind',   Peru:      'Wind',
  Poland:      'Wind',   Senegal:     'Wind',   Serbia:    'Wind',
  Sweden:      'Wind',   Switzerland: 'Wind',   USA:       'Wind',
  Wales:       'Wind',
  // Boost — cote > 4,5 (gros outsiders)
  Australia:      'Boost', Cameroon:     'Boost', Canada:      'Boost',
  'Costa Rica':   'Boost', Egypt:        'Boost', Ghana:       'Boost',
  Iran:           'Boost', Japan:        'Boost', Morocco:     'Boost',
  Nigeria:        'Boost', Panama:       'Boost', Qatar:       'Boost',
  Russia:         'Boost', 'Saudi Arabia': 'Boost', 'South Korea': 'Boost',
  Tunisia:        'Boost',
}

// ── TYPES ─────────────────────────────────────────────────────────────────────

type PosteSimu = 'cap' | 'barre' | 'ancre' | 'vigie'
interface TeamSlot { id: number; name: string }
type Crew = Record<PosteSimu, TeamSlot>

interface Impulsion {
  poste:     PosteSimu | 'collectif'
  rule:      'R2' | 'R4'
  triggered: boolean
  nm:        number
  palier:    Palier
  detail:    string
}

interface MatchResult {
  fixtureId: number; round: string; date: string; opponent: string
  poste: PosteSimu; palier: Palier; oddValue: number | null
  r2: Impulsion; r4: Impulsion; totalNm: number
}

interface CrewStats {
  crewName:        string
  crew:            Crew
  totalNm:         number
  matchesPerPoste: Record<PosteSimu, number>
  triggeredR2:     Record<PosteSimu, number>
  triggeredR4:     number
  totalMatchSlots: number
  nmR2ByPoste:     Record<PosteSimu, number>
  nmR4Total:       number
  rounds:          Set<string>
  palierDistrib:   Record<PosteSimu, Record<Palier, number>>
}

// ── PALIER / NM ───────────────────────────────────────────────────────────────

function palierForSlot(teamName: string, oddValue: number | null): Palier {
  if (oddValue !== null) return mapOddsToPalier(oddValue)
  return PALIERS[teamName] ?? 'Wind'
}

function oddForTeam(fixture: ApiFixtureItem, odds: ApiOddsItem[], teamId: number): number | null {
  const side = fixture.teams.home.id === teamId ? 'Home' : 'Away'
  for (const item of odds)
    for (const bk of item.bookmakers) {
      const o = extractWinOdd(bk.bets, side)
      if (o !== null) return o
    }
  return null
}

function played(p: ApiPlayerStatsItem['players'][0]): boolean {
  return (p.statistics[0]?.games.minutes ?? 0) > 0
}

// ── R2 — ÉVÉNEMENT DE POSTE ───────────────────────────────────────────────────

function r2Cap(stats: ApiPlayerStatsItem[], teamId: number, palier: Palier): Impulsion {
  const base = { poste: 'cap' as const, rule: 'R2' as const, nm: NM[palier], palier }
  const team = stats.find(t => t.team.id === teamId)
  if (!team) return { ...base, triggered: false, detail: 'no stats' }
  const fwds = team.players.filter(p => played(p) && p.statistics[0]?.games.position === 'F')
  if (!fwds.length) return { ...base, triggered: false, detail: 'no FWD' }
  const b1    = fwds.reduce((best, p) =>
    (p.statistics[0]?.goals.total ?? 0) > (best.statistics[0]?.goals.total ?? 0) ? p : best)
  const goals = b1.statistics[0]?.goals.total ?? 0
  return { ...base, triggered: goals > 0, detail: `${b1.player.name} ${goals}g` }
}

function r2Barre(stats: ApiPlayerStatsItem[], teamId: number, palier: Palier): Impulsion {
  const base = { poste: 'barre' as const, rule: 'R2' as const, nm: NM[palier], palier }
  const team = stats.find(t => t.team.id === teamId)
  if (!team) return { ...base, triggered: false, detail: 'no stats' }
  const mids = team.players.filter(p => played(p) && p.statistics[0]?.games.position === 'M')
  if (!mids.length) return { ...base, triggered: false, detail: 'no MID' }
  const score = (p: typeof mids[0]) =>
    (p.statistics[0]?.goals.total ?? 0) + (p.statistics[0]?.goals.assists ?? 0)
  const b1 = mids.reduce((best, p) => score(p) > score(best) ? p : best)
  const s  = score(b1)
  return { ...base, triggered: s > 0, detail: `${b1.player.name} g+a=${s}` }
}

function r2Ancre(
  stats: ApiPlayerStatsItem[], fixture: ApiFixtureItem, teamId: number, palier: Palier,
): Impulsion {
  const base     = { poste: 'ancre' as const, rule: 'R2' as const, nm: NM[palier], palier }
  const isHome   = fixture.teams.home.id === teamId
  const conceded = isHome ? (fixture.goals.away ?? 0) : (fixture.goals.home ?? 0)
  const team     = stats.find(t => t.team.id === teamId)
  const hasDef   = team?.players.some(p => played(p) && p.statistics[0]?.games.position === 'D')
  if (!hasDef) return { ...base, triggered: false, detail: 'no DEF' }
  return { ...base, triggered: conceded <= 1, detail: `${conceded} encaissé(s) ≤1` }
}

function r2Vigie(stats: ApiPlayerStatsItem[], teamId: number, palier: Palier): Impulsion {
  const base = { poste: 'vigie' as const, rule: 'R2' as const, nm: NM[palier], palier }
  const team = stats.find(t => t.team.id === teamId)
  if (!team) return { ...base, triggered: false, detail: 'no stats' }
  const gks = team.players.filter(p => played(p) && p.statistics[0]?.games.position === 'G')
  if (!gks.length) return { ...base, triggered: false, detail: 'no GK' }
  const b1    = gks.reduce((best, p) =>
    (p.statistics[0]?.goals.saves ?? 0) > (best.statistics[0]?.goals.saves ?? 0) ? p : best)
  const saves = b1.statistics[0]?.goals.saves ?? 0
  return { ...base, triggered: saves >= 3, detail: `${b1.player.name} ${saves} arr.` }
}

// ── R4 — VICTOIRE COLLECTIVE ──────────────────────────────────────────────────

function r4(fixture: ApiFixtureItem, teamId: number, palier: Palier): Impulsion {
  const base   = { poste: 'collectif' as const, rule: 'R4' as const, nm: NM[palier], palier }
  const isHome = fixture.teams.home.id === teamId
  const winner = isHome ? fixture.teams.home.winner : fixture.teams.away.winner
  const penH   = fixture.score.penalty.home
  const penA   = fixture.score.penalty.away
  const penWin = penH !== null && penA !== null && (isHome ? penH > penA : penA > penH)
  const won    = winner === true || penWin
  return {
    ...base,
    triggered: won,
    detail: won ? (penWin ? 'victoire TAB' : 'victoire') : (winner === false ? 'défaite' : 'nul'),
  }
}

// ── SIMULATION ────────────────────────────────────────────────────────────────

function simulateForSlot(
  fixture: ApiFixtureItem,
  stats:   ApiPlayerStatsItem[],
  odds:    ApiOddsItem[],
  slot:    TeamSlot,
  poste:   PosteSimu,
): MatchResult | null {
  if (fixture.teams.home.id !== slot.id && fixture.teams.away.id !== slot.id) return null

  const oddValue = oddForTeam(fixture, odds, slot.id)
  const palier   = palierForSlot(slot.name, oddValue)

  const r2Res: Impulsion = (() => {
    switch (poste) {
      case 'cap':   return r2Cap(stats, slot.id, palier)
      case 'barre': return r2Barre(stats, slot.id, palier)
      case 'ancre': return r2Ancre(stats, fixture, slot.id, palier)
      case 'vigie': return r2Vigie(stats, slot.id, palier)
    }
  })()
  const r4Res  = r4(fixture, slot.id, palier)
  const opponent = fixture.teams.home.id === slot.id
    ? fixture.teams.away.name : fixture.teams.home.name

  return {
    fixtureId: fixture.fixture.id,
    round: fixture.league.round,
    date:  fixture.fixture.date.split('T')[0],
    opponent, poste, palier, oddValue,
    r2: r2Res, r4: r4Res,
    totalNm: (r2Res.triggered ? r2Res.nm : 0) + (r4Res.triggered ? r4Res.nm : 0),
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

function computeCrewStats(
  crewName: string,
  crew: Crew,
  resultsByPoste: Map<PosteSimu, MatchResult[]>,
): CrewStats {
  const s: CrewStats = {
    crewName, crew, totalNm: 0,
    matchesPerPoste: { cap: 0, barre: 0, ancre: 0, vigie: 0 },
    triggeredR2:     { cap: 0, barre: 0, ancre: 0, vigie: 0 },
    triggeredR4: 0, totalMatchSlots: 0,
    nmR2ByPoste:     { cap: 0, barre: 0, ancre: 0, vigie: 0 },
    nmR4Total: 0,
    rounds: new Set(),
    palierDistrib: {
      cap:   { Breeze: 0, Wind: 0, Boost: 0 },
      barre: { Breeze: 0, Wind: 0, Boost: 0 },
      ancre: { Breeze: 0, Wind: 0, Boost: 0 },
      vigie: { Breeze: 0, Wind: 0, Boost: 0 },
    },
  }
  for (const [poste, results] of resultsByPoste) {
    for (const m of results) {
      s.matchesPerPoste[poste]++
      s.totalMatchSlots++
      s.rounds.add(m.round)
      s.palierDistrib[poste][m.palier]++
      s.totalNm += m.totalNm
      if (m.r2.triggered) { s.triggeredR2[poste]++; s.nmR2ByPoste[poste] += m.r2.nm }
      if (m.r4.triggered) { s.triggeredR4++;          s.nmR4Total          += m.r4.nm }
    }
  }
  return s
}

// ── AFFICHAGE ─────────────────────────────────────────────────────────────────

const W   = 66
const BAR = '═'.repeat(W)
const SEP = '─'.repeat(W)

function rPad(s: string, n: number) { return s.padEnd(n) }
function lPad(s: string, n: number) { return s.padStart(n) }

function printCrewReport(s: CrewStats, label: string): void {
  const crewLine = (Object.entries(s.crew) as [PosteSimu, TeamSlot][])
    .map(([p, sl]) => `${p}=${sl.name}`).join('  ')
  console.log(`\n  [${label}] ÉQUIPAGE "${s.crewName}"  —  ${crewLine}`)
  console.log(SEP)
  console.log(rPad('  Poste', 9) + rPad('Nation', 16) + lPad('NM R2', 8) +
              lPad('Décl.', 7) + lPad('Taux', 7) + '  Paliers')
  console.log(SEP)

  for (const [poste, slot] of Object.entries(s.crew) as [PosteSimu, TeamSlot][]) {
    const played = s.matchesPerPoste[poste]
    const trig   = s.triggeredR2[poste]
    const nmR2   = s.nmR2ByPoste[poste]
    const rate   = played > 0 ? Math.round(trig / played * 100) : 0
    const dist   = s.palierDistrib[poste]
    const pl     = (['Breeze', 'Wind', 'Boost'] as Palier[])
      .filter(p => dist[p] > 0).map(p => `${p[0]}×${dist[p]}`).join(' ')

    console.log(rPad(`  ${poste.toUpperCase()}`, 9) + rPad(slot.name, 16) +
                lPad(nmR2 + 'nm', 8) + lPad(`${trig}/${played}`, 7) +
                lPad(rate + '%', 7) + `  [${pl}]`)
  }

  const r4Denom = s.totalMatchSlots
  const r4Rate  = r4Denom > 0 ? Math.round(s.triggeredR4 / r4Denom * 100) : 0
  console.log(rPad('  R4', 9) + rPad('collectif', 16) +
              lPad(s.nmR4Total + 'nm', 8) + lPad(`${s.triggeredR4}/${r4Denom}`, 7) +
              lPad(r4Rate + '%', 7) + '  victoires')
  console.log(SEP)
  const avg = s.rounds.size > 0 ? Math.round(s.totalNm / s.rounds.size) : 0
  console.log(`  TOTAL ${lPad(s.totalNm + 'nm', 6)}   ${s.rounds.size} journées   moy ${avg}nm/journée`)
}

function printRoundBreakdown(crewName: string, label: string,
  resultsByPoste: Map<PosteSimu, MatchResult[]>): void {
  const byRound = new Map<string, number>()
  for (const results of resultsByPoste.values())
    for (const m of results)
      byRound.set(m.round, (byRound.get(m.round) ?? 0) + m.totalNm)
  if (!byRound.size) return
  console.log(`\n  [${label}] Détail journées — "${crewName}"`)
  for (const [round, nm] of [...byRound.entries()].sort(([a], [b]) => a.localeCompare(b)))
    console.log(`    ${rPad(round, 28)} ${lPad(nm + 'nm', 7)}`)
}

function printComparison(
  label2022: string, stats2022: CrewStats[],
  label2018: string, stats2018: CrewStats[],
): void {
  console.log('\n' + BAR)
  console.log(`  COMPARAISON ${label2022} vs ${label2018}`)
  console.log(`  Valeurs : Breeze=${NM.Breeze}nm · Wind=${NM.Wind}nm · Boost=${NM.Boost}nm`)
  console.log(SEP)
  console.log(
    rPad('  Équipage', 14) +
    lPad(label2022, 10) + lPad('moy/j', 7) +
    lPad(label2018, 10) + lPad('moy/j', 7) +
    lPad('Écart F→O', 12),
  )
  console.log(SEP)

  for (let i = 0; i < stats2022.length; i++) {
    const s22 = stats2022[i]
    const s18 = stats2018.find(s => s.crewName === s22.crewName)
    const avg22 = s22.rounds.size > 0 ? Math.round(s22.totalNm / s22.rounds.size) : 0
    const avg18 = s18 && s18.rounds.size > 0 ? Math.round(s18.totalNm / s18.rounds.size) : 0
    console.log(
      rPad(`  "${s22.crewName}"`, 14) +
      lPad(s22.totalNm + 'nm', 10) + lPad('~' + avg22 + 'nm', 7) +
      lPad((s18?.totalNm ?? '—') + (s18 ? 'nm' : ''), 10) + lPad('~' + avg18 + 'nm', 7) +
      '',
    )
  }

  // Écart Favoris → Outsiders pour chaque tournoi
  const ecartFor = (stats: CrewStats[]) => {
    const fav = stats.find(s => s.crewName === 'Favoris')
    const out = stats.find(s => s.crewName === 'Outsiders')
    if (!fav || !out || fav.totalNm === 0) return null
    const delta = out.totalNm - fav.totalNm
    const pct   = Math.round(delta / fav.totalNm * 100)
    return { delta, pct }
  }

  const e22 = ecartFor(stats2022)
  const e18 = ecartFor(stats2018)

  console.log(SEP)
  console.log(
    `  Écart Outsiders−Favoris : ` +
    `${label2022} = +${e22?.delta ?? '?'}nm (+${e22?.pct ?? '?'}%)   ` +
    `${label2018} = +${e18?.delta ?? '?'}nm (+${e18?.pct ?? '?'}%)`,
  )
  console.log(`  Objectif : 150–250%`)
  console.log()

  const check = (pct: number | undefined, label: string) => {
    if (pct === undefined) return
    if (pct < 150)        console.log(`  ${label} ⚠️  Trop faible (${pct}%) — outsiders pas assez récompensés`)
    else if (pct > 250)   console.log(`  ${label} ⚠️  Trop fort  (${pct}%) — favoris trop pénalisés`)
    else                  console.log(`  ${label} ✓  Dans la cible (${pct}%)`)
  }
  check(e22?.pct, label2022)
  check(e18?.pct, label2018)

  // Mixte : vérification moy/journée dans la cible 40–80nm
  const mixte22 = stats2022.find(s => s.crewName === 'Mixte')
  const mixte18 = stats2018.find(s => s.crewName === 'Mixte')
  const avg22m  = mixte22 && mixte22.rounds.size > 0 ? Math.round(mixte22.totalNm / mixte22.rounds.size) : 0
  const avg18m  = mixte18 && mixte18.rounds.size > 0 ? Math.round(mixte18.totalNm / mixte18.rounds.size) : 0
  console.log()
  const checkAvg = (avg: number, label: string) => {
    const ok = avg >= 40 && avg <= 80
    console.log(`  Mixte moy/journée ${label} : ${avg}nm  ${ok ? '✓ dans la cible (40–80nm)' : '⚠️  hors cible (40–80nm)'}`)
  }
  checkAvg(avg22m, label2022)
  checkAvg(avg18m, label2018)

  console.log(BAR)
}

// ── TOURNOI CONFIG ────────────────────────────────────────────────────────────

type CrewDef = { name: string; slots: Record<PosteSimu, string> }

interface TournamentConfig {
  label:    string
  season:   number
  crewDefs: CrewDef[]
  skipOdds: boolean   // true = odds toujours vides pour tournois passés
}

// CM2022 — équipages inchangés (Australie présente)
const CREWS_CM2022: CrewDef[] = [
  { name: 'Favoris',   slots: { cap: 'France',  barre: 'Brazil',       ancre: 'England',      vigie: 'Spain'     } },
  { name: 'Mixte',     slots: { cap: 'France',  barre: 'Germany',      ancre: 'Senegal',      vigie: 'Morocco'   } },
  { name: 'Outsiders', slots: { cap: 'Morocco', barre: 'Japan',        ancre: 'South Korea',  vigie: 'Australia' } },
]

// CM2018 — Australie absente → remplacée par Panama (autre gros outsider, 1ère participation)
const CREWS_CM2018: CrewDef[] = [
  { name: 'Favoris',   slots: { cap: 'France',  barre: 'Brazil',       ancre: 'England',      vigie: 'Spain'     } },
  { name: 'Mixte',     slots: { cap: 'France',  barre: 'Germany',      ancre: 'Senegal',      vigie: 'Morocco'   } },
  { name: 'Outsiders', slots: { cap: 'Morocco', barre: 'Japan',        ancre: 'South Korea',  vigie: 'Panama'    } },
]

const TOURNAMENTS: TournamentConfig[] = [
  { label: 'CM2022', season: 2022, crewDefs: CREWS_CM2022, skipOdds: true },
  { label: 'CM2018', season: 2018, crewDefs: CREWS_CM2018, skipOdds: true },
]

// ── SIMULATION TOURNOI ────────────────────────────────────────────────────────

async function simulateTournament(cfg: TournamentConfig): Promise<CrewStats[]> {
  const { label, season, crewDefs, skipOdds } = cfg

  // 1. Fixtures
  process.stdout.write(`\n📡  Fixtures ${label} (league=1 season=${season})… `)
  const allFixtures = await getWithCache<ApiFixtureItem>(
    `/fixtures?league=1&season=${season}`,
    `fixtures-1-${season}`,
  )
  const finished = allFixtures.filter(f =>
    ['FT', 'AET', 'PEN'].includes(f.fixture.status.short),
  )
  console.log(`${finished.length} terminés / ${allFixtures.length} total`)

  // 2. Index nom → id
  const nameToId = new Map<string, number>()
  for (const f of allFixtures) {
    nameToId.set(f.teams.home.name, f.teams.home.id)
    nameToId.set(f.teams.away.name, f.teams.away.id)
  }

  // 3. Résolution crews
  const resolvedCrews: Array<{ name: string; crew: Crew }> = []
  for (const def of crewDefs) {
    const crew = {} as Crew
    let ok = true
    for (const [poste, teamName] of Object.entries(def.slots) as [PosteSimu, string][]) {
      const id = nameToId.get(teamName)
      if (id === undefined) {
        console.warn(`  ⚠️  [${label}] Équipe non trouvée : "${teamName}"`)
        console.log('     Noms disponibles :', [...nameToId.keys()].sort().join(', '))
        ok = false; break
      }
      crew[poste] = { id, name: teamName }
    }
    if (ok) resolvedCrews.push({ name: def.name, crew })
  }

  // 4. Chargement stats + cotes
  let uncached = 0
  type Bundle = { fixture: ApiFixtureItem; stats: ApiPlayerStatsItem[]; odds: ApiOddsItem[] }
  const bundles: Bundle[] = []

  for (let i = 0; i < finished.length; i++) {
    const fixture = finished[i]
    const id      = fixture.fixture.id
    const sk      = `players-${id}`

    if (!fromCache(sk)) uncached++

    const stats = await getWithCache<ApiPlayerStatsItem>(`/fixtures/players?fixture=${id}`, sk)
    // Odds : non fetchées pour tournois passés (endpoint temps réel uniquement)
    const odds: ApiOddsItem[] = skipOdds ? [] : await getWithCache<ApiOddsItem>(`/odds?fixture=${id}`, `odds-${id}`)
    bundles.push({ fixture, stats, odds })

    if ((i + 1) % 10 === 0 || i === finished.length - 1)
      process.stdout.write(`  ${i + 1}/${finished.length} matchs chargés\r`)
  }
  console.log(`\n✓  ${label} prêt (${uncached} requêtes API ce run)`)

  // 5. Simulation
  const crewStatsList: CrewStats[] = []

  for (const { name, crew } of resolvedCrews) {
    const resultsByPoste = new Map<PosteSimu, MatchResult[]>(
      (['cap', 'barre', 'ancre', 'vigie'] as PosteSimu[]).map(p => [p, []]),
    )
    for (const { fixture, stats, odds } of bundles) {
      for (const [poste, slot] of Object.entries(crew) as [PosteSimu, TeamSlot][]) {
        const r = simulateForSlot(fixture, stats, odds, slot, poste)
        if (r) resultsByPoste.get(poste)!.push(r)
      }
    }

    crewStatsList.push(computeCrewStats(name, crew, resultsByPoste))

    if (VERBOSE) printRoundBreakdown(name, label, resultsByPoste)
  }

  // 6. Rapport détaillé
  console.log('\n' + BAR)
  for (const cs of crewStatsList)
    printCrewReport(cs, label)

  // Synthèse tournoi
  const sorted = [...crewStatsList].sort((a, b) => b.totalNm - a.totalNm)
  const best   = sorted[0]
  const worst  = sorted[sorted.length - 1]
  const ecartP = worst.totalNm > 0 ? Math.round((best.totalNm - worst.totalNm) / worst.totalNm * 100) : 0
  console.log('\n' + SEP)
  console.log(`  [${label}] Classement`)
  for (const cs of sorted) {
    const avg = cs.rounds.size > 0 ? Math.round(cs.totalNm / cs.rounds.size) : 0
    console.log(`    ${rPad('"' + cs.crewName + '"', 14)} ${lPad(cs.totalNm + 'nm', 8)}   moy ~${avg}nm/journée`)
  }
  console.log(`  Écart meilleur/pire : +${ecartP}%`)

  return crewStatsList
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n' + BAR)
  console.log('  CALIBRATION NAVIGOAL — Option A')
  console.log(`  Valeurs testées : Breeze=${NM.Breeze}nm · Wind=${NM.Wind}nm · Boost=${NM.Boost}nm`)
  console.log(`  Cache : ${CACHE_DIR}`)
  console.log(BAR)

  const allStats: Record<string, CrewStats[]> = {}

  for (const cfg of TOURNAMENTS) {
    allStats[cfg.label] = await simulateTournament(cfg)
  }

  // Comparaison côte à côte
  printComparison(
    'CM2022', allStats['CM2022'],
    'CM2018', allStats['CM2018'],
  )

  // Taux de déclenchement globaux (tous tournois confondus)
  const allCrewStats = Object.values(allStats).flat()
  console.log('\n  Taux de déclenchement R2 (tous tournois, tous équipages)')
  console.log(SEP)
  for (const poste of ['cap', 'barre', 'ancre', 'vigie'] as PosteSimu[]) {
    const trig  = allCrewStats.reduce((s, cs) => s + cs.triggeredR2[poste], 0)
    const total = allCrewStats.reduce((s, cs) => s + cs.matchesPerPoste[poste], 0)
    const rate  = total > 0 ? Math.round(trig / total * 100) : 0
    console.log(`    ${rPad(poste.toUpperCase(), 8)} ${lPad(trig + '/' + total, 9)} décl.  ${lPad(rate + '%', 5)}`)
  }
  console.log(BAR + '\n')
}

main().catch(err => {
  console.error('\n❌  Erreur fatale :', err?.message ?? err)
  process.exit(1)
})
