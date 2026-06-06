// R2 — sélectionne le joueur B1 de la ligne nationale pour un poste donné.
// Filtre CL1 (minutesJouees >= 1) appliqué avant toute sélection.
// Retourne null si aucun joueur éligible ne remplit le critère minimum du poste.
export function selectionnerMeilleurPerformer(poste, ligneJoueurs, evenements) {
    const eligibles = ligneJoueurs.filter(j => j.minutesJouees >= 1);
    if (eligibles.length === 0)
        return null;
    switch (poste) {
        case "Captain": {
            // B1 FWD : joueur avec le plus de buts hors TAB — minimum 1 but requis
            let best = null;
            let maxButs = 0;
            for (const j of eligibles) {
                const buts = evenements.filter(e => e.joueurId === j.joueurId &&
                    e.type === "but" &&
                    e.phaseJeu !== "tirs_au_but" &&
                    e.officiel).length;
                if (buts > maxButs) {
                    maxButs = buts;
                    best = j.joueurId;
                }
            }
            return maxButs >= 1 ? best : null;
        }
        case "Second": {
            // B1 MID : joueur avec le plus de buts + assists + pré-assists — minimum 1 event requis
            let best = null;
            let maxEvents = 0;
            for (const j of eligibles) {
                const events = evenements.filter(e => e.joueurId === j.joueurId &&
                    (e.type === "but" || e.type === "assist" || e.type === "pre_assist") &&
                    e.phaseJeu !== "tirs_au_but" &&
                    e.officiel).length;
                if (events > maxEvents) {
                    maxEvents = events;
                    best = j.joueurId;
                }
            }
            return maxEvents >= 1 ? best : null;
        }
        case "Navigator": {
            // B1 MID : joueur avec le plus d'assists + pré-assists — minimum 1 requis
            let best = null;
            let maxCreations = 0;
            for (const j of eligibles) {
                const creations = evenements.filter(e => e.joueurId === j.joueurId &&
                    (e.type === "assist" || e.type === "pre_assist") &&
                    e.phaseJeu !== "tirs_au_but" &&
                    e.officiel).length;
                if (creations > maxCreations) {
                    maxCreations = creations;
                    best = j.joueurId;
                }
            }
            return maxCreations >= 1 ? best : null;
        }
        case "Watch": {
            // B1 DEF : joueur avec le plus de minutes — minimum 1 minute (condition collective vérifiée séparément)
            let best = null;
            let maxMin = 0;
            for (const j of eligibles) {
                if (j.minutesJouees > maxMin) {
                    maxMin = j.minutesJouees;
                    best = j.joueurId;
                }
            }
            return best;
        }
        case "Keeper": {
            // B1 GK : joueur avec le plus d'arrêts — minimum 3 arrêts requis
            let best = null;
            let maxArrets = 0;
            for (const j of eligibles) {
                const arrets = evenements.filter(e => e.joueurId === j.joueurId && e.type === "arret" && e.officiel).length;
                if (arrets > maxArrets) {
                    maxArrets = arrets;
                    best = j.joueurId;
                }
            }
            return maxArrets >= 3 ? best : null;
        }
    }
}
