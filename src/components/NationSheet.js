import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEquipage } from '../store/equipage';
import { MATCHS_JOUR, NATIONS, coteByNationId, nationById, } from '../data/mock';
const POST_LABELS_FR = {
    Captain: 'Captain — Attaquants',
    Second: 'Second — Milieux',
    Navigator: 'Navigator — Milieux',
    Watch: 'Watch — Défenseurs',
    Keeper: 'Keeper — Gardiens',
};
export default function NationSheet() {
    const { state, dispatch, excludedNationIds } = useEquipage();
    if (state.uiPhase !== 'selectingNation' || !state.activePost)
        return null;
    function handleOverlayClick() {
        dispatch({ type: 'CANCEL' });
    }
    function handleNationClick(nation) {
        if (excludedNationIds.has(nation.id))
            return;
        dispatch({ type: 'SELECT_NATION', nation });
    }
    // Trouver la nation qui exclut une nation grisée, pour afficher "Adversaire de X"
    function adversaireDe(nationId) {
        for (const match of MATCHS_JOUR) {
            const adversaireId = match.nationAId === nationId ? match.nationBId :
                match.nationBId === nationId ? match.nationAId : null;
            if (!adversaireId)
                continue;
            // L'adversaire est-il sélectionné dans un autre poste ?
            const autresPostes = Object.entries(state.crew).filter(([post, id]) => post !== state.activePost && id === adversaireId);
            if (autresPostes.length > 0) {
                return nationById(adversaireId)?.nom ?? adversaireId;
            }
        }
        return '';
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: handleOverlayClick }), _jsxs("div", { className: "sheet", children: [_jsx("div", { className: "sheet-handle" }), _jsxs("div", { className: "sheet-header", children: [_jsx("p", { className: "sheet-title", children: state.activePost }), _jsx("p", { className: "sheet-subtitle", children: state.activePost ? POST_LABELS_FR[state.activePost] : '' })] }), _jsx("div", { className: "sheet-body", children: MATCHS_JOUR.map(match => {
                            const nationA = NATIONS.find(n => n.id === match.nationAId);
                            const nationB = NATIONS.find(n => n.id === match.nationBId);
                            const coteA = coteByNationId(match.nationAId);
                            const coteB = coteByNationId(match.nationBId);
                            const griseeA = excludedNationIds.has(match.nationAId);
                            const griseeB = excludedNationIds.has(match.nationBId);
                            return (_jsx("div", { className: "match-card", children: _jsxs("div", { className: "match-card__vs-row", children: [_jsxs("button", { type: "button", className: `nation-btn${griseeA ? ' nation-btn--disabled' : ''}`, onClick: () => handleNationClick(nationA), disabled: griseeA, children: [_jsx("span", { className: "nation-btn__name", children: nationA.nom }), coteA && (_jsx("span", { className: `nation-btn__tier nation-btn__tier--${coteA.palier}`, children: coteA.palier })), griseeA && (_jsxs("span", { className: "nation-btn__reason", children: ["Adversaire de ", adversaireDe(match.nationAId)] }))] }), _jsx("span", { className: "match-card__vs", children: "vs" }), _jsxs("button", { type: "button", className: `nation-btn${griseeB ? ' nation-btn--disabled' : ''}`, onClick: () => handleNationClick(nationB), disabled: griseeB, children: [_jsx("span", { className: "nation-btn__name", children: nationB.nom }), coteB && (_jsx("span", { className: `nation-btn__tier nation-btn__tier--${coteB.palier}`, children: coteB.palier })), griseeB && (_jsxs("span", { className: "nation-btn__reason", children: ["Adversaire de ", adversaireDe(match.nationBId)] }))] })] }) }, match.id));
                        }) })] })] }));
}
