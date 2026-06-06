const BASE_URL = import.meta.env.VITE_SPORT_API_BASE_URL ?? '';
const API_KEY = import.meta.env.VITE_SPORT_API_KEY ?? '';
const API_HOST = import.meta.env.VITE_SPORT_API_HOST ?? '';
// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------
export class SportApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'SportApiError';
    }
}
// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------
async function apiFetch(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': API_HOST,
        },
    });
    if (!res.ok) {
        throw new SportApiError(res.status, `API error ${res.status} — ${path}`);
    }
    const json = (await res.json());
    return json.response;
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/** Matchs d'une journée. date format: "YYYY-MM-DD" */
export function fetchFixtures(date) {
    return apiFetch(`/fixtures?date=${encodeURIComponent(date)}`);
}
/** Événements d'un match (buts, cartons, remplacements). */
export function fetchEvents(fixtureId) {
    return apiFetch(`/fixtures/events?fixture=${fixtureId}`);
}
/** Compositions des deux équipes pour un match. */
export function fetchLineups(fixtureId) {
    return apiFetch(`/fixtures/lineups?fixture=${fixtureId}`);
}
