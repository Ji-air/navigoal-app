import { useMemo } from "react";
import { selectionnerMeilleurPerformer } from "../logic/b1";
import { calculerImpulsionPoste, calculerImpulsionCollective, } from "../logic/impulse";
import { calculerBonusDiversite } from "../logic/diversite";
import { calculerScoreJournee } from "../logic/score";
import { MATCHS_JOUR, COTES, JOUEURS } from "../data/mock";
import { RESULTATS_J1 } from "../data/matchs";
const POSTES = ["Captain", "Second", "Navigator", "Watch", "Keeper"];
function palierNation(nationId) {
    return COTES.find(c => c.nationId === nationId)?.palier ?? "Wind";
}
function nomJoueur(joueurId) {
    return JOUEURS.find(j => j.id === joueurId)?.nom ?? joueurId;
}
function winner(res, nationAId, nationBId) {
    if (res.vainqueurTirsAuBut)
        return res.vainqueurTirsAuBut;
    if (res.scoreNationA > res.scoreNationB)
        return nationAId;
    if (res.scoreNationB > res.scoreNationA)
        return nationBId;
    return null;
}
function computeScore(crew) {
    const toutesImpulsions = [];
    const parMatch = [];
    // Paliers des nations distinctes de l'équipage (R5 : nations distinctes)
    const nationsDistinctes = new Set(Object.values(crew).filter((id) => id !== null));
    const paliersEquipage = Array.from(nationsDistinctes).map(palierNation);
    for (const match of MATCHS_JOUR) {
        const res = RESULTATS_J1.find(r => r.matchId === match.id);
        if (!res || res.statut !== "terminé") {
            parMatch.push({
                matchId: match.id,
                statut: res?.statut ?? "planifié",
                scoreNationA: 0, scoreNationB: 0,
                vainqueurTirsAuBut: null,
                postesDeclenches: [],
                collectifNm: 0,
                nationVictorieuse: null,
            });
            continue;
        }
        const { nationAId, nationBId } = match;
        const nationGagnante = winner(res, nationAId, nationBId);
        const postesDeclenches = [];
        // R2 — impulsions de poste
        for (const poste of POSTES) {
            const nationId = crew[poste];
            if (!nationId)
                continue;
            const isA = nationId === nationAId;
            const isB = nationId === nationBId;
            if (!isA && !isB)
                continue;
            const data = isA ? res.nationA : res.nationB;
            const palier = palierNation(nationId);
            const ligneJoueurs = data.ligneParPoste[poste];
            const b1Id = selectionnerMeilleurPerformer(poste, ligneJoueurs, data.evenements);
            const arretsDuJoueur = b1Id
                ? data.evenements.filter(e => e.joueurId === b1Id && e.type === "arret").length
                : 0;
            const participationMinutes = b1Id
                ? (ligneJoueurs.find(j => j.joueurId === b1Id)?.minutesJouees ?? 0)
                : 0;
            const nm = calculerImpulsionPoste({
                poste,
                joueurId: b1Id,
                palier,
                evenements: data.evenements,
                butsEncaissesNation: data.butsEncaisses,
                arretsDuJoueur,
                participationMinutes,
            });
            toutesImpulsions.push(nm);
            postesDeclenches.push({
                poste,
                nationId,
                joueurB1Nom: b1Id ? nomJoueur(b1Id) : null,
                nm,
                declenchee: nm > 0,
            });
        }
        // R4 — impulsion collective (une seule par nation victorieuse — §12 action 3)
        let collectifNm = 0;
        if (nationGagnante) {
            const presenteDansEquipage = Object.values(crew).some(id => id === nationGagnante);
            if (presenteDansEquipage) {
                collectifNm = calculerImpulsionCollective(palierNation(nationGagnante));
                toutesImpulsions.push(collectifNm);
            }
        }
        parMatch.push({
            matchId: match.id,
            statut: res.statut,
            scoreNationA: res.scoreNationA,
            scoreNationB: res.scoreNationB,
            vainqueurTirsAuBut: res.vainqueurTirsAuBut,
            postesDeclenches,
            collectifNm,
            nationVictorieuse: nationGagnante,
        });
    }
    // R5 — bonus diversité
    const nombreTermines = RESULTATS_J1.filter(r => r.statut === "terminé").length;
    const nombreDeclenchees = toutesImpulsions.filter(v => v > 0).length;
    const bonusDiversite = calculerBonusDiversite({
        nombreMatchesTermines: nombreTermines,
        paliersNationsEquipage: paliersEquipage,
        nombreImpulsionsDeclenchees: nombreDeclenchees,
    });
    const totalNm = calculerScoreJournee(toutesImpulsions, bonusDiversite);
    const totalBoost = toutesImpulsions.filter(v => v === 40).length;
    return { parMatch, bonusDiversite, totalNm, totalBoost };
}
export function useScoreJournee(crew) {
    return useMemo(() => computeScore(crew), [crew]);
}
