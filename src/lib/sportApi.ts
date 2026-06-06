const BASE_URL = (import.meta.env.VITE_SPORT_API_BASE_URL as string) ?? ''
const API_KEY  = (import.meta.env.VITE_SPORT_API_KEY  as string) ?? ''
const API_HOST = (import.meta.env.VITE_SPORT_API_HOST as string) ?? ''

// ---------------------------------------------------------------------------
// Raw API types — API-Football / RapidAPI format
// ---------------------------------------------------------------------------

export interface ApiFixtureStatus {
  short: 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'BT' | 'P' | 'FT' | 'AET' | 'PEN'
       | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE'
  elapsed: number | null
}

export interface ApiTeam {
  id: number
  name: string
}

export interface ApiFixture {
  fixture: { id: number; date: string; status: ApiFixtureStatus }
  league:  { id: number; name: string; round: string }
  teams:   { home: ApiTeam; away: ApiTeam }
  goals:   { home: number | null; away: number | null }
}

export interface ApiEvent {
  time:   { elapsed: number; extra: number | null }
  team:   ApiTeam
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type:   string   // "Goal" | "Card" | "subst" | "Var"
  detail: string   // "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty" | …
}

export interface ApiPlayer {
  id:     number
  name:   string
  number: number
  pos:    string   // "G" | "D" | "M" | "F"
  grid:   string | null
}

export interface ApiLineup {
  team:        ApiTeam
  formation:   string
  startXI:     Array<{ player: ApiPlayer }>
  substitutes: Array<{ player: ApiPlayer }>
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class SportApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'SportApiError'
  }
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'x-rapidapi-key':  API_KEY,
      'x-rapidapi-host': API_HOST,
    },
  })
  if (!res.ok) {
    throw new SportApiError(res.status, `API error ${res.status} — ${path}`)
  }
  const json = (await res.json()) as { response: T[] }
  return json.response
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Matchs d'une journée. date format: "YYYY-MM-DD" */
export function fetchFixtures(date: string): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(`/fixtures?date=${encodeURIComponent(date)}`)
}

/** Événements d'un match (buts, cartons, remplacements). */
export function fetchEvents(fixtureId: number): Promise<ApiEvent[]> {
  return apiFetch<ApiEvent>(`/fixtures/events?fixture=${fixtureId}`)
}

/** Compositions des deux équipes pour un match. */
export function fetchLineups(fixtureId: number): Promise<ApiLineup[]> {
  return apiFetch<ApiLineup>(`/fixtures/lineups?fixture=${fixtureId}`)
}
