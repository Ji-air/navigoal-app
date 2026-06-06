// COMPORTEMENTS §13 action 6 — agrégation finale
export function calculerScoreJournee(impulsions, bonusDiversite) {
    return impulsions.reduce((sum, v) => sum + v, 0) + bonusDiversite;
}
