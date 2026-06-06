// COMPORTEMENTS §15 — critère secondaire : Boost count décroissant
export function departagementBoost(a, b) {
    return b.totalBoost - a.totalBoost;
}
// COMPORTEMENTS §15 — tri : positionNm déc., puis totalBoost déc., puis ex-aequo (pas de 3e critère)
export function trierClassement(entrees) {
    return [...entrees].sort((a, b) => {
        if (b.positionNm !== a.positionNm)
            return b.positionNm - a.positionNm;
        return departagementBoost(a, b);
    });
}
