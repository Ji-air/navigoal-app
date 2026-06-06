// R5 / COMPORTEMENTS §13 action 1 — N = matchs "terminé" uniquement
export function seuilDiversite(nombreMatchesTermines) {
    if (nombreMatchesTermines >= 2 && nombreMatchesTermines <= 3)
        return 1;
    if (nombreMatchesTermines >= 4 && nombreMatchesTermines <= 6)
        return 2;
    return null;
}
// R5 — +10nm par impulsion déclenchée si condition outsiders remplie
export function calculerBonusDiversite(params) {
    const { nombreMatchesTermines, paliersNationsEquipage, nombreImpulsionsDeclenchees } = params;
    const seuil = seuilDiversite(nombreMatchesTermines);
    if (seuil === null)
        return 0;
    const outsiders = paliersNationsEquipage.filter(p => p === "Wind" || p === "Boost").length;
    if (outsiders < seuil)
        return 0;
    return nombreImpulsionsDeclenchees * 10;
}
