import { describe, it, expect } from "vitest";
import { calculerPalier, impulsionDuPalier } from "../palier";
import { evaluerCaptain, evaluerSecond, evaluerNavigator, evaluerWatch, evaluerKeeper, calculerImpulsionPoste, calculerImpulsionCollective, estNationAdverse, nationsGrisees, } from "../impulse";
import { selectionnerMeilleurPerformer } from "../b1";
import { calculerBonusDiversite, seuilDiversite } from "../diversite";
import { calculerScoreJournee } from "../score";
import { trierClassement, departagementBoost } from "../classement";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let _eid = 0;
function mkBut(joueurId, phase = "temps_reglementaire") {
    return { id: `e${_eid++}`, joueurId, type: "but", phaseJeu: phase, officiel: true, minutesJouees: 90 };
}
function mkAssist(joueurId) {
    return { id: `e${_eid++}`, joueurId, type: "assist", phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 };
}
function mkPreAssist(joueurId) {
    return { id: `e${_eid++}`, joueurId, type: "pre_assist", phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 };
}
function mkArret(joueurId) {
    return { id: `e${_eid++}`, joueurId, type: "arret", phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 };
}
// ---------------------------------------------------------------------------
// Module palier — tests unitaires
// ---------------------------------------------------------------------------
describe("calculerPalier", () => {
    it("cote null → Wind (défaut R3)", () => expect(calculerPalier(null)).toBe("Wind"));
    it("cote 1.4 → Breeze (< 2.0)", () => expect(calculerPalier(1.4)).toBe("Breeze"));
    it("cote 1.99 → Breeze", () => expect(calculerPalier(1.99)).toBe("Breeze"));
    it("cote 2.0 → Wind (borne incluse)", () => expect(calculerPalier(2.0)).toBe("Wind"));
    it("cote 3.2 → Wind", () => expect(calculerPalier(3.2)).toBe("Wind"));
    it("cote 4.5 → Wind (borne incluse)", () => expect(calculerPalier(4.5)).toBe("Wind"));
    it("cote 4.51 → Boost", () => expect(calculerPalier(4.51)).toBe("Boost"));
    it("cote 6.0 → Boost", () => expect(calculerPalier(6.0)).toBe("Boost"));
});
describe("impulsionDuPalier", () => {
    it("Breeze → 10nm", () => expect(impulsionDuPalier("Breeze")).toBe(10));
    it("Wind → 20nm", () => expect(impulsionDuPalier("Wind")).toBe(20));
    it("Boost → 40nm", () => expect(impulsionDuPalier("Boost")).toBe(40));
});
// ---------------------------------------------------------------------------
// Module impulse — évaluateurs unitaires
// ---------------------------------------------------------------------------
describe("evaluerCaptain", () => {
    it("but en temps réglementaire → true", () => expect(evaluerCaptain([mkBut("p1")], "p1")).toBe(true));
    it("but en prolongations → true", () => expect(evaluerCaptain([mkBut("p1", "prolongations")], "p1")).toBe(true));
    it("but aux tirs au but → false (CL6)", () => expect(evaluerCaptain([mkBut("p1", "tirs_au_but")], "p1")).toBe(false));
    it("but d'un autre joueur → false", () => expect(evaluerCaptain([mkBut("p2")], "p1")).toBe(false));
    it("assist → false (Captain ne déclenche que sur but)", () => expect(evaluerCaptain([mkAssist("p1")], "p1")).toBe(false));
    it("aucun event → false", () => expect(evaluerCaptain([], "p1")).toBe(false));
    it("event officiel=false ignoré (CL5)", () => {
        const e = { id: "x", joueurId: "p1", type: "but", phaseJeu: "temps_reglementaire", officiel: false, minutesJouees: 90 };
        expect(evaluerCaptain([e], "p1")).toBe(false);
    });
    it("minutesJouees=0 → false (CL1)", () => {
        const e = { id: "x", joueurId: "p1", type: "but", phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 0 };
        expect(evaluerCaptain([e], "p1")).toBe(false);
    });
});
describe("evaluerSecond", () => {
    it("but en temps réglementaire → true", () => expect(evaluerSecond([mkBut("p1")], "p1")).toBe(true));
    it("assist → true", () => expect(evaluerSecond([mkAssist("p1")], "p1")).toBe(true));
    it("pré-assist → true", () => expect(evaluerSecond([mkPreAssist("p1")], "p1")).toBe(true));
    it("but aux tirs au but → false (CL6)", () => expect(evaluerSecond([mkBut("p1", "tirs_au_but")], "p1")).toBe(false));
    it("aucun event → false", () => expect(evaluerSecond([], "p1")).toBe(false));
    it("but d'un autre joueur → false", () => expect(evaluerSecond([mkBut("p2")], "p1")).toBe(false));
});
describe("evaluerNavigator", () => {
    it("pré-assist → true", () => expect(evaluerNavigator([mkPreAssist("p1")], "p1")).toBe(true));
    it("assist → true", () => expect(evaluerNavigator([mkAssist("p1")], "p1")).toBe(true));
    it("but → false (Navigator ne déclenche pas sur but, R2)", () => expect(evaluerNavigator([mkBut("p1")], "p1")).toBe(false));
    it("but aux TAB → false (CL6)", () => expect(evaluerNavigator([mkBut("p1", "tirs_au_but")], "p1")).toBe(false));
    it("aucun event → false", () => expect(evaluerNavigator([], "p1")).toBe(false));
});
describe("evaluerWatch", () => {
    it("0 but encaissé → true (clean sheet)", () => expect(evaluerWatch(0)).toBe(true));
    it("1 but encaissé → true", () => expect(evaluerWatch(1)).toBe(true));
    it("2 buts encaissés → false", () => expect(evaluerWatch(2)).toBe(false));
    it("3 buts encaissés → false", () => expect(evaluerWatch(3)).toBe(false));
});
describe("evaluerKeeper", () => {
    it("3 arrêts → true (seuil exact)", () => expect(evaluerKeeper(3)).toBe(true));
    it("4 arrêts → true", () => expect(evaluerKeeper(4)).toBe(true));
    it("2 arrêts → false", () => expect(evaluerKeeper(2)).toBe(false));
    it("0 arrêt → false", () => expect(evaluerKeeper(0)).toBe(false));
});
describe("calculerImpulsionPoste", () => {
    it("poste null (vide) → 0nm", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: null, palier: "Boost", evenements: [], butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(0));
    it("participationMinutes=0 → 0nm (CL1)", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: "p1", palier: "Boost", evenements: [mkBut("p1")], butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 0 })).toBe(0));
    it("Second : assist déclenche (Boost) → 40nm", () => expect(calculerImpulsionPoste({ poste: "Second", joueurId: "p1", palier: "Boost", evenements: [mkAssist("p1")], butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Navigator : but ne déclenche pas → 0nm", () => expect(calculerImpulsionPoste({ poste: "Navigator", joueurId: "p1", palier: "Wind", evenements: [mkBut("p1")], butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(0));
});
// ---------------------------------------------------------------------------
// Module B1 — selectionnerMeilleurPerformer
// ---------------------------------------------------------------------------
describe("selectionnerMeilleurPerformer", () => {
    const ligne = [
        { joueurId: "p1", minutesJouees: 90 },
        { joueurId: "p2", minutesJouees: 90 },
        { joueurId: "p3", minutesJouees: 0 }, // absent (CL1)
    ];
    it("Captain : joueur avec le plus de buts hors TAB", () => {
        const events = [mkBut("p1"), mkBut("p1"), mkBut("p2")];
        expect(selectionnerMeilleurPerformer("Captain", ligne, events)).toBe("p1");
    });
    it("Captain : aucun but → null", () => {
        expect(selectionnerMeilleurPerformer("Captain", ligne, [mkAssist("p1")])).toBeNull();
    });
    it("Captain : joueur absent (CL1) ignoré même s'il marque", () => {
        const events = [mkBut("p3")];
        expect(selectionnerMeilleurPerformer("Captain", ligne, events)).toBeNull();
    });
    it("Second : joueur avec le plus de buts+assists+pré-assists", () => {
        const events = [mkBut("p2"), mkAssist("p2"), mkAssist("p1")];
        expect(selectionnerMeilleurPerformer("Second", ligne, events)).toBe("p2");
    });
    it("Second : aucun event → null", () => {
        expect(selectionnerMeilleurPerformer("Second", ligne, [])).toBeNull();
    });
    it("Navigator : joueur avec le plus d'assists+pré-assists", () => {
        const events = [mkAssist("p1"), mkPreAssist("p1"), mkAssist("p2")];
        expect(selectionnerMeilleurPerformer("Navigator", ligne, events)).toBe("p1");
    });
    it("Navigator : but seul → null (ne compte pas pour Navigator)", () => {
        expect(selectionnerMeilleurPerformer("Navigator", ligne, [mkBut("p1")])).toBeNull();
    });
    it("Watch : joueur avec le plus de minutes parmi éligibles", () => {
        const ligneWatch = [
            { joueurId: "d1", minutesJouees: 90 },
            { joueurId: "d2", minutesJouees: 78 },
            { joueurId: "d3", minutesJouees: 0 },
        ];
        expect(selectionnerMeilleurPerformer("Watch", ligneWatch, [])).toBe("d1");
    });
    it("Watch : tous absents → null", () => {
        const ligneAbsents = [{ joueurId: "d1", minutesJouees: 0 }];
        expect(selectionnerMeilleurPerformer("Watch", ligneAbsents, [])).toBeNull();
    });
    it("Keeper : joueur avec ≥3 arrêts", () => {
        // p1 est dans la ligne et cumule 3 arrêts → B1 Keeper
        const events = [mkArret("p1"), mkArret("p1"), mkArret("p1")];
        expect(selectionnerMeilleurPerformer("Keeper", ligne, events)).toBe("p1");
    });
    it("Keeper : 2 arrêts → null (seuil non atteint)", () => {
        const events = [mkArret("p1"), mkArret("p1")];
        expect(selectionnerMeilleurPerformer("Keeper", ligne, events)).toBeNull();
    });
});
// ---------------------------------------------------------------------------
// Module diversité
// ---------------------------------------------------------------------------
describe("seuilDiversite", () => {
    it("N=1 → null (pas de bonus)", () => expect(seuilDiversite(1)).toBeNull());
    it("N=2 → 1", () => expect(seuilDiversite(2)).toBe(1));
    it("N=3 → 1", () => expect(seuilDiversite(3)).toBe(1));
    it("N=4 → 2", () => expect(seuilDiversite(4)).toBe(2));
    it("N=6 → 2", () => expect(seuilDiversite(6)).toBe(2));
    it("N=7 → null", () => expect(seuilDiversite(7)).toBeNull());
});
// ---------------------------------------------------------------------------
// SCÉNARIO 1 — J3, 4 matchs, journée solide sans bonus diversité
// ---------------------------------------------------------------------------
describe("Scénario 1 — J3 journée solide sans bonus diversité", () => {
    const MBAPPE = "mbappe";
    const SALAH = "salah";
    const DE_BRUYNE = "de_bruyne";
    const MILITAO = "militao";
    const ALISSON = "alisson";
    const eventsFrance = [mkBut(MBAPPE)];
    const eventsEgypte = [];
    const eventsBelgique = [mkPreAssist(DE_BRUYNE)];
    const eventsBresil = [mkArret(ALISSON), mkArret(ALISSON), mkArret(ALISSON), mkArret(ALISSON)];
    it("Captain Mbappé (France, Breeze) → 10nm", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: MBAPPE, palier: "Breeze", evenements: eventsFrance, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(10));
    it("Second Salah (Égypte, Wind) → 0nm (ne marque pas)", () => expect(calculerImpulsionPoste({ poste: "Second", joueurId: SALAH, palier: "Wind", evenements: eventsEgypte, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(0));
    it("Navigator De Bruyne (Belgique, Breeze) → 10nm (pré-assist)", () => expect(calculerImpulsionPoste({ poste: "Navigator", joueurId: DE_BRUYNE, palier: "Breeze", evenements: eventsBelgique, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(10));
    it("Watch Militão (Brésil, Breeze) → 10nm (0 but encaissé)", () => expect(calculerImpulsionPoste({ poste: "Watch", joueurId: MILITAO, palier: "Breeze", evenements: eventsBresil, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(10));
    it("Keeper Alisson (Brésil, Breeze) → 10nm (4 arrêts)", () => expect(calculerImpulsionPoste({ poste: "Keeper", joueurId: ALISSON, palier: "Breeze", evenements: eventsBresil, butsEncaissesNation: 0, arretsDuJoueur: 4, participationMinutes: 90 })).toBe(10));
    it("Collectifs France + Belgique + Brésil (Breeze) → 3 × 10nm = 30nm", () => {
        expect(calculerImpulsionCollective("Breeze")).toBe(10);
        expect(calculerImpulsionCollective("Breeze")).toBe(10);
        expect(calculerImpulsionCollective("Breeze")).toBe(10);
    });
    it("Bonus diversité : N=4, 1 outsider (Égypte) < seuil 2 → 0nm", () => expect(calculerBonusDiversite({
        nombreMatchesTermines: 4,
        paliersNationsEquipage: ["Breeze", "Wind", "Breeze", "Breeze"],
        nombreImpulsionsDeclenchees: 7,
    })).toBe(0));
    it("Score total J3 → 70nm", () => {
        const impulsions = [10, 0, 10, 10, 10, 10, 10, 10];
        expect(calculerScoreJournee(impulsions, 0)).toBe(70);
    });
});
// ---------------------------------------------------------------------------
// SCÉNARIO 2 — J8, deux postes même nation (Arabie Saoudite)
// ---------------------------------------------------------------------------
describe("Scénario 2 — J8 deux postes même nation, sans bonus", () => {
    const AL_DAWSARI = "al_dawsari";
    const AL_OWAIS = "al_owais";
    const eventsSA = [mkBut(AL_DAWSARI)];
    it("Captain Al-Dawsari (Arabie Saoudite, Boost) → 40nm", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: AL_DAWSARI, palier: "Boost", evenements: eventsSA, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Keeper Al-Owais (Arabie Saoudite, Boost) → 40nm (3 arrêts)", () => expect(calculerImpulsionPoste({ poste: "Keeper", joueurId: AL_OWAIS, palier: "Boost", evenements: eventsSA, butsEncaissesNation: 0, arretsDuJoueur: 3, participationMinutes: 90 })).toBe(40));
    it("Collectif Arabie Saoudite (Boost) → 40nm — une seule impulsion R4", () => expect(calculerImpulsionCollective("Boost")).toBe(40));
    it("Bonus diversité : N=1 (1 match terminé) → seuilDiversite(1)=null → 0nm", () => expect(calculerBonusDiversite({
        nombreMatchesTermines: 1,
        paliersNationsEquipage: ["Boost"],
        nombreImpulsionsDeclenchees: 3,
    })).toBe(0));
    it("Score total J8 → 120nm", () => expect(calculerScoreJournee([40, 40, 40], 0)).toBe(120));
});
// ---------------------------------------------------------------------------
// SCÉNARIO 3 — J5, tous postes Favoris, un seul déclenchement
// ---------------------------------------------------------------------------
describe("Scénario 3 — J5 défensive minimale, bonus inactif", () => {
    const OCHOA = "ochoa";
    it("Keeper Ochoa (Mexique, Breeze) → 10nm (3 arrêts)", () => expect(calculerImpulsionPoste({ poste: "Keeper", joueurId: OCHOA, palier: "Breeze", evenements: [], butsEncaissesNation: 0, arretsDuJoueur: 3, participationMinutes: 90 })).toBe(10));
    it("Autres postes Favoris sans event → 0nm chacun", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: "cap", palier: "Breeze", evenements: [], butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(0));
    it("Bonus diversité : N=3, 0 outsider (tous Breeze) < seuil 1 → 0nm", () => expect(calculerBonusDiversite({
        nombreMatchesTermines: 3,
        paliersNationsEquipage: ["Breeze", "Breeze", "Breeze", "Breeze", "Breeze"],
        nombreImpulsionsDeclenchees: 1,
    })).toBe(0));
    it("Score total J5 → 10nm", () => expect(calculerScoreJournee([10], 0)).toBe(10));
});
// ---------------------------------------------------------------------------
// SCÉNARIO 4 — J14, record absolu théorique
// ---------------------------------------------------------------------------
describe("Scénario 4 — J14 record absolu, bonus maximum", () => {
    const AL_DAWSARI = "al_dawsari_s4";
    const ABOUBAKAR = "aboubakar";
    const KUDUS = "kudus";
    const DEMIRAL = "demiral";
    const AL_OWAIS = "al_owais_s4";
    const eventsSA = [mkBut(AL_DAWSARI)];
    const eventsCameroun = [mkBut(ABOUBAKAR)];
    const eventsGhana = [mkPreAssist(KUDUS)];
    const eventsTurquie = [];
    it("Captain Al-Dawsari (Boost) → 40nm", () => expect(calculerImpulsionPoste({ poste: "Captain", joueurId: AL_DAWSARI, palier: "Boost", evenements: eventsSA, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Second Aboubakar (Boost) → 40nm", () => expect(calculerImpulsionPoste({ poste: "Second", joueurId: ABOUBAKAR, palier: "Boost", evenements: eventsCameroun, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Navigator Kudus (Boost) → 40nm (pré-assist)", () => expect(calculerImpulsionPoste({ poste: "Navigator", joueurId: KUDUS, palier: "Boost", evenements: eventsGhana, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Watch Demiral (Boost) → 40nm (0 but encaissé)", () => expect(calculerImpulsionPoste({ poste: "Watch", joueurId: DEMIRAL, palier: "Boost", evenements: eventsTurquie, butsEncaissesNation: 0, arretsDuJoueur: 0, participationMinutes: 90 })).toBe(40));
    it("Keeper Al-Owais (Boost) → 40nm (4 arrêts)", () => expect(calculerImpulsionPoste({ poste: "Keeper", joueurId: AL_OWAIS, palier: "Boost", evenements: eventsSA, butsEncaissesNation: 0, arretsDuJoueur: 4, participationMinutes: 90 })).toBe(40));
    it("4 collectifs Boost → 4 × 40nm = 160nm", () => {
        const total = ["Boost", "Boost", "Boost", "Boost"].reduce((sum, p) => sum + calculerImpulsionCollective(p), 0);
        expect(total).toBe(160);
    });
    it("Bonus diversité : N=6, 4 outsiders ≥ seuil 2, 9 impulsions → 90nm", () => expect(calculerBonusDiversite({
        nombreMatchesTermines: 6,
        paliersNationsEquipage: ["Boost", "Boost", "Boost", "Boost"],
        nombreImpulsionsDeclenchees: 9,
    })).toBe(90));
    it("Score total J14 → 450nm", () => {
        const impulsions = [40, 40, 40, 40, 40, 40, 40, 40, 40];
        expect(calculerScoreJournee(impulsions, 90)).toBe(450);
    });
});
// ---------------------------------------------------------------------------
// SCÉNARIO 5 — J4, règle d'exclusion R6 (unidirectionnelle)
// ---------------------------------------------------------------------------
describe("Scénario 5 — J4 règle d'exclusion R6", () => {
    const matches = [
        { nationAId: "espagne", nationBId: "cap_vert" },
        { nationAId: "allemagne", nationBId: "curacao" },
        { nationAId: "france", nationBId: "mexique" },
        { nationAId: "bresil", nationBId: "argentine" },
    ];
    it("Sélectionner Espagne (Captain) → Cap-Vert grisé", () => expect(nationsGrisees(["espagne"], matches)).toContain("cap_vert"));
    it("Sélectionner Espagne → Allemagne et Curaçao NON grisés (unidirectionnel)", () => {
        const grisees = nationsGrisees(["espagne"], matches);
        expect(grisees).not.toContain("allemagne");
        expect(grisees).not.toContain("curacao");
    });
    it("Cap-Vert est adversaire d'Espagne → estNationAdverse = true", () => expect(estNationAdverse("cap_vert", ["espagne"], matches)).toBe(true));
    it("Allemagne n'est pas adversaire d'Espagne → estNationAdverse = false", () => expect(estNationAdverse("allemagne", ["espagne"], matches)).toBe(false));
    it("Sélectionner Espagne + Allemagne → Cap-Vert ET Curaçao grisés", () => {
        const grisees = nationsGrisees(["espagne", "allemagne"], matches);
        expect(grisees).toContain("cap_vert");
        expect(grisees).toContain("curacao");
    });
    it("Sélectionner Allemagne seule → Curaçao grisé, Espagne NON grisée", () => {
        const grisees = nationsGrisees(["allemagne"], matches);
        expect(grisees).toContain("curacao");
        expect(grisees).not.toContain("espagne");
    });
    it("Aucune sélection → aucune nation grisée", () => expect(nationsGrisees([], matches)).toHaveLength(0));
});
// ---------------------------------------------------------------------------
// Module classement — tests unitaires R15
// ---------------------------------------------------------------------------
describe("trierClassement / departagementBoost", () => {
    it("tri par positionNm décroissant", () => {
        const entrees = [
            { utilisateurId: "b", positionNm: 300, totalBoost: 0 },
            { utilisateurId: "a", positionNm: 500, totalBoost: 0 },
            { utilisateurId: "c", positionNm: 200, totalBoost: 0 },
        ];
        const sorted = trierClassement(entrees);
        expect(sorted.map(e => e.utilisateurId)).toEqual(["a", "b", "c"]);
    });
    it("égalité positionNm : départage par totalBoost décroissant", () => {
        const entrees = [
            { utilisateurId: "x", positionNm: 400, totalBoost: 3 },
            { utilisateurId: "y", positionNm: 400, totalBoost: 7 },
        ];
        const sorted = trierClassement(entrees);
        expect(sorted[0].utilisateurId).toBe("y");
        expect(sorted[1].utilisateurId).toBe("x");
    });
    it("égalité persistante (même nm, même boost) → ex-aequo, ordre stable", () => {
        const entrees = [
            { utilisateurId: "m", positionNm: 300, totalBoost: 2 },
            { utilisateurId: "n", positionNm: 300, totalBoost: 2 },
        ];
        const sorted = trierClassement(entrees);
        expect(sorted).toHaveLength(2);
        expect(sorted.map(e => e.utilisateurId)).toContain("m");
        expect(sorted.map(e => e.utilisateurId)).toContain("n");
    });
    it("departagementBoost : A(boost=3) vs B(boost=5) → B avant A", () => {
        const a = { utilisateurId: "a", positionNm: 100, totalBoost: 3 };
        const b = { utilisateurId: "b", positionNm: 100, totalBoost: 5 };
        expect(departagementBoost(a, b)).toBeGreaterThan(0);
    });
    it("ligue à un seul membre → tableau inchangé", () => {
        const entrees = [{ utilisateurId: "solo", positionNm: 100, totalBoost: 1 }];
        expect(trierClassement(entrees)).toHaveLength(1);
    });
    it("tableau vide → tableau vide", () => expect(trierClassement([])).toHaveLength(0));
});
