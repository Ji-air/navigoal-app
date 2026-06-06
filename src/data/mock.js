import { calculerPalier } from '../logic/palier';
import { fetchFixtures, fetchLineups } from '../lib/sportApi';
// Passer à true pour activer les vraies données API-Football.
// Toujours false en développement tant que le mapping d'IDs n'est pas renseigné.
export const USE_REAL_API = false;
// ---------- Journée courante ----------
// Passer à true pour simuler un équipage déjà gelé
export const GEL_DEMO_MODE = false;
const _now = new Date();
export const JOURNEE_COURANTE = {
    id: 'j1',
    numero: 1,
    heure_premier_match_utc: new Date(_now.getTime() + 25 * 60 * 1000),
    heure_gel_utc: new Date(_now.getTime() + 10 * 60 * 1000),
};
// Mapping poste Navigoal → ligne football (R1)
export const LIGNE_PAR_POSTE = {
    Captain: 'FWD',
    Second: 'MID',
    Navigator: 'MID',
    Watch: 'DEF',
    Keeper: 'GK',
};
// Journée 1 — 3 matchs
export const NATIONS = [
    { id: 'france', nom: 'France' },
    { id: 'allemagne', nom: 'Allemagne' },
    { id: 'espagne', nom: 'Espagne' },
    { id: 'bresil', nom: 'Brésil' },
    { id: 'argentine', nom: 'Argentine' },
    { id: 'angleterre', nom: 'Angleterre' },
];
export const MATCHS_JOUR = [
    { id: 'm1', nationAId: 'france', nationBId: 'allemagne', heureKickoffUtc: new Date(_now.getTime() + 25 * 60 * 1000) },
    { id: 'm2', nationAId: 'espagne', nationBId: 'bresil', heureKickoffUtc: new Date(_now.getTime() + 28 * 60 * 1000) },
    { id: 'm3', nationAId: 'argentine', nationBId: 'angleterre', heureKickoffUtc: new Date(_now.getTime() + 31 * 60 * 1000) },
];
// Référence stable pour useGel (évite les re-renders)
export const KICKOFFS = MATCHS_JOUR.map(m => m.heureKickoffUtc);
const cotesRaw = [
    { nationId: 'france', valeur: 1.6 }, // Breeze (favori)
    { nationId: 'allemagne', valeur: 2.8 }, // Wind
    { nationId: 'espagne', valeur: 2.2 }, // Wind
    { nationId: 'bresil', valeur: 2.4 }, // Wind
    { nationId: 'argentine', valeur: 2.0 }, // Wind
    { nationId: 'angleterre', valeur: 3.2 }, // Wind
];
export const COTES = cotesRaw.map(c => ({
    ...c,
    palier: calculerPalier(c.valeur),
}));
export const JOUEURS = [
    // France
    { id: 'f-fwd-1', nom: 'Mbappé', nationId: 'france', posteReel: 'FWD' },
    { id: 'f-fwd-2', nom: 'Giroud', nationId: 'france', posteReel: 'FWD' },
    { id: 'f-fwd-3', nom: 'Thuram', nationId: 'france', posteReel: 'FWD' },
    { id: 'f-mid-1', nom: 'Tchouaméni', nationId: 'france', posteReel: 'MID' },
    { id: 'f-mid-2', nom: 'Camavinga', nationId: 'france', posteReel: 'MID' },
    { id: 'f-mid-3', nom: 'Griezmann', nationId: 'france', posteReel: 'MID' },
    { id: 'f-mid-4', nom: 'Rabiot', nationId: 'france', posteReel: 'MID' },
    { id: 'f-def-1', nom: 'Hernandez', nationId: 'france', posteReel: 'DEF' },
    { id: 'f-def-2', nom: 'Pavard', nationId: 'france', posteReel: 'DEF' },
    { id: 'f-def-3', nom: 'Upamecano', nationId: 'france', posteReel: 'DEF' },
    { id: 'f-def-4', nom: 'Varane', nationId: 'france', posteReel: 'DEF' },
    { id: 'f-gk-1', nom: 'Maignan', nationId: 'france', posteReel: 'GK' },
    { id: 'f-gk-2', nom: 'Lloris', nationId: 'france', posteReel: 'GK' },
    // Allemagne
    { id: 'a-fwd-1', nom: 'Füllkrug', nationId: 'allemagne', posteReel: 'FWD' },
    { id: 'a-fwd-2', nom: 'Havertz', nationId: 'allemagne', posteReel: 'FWD' },
    { id: 'a-fwd-3', nom: 'Gnabry', nationId: 'allemagne', posteReel: 'FWD' },
    { id: 'a-mid-1', nom: 'Kimmich', nationId: 'allemagne', posteReel: 'MID' },
    { id: 'a-mid-2', nom: 'Kroos', nationId: 'allemagne', posteReel: 'MID' },
    { id: 'a-mid-3', nom: 'Goretzka', nationId: 'allemagne', posteReel: 'MID' },
    { id: 'a-mid-4', nom: 'Müller', nationId: 'allemagne', posteReel: 'MID' },
    { id: 'a-def-1', nom: 'Rüdiger', nationId: 'allemagne', posteReel: 'DEF' },
    { id: 'a-def-2', nom: 'Schlotterbeck', nationId: 'allemagne', posteReel: 'DEF' },
    { id: 'a-def-3', nom: 'Süle', nationId: 'allemagne', posteReel: 'DEF' },
    { id: 'a-gk-1', nom: 'ter Stegen', nationId: 'allemagne', posteReel: 'GK' },
    { id: 'a-gk-2', nom: 'Trapp', nationId: 'allemagne', posteReel: 'GK' },
    // Espagne
    { id: 'e-fwd-1', nom: 'Morata', nationId: 'espagne', posteReel: 'FWD' },
    { id: 'e-fwd-2', nom: 'Ferran Torres', nationId: 'espagne', posteReel: 'FWD' },
    { id: 'e-fwd-3', nom: 'Nico Williams', nationId: 'espagne', posteReel: 'FWD' },
    { id: 'e-mid-1', nom: 'Pedri', nationId: 'espagne', posteReel: 'MID' },
    { id: 'e-mid-2', nom: 'Gavi', nationId: 'espagne', posteReel: 'MID' },
    { id: 'e-mid-3', nom: 'Rodrigo', nationId: 'espagne', posteReel: 'MID' },
    { id: 'e-mid-4', nom: 'Busquets', nationId: 'espagne', posteReel: 'MID' },
    { id: 'e-def-1', nom: 'Carvajal', nationId: 'espagne', posteReel: 'DEF' },
    { id: 'e-def-2', nom: 'Alba', nationId: 'espagne', posteReel: 'DEF' },
    { id: 'e-def-3', nom: 'Laporte', nationId: 'espagne', posteReel: 'DEF' },
    { id: 'e-gk-1', nom: 'Unai Simón', nationId: 'espagne', posteReel: 'GK' },
    { id: 'e-gk-2', nom: 'Raya', nationId: 'espagne', posteReel: 'GK' },
    // Brésil
    { id: 'b-fwd-1', nom: 'Vinicius Jr', nationId: 'bresil', posteReel: 'FWD' },
    { id: 'b-fwd-2', nom: 'Rodrygo', nationId: 'bresil', posteReel: 'FWD' },
    { id: 'b-fwd-3', nom: 'Neymar', nationId: 'bresil', posteReel: 'FWD' },
    { id: 'b-mid-1', nom: 'Casemiro', nationId: 'bresil', posteReel: 'MID' },
    { id: 'b-mid-2', nom: 'Paquetá', nationId: 'bresil', posteReel: 'MID' },
    { id: 'b-mid-3', nom: 'Bruno Guimarães', nationId: 'bresil', posteReel: 'MID' },
    { id: 'b-mid-4', nom: 'Raphinha', nationId: 'bresil', posteReel: 'MID' },
    { id: 'b-def-1', nom: 'Danilo', nationId: 'bresil', posteReel: 'DEF' },
    { id: 'b-def-2', nom: 'Marquinhos', nationId: 'bresil', posteReel: 'DEF' },
    { id: 'b-def-3', nom: 'Militão', nationId: 'bresil', posteReel: 'DEF' },
    { id: 'b-gk-1', nom: 'Alisson', nationId: 'bresil', posteReel: 'GK' },
    { id: 'b-gk-2', nom: 'Ederson', nationId: 'bresil', posteReel: 'GK' },
    // Argentine
    { id: 'ar-fwd-1', nom: 'Messi', nationId: 'argentine', posteReel: 'FWD' },
    { id: 'ar-fwd-2', nom: 'Lautaro', nationId: 'argentine', posteReel: 'FWD' },
    { id: 'ar-fwd-3', nom: 'Álvarez', nationId: 'argentine', posteReel: 'FWD' },
    { id: 'ar-mid-1', nom: 'De Paul', nationId: 'argentine', posteReel: 'MID' },
    { id: 'ar-mid-2', nom: 'Mac Allister', nationId: 'argentine', posteReel: 'MID' },
    { id: 'ar-mid-3', nom: 'Di María', nationId: 'argentine', posteReel: 'MID' },
    { id: 'ar-mid-4', nom: 'Paredes', nationId: 'argentine', posteReel: 'MID' },
    { id: 'ar-def-1', nom: 'Romero', nationId: 'argentine', posteReel: 'DEF' },
    { id: 'ar-def-2', nom: 'L. Martínez', nationId: 'argentine', posteReel: 'DEF' },
    { id: 'ar-def-3', nom: 'Molina', nationId: 'argentine', posteReel: 'DEF' },
    { id: 'ar-gk-1', nom: 'E. Martínez', nationId: 'argentine', posteReel: 'GK' },
    { id: 'ar-gk-2', nom: 'Musso', nationId: 'argentine', posteReel: 'GK' },
    // Angleterre
    { id: 'an-fwd-1', nom: 'Kane', nationId: 'angleterre', posteReel: 'FWD' },
    { id: 'an-fwd-2', nom: 'Rashford', nationId: 'angleterre', posteReel: 'FWD' },
    { id: 'an-fwd-3', nom: 'Saka', nationId: 'angleterre', posteReel: 'FWD' },
    { id: 'an-mid-1', nom: 'Bellingham', nationId: 'angleterre', posteReel: 'MID' },
    { id: 'an-mid-2', nom: 'Rice', nationId: 'angleterre', posteReel: 'MID' },
    { id: 'an-mid-3', nom: 'Foden', nationId: 'angleterre', posteReel: 'MID' },
    { id: 'an-mid-4', nom: 'Henderson', nationId: 'angleterre', posteReel: 'MID' },
    { id: 'an-def-1', nom: 'Trippier', nationId: 'angleterre', posteReel: 'DEF' },
    { id: 'an-def-2', nom: 'Shaw', nationId: 'angleterre', posteReel: 'DEF' },
    { id: 'an-def-3', nom: 'Maguire', nationId: 'angleterre', posteReel: 'DEF' },
    { id: 'an-gk-1', nom: 'Pickford', nationId: 'angleterre', posteReel: 'GK' },
    { id: 'an-gk-2', nom: 'Ramsdale', nationId: 'angleterre', posteReel: 'GK' },
];
// Helpers
export function nationById(id) {
    return NATIONS.find(n => n.id === id);
}
export function coteByNationId(nationId) {
    return COTES.find(c => c.nationId === nationId);
}
export function joueursByNationAndPoste(nationId, posteReel) {
    return JOUEURS.filter(j => j.nationId === nationId && j.posteReel === posteReel);
}
export const EMPTY_CREW = {
    Captain: null,
    Second: null,
    Navigator: null,
    Watch: null,
    Keeper: null,
};
// ---------------------------------------------------------------------------
// API-Football → types internes
// ---------------------------------------------------------------------------
// Remplir avec les IDs réels de la compétition ciblée (API-Football team IDs).
// Exemple : { 2: 'france', 3: 'allemagne', ... }
const API_TEAM_ID_TO_NATION_ID = {};
const API_POS_TO_POSTE_REEL = {
    G: 'GK', D: 'DEF', M: 'MID', F: 'FWD',
};
// ---------------------------------------------------------------------------
// Async loaders — retournent les données mock si USE_REAL_API = false
// ou si l'API est indisponible
// ---------------------------------------------------------------------------
/** Charge les matchs du jour. date format : "YYYY-MM-DD" */
export async function loadMatchsJour(date) {
    if (!USE_REAL_API)
        return MATCHS_JOUR;
    try {
        const fixtures = await fetchFixtures(date);
        return fixtures.map(f => ({
            id: `api-${f.fixture.id}`,
            nationAId: API_TEAM_ID_TO_NATION_ID[f.teams.home.id] ?? `team-${f.teams.home.id}`,
            nationBId: API_TEAM_ID_TO_NATION_ID[f.teams.away.id] ?? `team-${f.teams.away.id}`,
            heureKickoffUtc: new Date(f.fixture.date),
        }));
    }
    catch (err) {
        console.warn('[sportApi] loadMatchsJour failed, using mock data', err);
        return MATCHS_JOUR;
    }
}
/** Charge les joueurs à partir des compositions de plusieurs matchs. */
export async function loadJoueurs(fixtureIds) {
    if (!USE_REAL_API)
        return JOUEURS;
    try {
        const allLineups = await Promise.all(fixtureIds.map(fetchLineups));
        const joueurs = [];
        for (const lineups of allLineups) {
            for (const lineup of lineups) {
                const nationId = API_TEAM_ID_TO_NATION_ID[lineup.team.id] ?? `team-${lineup.team.id}`;
                for (const { player } of [...lineup.startXI, ...lineup.substitutes]) {
                    joueurs.push({
                        id: `api-${player.id}`,
                        nom: player.name,
                        nationId,
                        posteReel: API_POS_TO_POSTE_REEL[player.pos] ?? 'MID',
                    });
                }
            }
        }
        return joueurs;
    }
    catch (err) {
        console.warn('[sportApi] loadJoueurs failed, using mock data', err);
        return JOUEURS;
    }
}
