import axios from 'axios'

// =========================================================
// CLIENT — accès direct API-Sports (pas via RapidAPI)
// Header : x-apisports-key (≠ x-rapidapi-key de sportApi.ts)
// =========================================================

const API_BASE = 'https://v3.football.api-sports.io'

// Compatible Vite (import.meta.env) et Node.js/tsx (process.env)
const API_KEY = (import.meta.env.VITE_API_SPORTS_KEY as string | undefined)
  ?? process.env.VITE_API_SPORTS_KEY
  ?? ''

export const apiSports = axios.create({
  baseURL: API_BASE,
  headers: { 'x-apisports-key': API_KEY },
  timeout: 10_000,
})

// =========================================================
// TYPES DE RÉPONSE
// =========================================================

export interface ApiResponse<T> {
  get: string
  parameters: Record<string, unknown>
  errors: unknown[]
  results: number
  paging: { current: number; total: number }
  response: T[]
}

// --- Fixtures ---

export interface ApiFixtureStatus {
  long: string
  short: 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'BT' | 'P' | 'FT' | 'AET' | 'PEN'
       | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE'
  elapsed: number | null
}

export interface ApiFixtureItem {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    status: ApiFixtureStatus
  }
  league: {
    id: number
    name: string
    country: string
    season: number
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime:   { home: number | null; away: number | null }
    fulltime:   { home: number | null; away: number | null }
    extratime:  { home: number | null; away: number | null }
    penalty:    { home: number | null; away: number | null }
  }
}

// --- Lineups ---

export interface ApiLineupPlayer {
  player: {
    id: number
    name: string
    number: number
    pos: string      // "G" | "D" | "M" | "F"
    grid: string | null  // ex: "1:1" (ligne:colonne dans la formation)
  }
}

export interface ApiLineupItem {
  team: { id: number; name: string; logo: string }
  coach: { id: number; name: string }
  formation: string   // ex: "4-3-3"
  startXI: ApiLineupPlayer[]
  substitutes: ApiLineupPlayer[]
}

// --- Events ---

export interface ApiEventItem {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number | null; name: string | null }
  assist:  { id: number | null; name: string | null }
  type: string    // "Goal" | "Card" | "subst" | "Var"
  detail: string  // "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty" | "Yellow Card" | …
  comments: string | null
}

// --- Statistics ---

export interface ApiStatistic {
  type: string           // "Shots on Goal" | "Ball Possession" | "Saves" | …
  value: string | number | null
}

export interface ApiStatisticsItem {
  team: { id: number; name: string; logo: string }
  statistics: ApiStatistic[]
}

// --- Odds ---

export interface ApiOddsBet {
  id: number
  name: string   // "Match Winner" | "Both Teams Score" | …
  values: Array<{ value: string; odd: string }>
}

export interface ApiOddsBookmaker {
  id: number
  name: string
  bets: ApiOddsBet[]
}

export interface ApiOddsItem {
  league:     { id: number; name: string; country: string; season: number }
  fixture:    { id: number; timezone: string; date: string; timestamp: number }
  update:     string
  bookmakers: ApiOddsBookmaker[]
}

// --- Leagues (pour découverte) ---

export interface ApiLeagueItem {
  league: { id: number; name: string; type: string; logo: string }
  country: { name: string; code: string | null; flag: string | null }
  seasons: Array<{ year: number; start: string; end: string; current: boolean }>
}

// =========================================================
// FONCTIONS FETCH
// =========================================================

/**
 * Liste des matchs d'une ligue pour une saison.
 * CM2026 : leagueId = 1 (à valider), season = 2026
 */
export async function fetchFixtures(
  leagueId: number,
  season: number,
): Promise<ApiFixtureItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiFixtureItem>>(
    `/fixtures?league=${leagueId}&season=${season}`,
  )
  return data.response
}

/** Compositions officielles (postes des joueurs, formation). */
export async function fetchLineups(fixtureId: number): Promise<ApiLineupItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiLineupItem>>(
    `/fixtures/lineups?fixture=${fixtureId}`,
  )
  return data.response
}

/** Événements du match (buts, assists, cartons, VAR). */
export async function fetchEvents(fixtureId: number): Promise<ApiEventItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiEventItem>>(
    `/fixtures/events?fixture=${fixtureId}`,
  )
  return data.response
}

/**
 * Statistiques par équipe — inclut "Saves" (arrêts gardien) et "Goals Prevented".
 * Disponible uniquement après le coup de sifflet final.
 */
export async function fetchStatistics(fixtureId: number): Promise<ApiStatisticsItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiStatisticsItem>>(
    `/fixtures/statistics?fixture=${fixtureId}`,
  )
  return data.response
}

/**
 * Cotes des bookmakers pour un match.
 * Disponible avant le match (ferme au coup d'envoi).
 * Utilisé pour calculer le palier Breeze/Wind/Boost (R3).
 */
export async function fetchOdds(fixtureId: number): Promise<ApiOddsItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiOddsItem>>(
    `/odds?fixture=${fixtureId}`,
  )
  return data.response
}

/** Recherche de ligue par nom — pour valider l'ID du CM2026. */
export async function fetchLeague(name: string): Promise<ApiLeagueItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiLeagueItem>>(
    `/leagues?name=${encodeURIComponent(name)}&type=Cup`,
  )
  return data.response
}

// --- Player stats (par fixture) ---

export interface ApiPlayerStat {
  player: { id: number; name: string; photo: string }
  statistics: Array<{
    games: {
      minutes: number | null
      number: number
      position: string   // "G" | "D" | "M" | "F"
      rating: string | null
      captain: boolean
      substitute: boolean
    }
    goals: {
      total: number | null
      conceded: number | null
      assists: number | null
      saves: number | null
    }
    passes: { total: number | null; key: number | null; accuracy: string | null }
    tackles: { total: number | null; blocks: number | null; interceptions: number | null }
    shots: { total: number | null; on: number | null }
    cards: { yellow: number; red: number }
  }>
}

export interface ApiPlayerStatsItem {
  team: { id: number; name: string; logo: string }
  players: ApiPlayerStat[]
}

/**
 * Statistiques individuelles par joueur pour un match.
 * Endpoint : /fixtures/players?fixture={id}
 * Contient goals.saves pour les gardiens (Vigie — R2).
 * Disponible uniquement après le coup de sifflet final.
 */
export async function fetchPlayerStats(fixtureId: number): Promise<ApiPlayerStatsItem[]> {
  const { data } = await apiSports.get<ApiResponse<ApiPlayerStatsItem>>(
    `/fixtures/players?fixture=${fixtureId}`,
  )
  return data.response
}
