import { impulsionDuPalier } from "./palier";
// R2 — Captain : but officiel hors tirs au but (CL5, CL6)
export function evaluerCaptain(evenements, joueurId) {
    return evenements.some(e => e.joueurId === joueurId &&
        e.type === "but" &&
        e.phaseJeu !== "tirs_au_but" &&
        e.officiel &&
        e.minutesJouees >= 1);
}
// R2 — Second : but, assist ou pré-assist officiel hors tirs au but (CL5)
export function evaluerSecond(evenements, joueurId) {
    return evenements.some(e => e.joueurId === joueurId &&
        (e.type === "but" || e.type === "assist" || e.type === "pre_assist") &&
        e.phaseJeu !== "tirs_au_but" &&
        e.officiel &&
        e.minutesJouees >= 1);
}
// R2 — Navigator : assist ou pré-assist officiel hors tirs au but (CL5, CL6)
// Note : les buts ne déclenchent PAS le Navigator (R2 — "assists + pré-assists" uniquement)
export function evaluerNavigator(evenements, joueurId) {
    return evenements.some(e => e.joueurId === joueurId &&
        (e.type === "assist" || e.type === "pre_assist") &&
        e.phaseJeu !== "tirs_au_but" &&
        e.officiel &&
        e.minutesJouees >= 1);
}
// R2 — Watch : nation du joueur n'a encaissé que 0 ou 1 but (prolongations incluses, TAB exclus)
export function evaluerWatch(butsEncaissesNation) {
    return butsEncaissesNation <= 1;
}
// R2 — Keeper : 3 arrêts ou plus
export function evaluerKeeper(arretsDuJoueur) {
    return arretsDuJoueur >= 3;
}
// R2 fonction principale — orchestre les évaluateurs selon le poste
export function calculerImpulsionPoste(ctx) {
    if (ctx.joueurId === null)
        return 0; // poste vide (R1/R7)
    if (ctx.participationMinutes < 1)
        return 0; // joueur absent (CL1)
    const nm = impulsionDuPalier(ctx.palier);
    switch (ctx.poste) {
        case "Captain":
            return evaluerCaptain(ctx.evenements, ctx.joueurId) ? nm : 0;
        case "Second":
            return evaluerSecond(ctx.evenements, ctx.joueurId) ? nm : 0;
        case "Navigator":
            return evaluerNavigator(ctx.evenements, ctx.joueurId) ? nm : 0;
        case "Watch":
            return evaluerWatch(ctx.butsEncaissesNation) ? nm : 0;
        case "Keeper":
            return evaluerKeeper(ctx.arretsDuJoueur) ? nm : 0;
    }
}
// R4 — impulsion collective : victoire d'une nation présente dans l'équipage
export function calculerImpulsionCollective(palier) {
    return impulsionDuPalier(palier);
}
// R6 — vrai si nationId est l'adversaire direct d'une des nations sélectionnées
export function estNationAdverse(nationId, nationsSelectionnees, matchesJournee) {
    return nationsSelectionnees.some(selected => matchesJournee.some(m => (m.nationAId === selected && m.nationBId === nationId) ||
        (m.nationBId === selected && m.nationAId === nationId)));
}
// R6 — retourne la liste des nationId grisées pour les postes restants
export function nationsGrisees(nationsSelectionnees, matchesJournee) {
    const grisees = new Set();
    for (const nation of nationsSelectionnees) {
        for (const match of matchesJournee) {
            if (match.nationAId === nation)
                grisees.add(match.nationBId);
            else if (match.nationBId === nation)
                grisees.add(match.nationAId);
        }
    }
    return Array.from(grisees);
}
