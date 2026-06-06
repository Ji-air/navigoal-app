import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEquipage } from '../store/equipage';
import { joueursByNationAndPoste, LIGNE_PAR_POSTE } from '../data/mock';
export default function LineupSheet() {
    const { state, dispatch } = useEquipage();
    if (state.uiPhase !== 'confirmingLineup' || !state.activePost || !state.pendingNation) {
        return null;
    }
    const { activePost, pendingNation } = state;
    const ligne = LIGNE_PAR_POSTE[activePost];
    const joueurs = joueursByNationAndPoste(pendingNation.id, ligne);
    function handleOverlayClick() {
        dispatch({ type: 'CANCEL' });
    }
    function handleBack() {
        dispatch({ type: 'BACK_TO_NATIONS' });
    }
    function handleConfirm() {
        dispatch({ type: 'CONFIRM_NATION' });
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: handleOverlayClick }), _jsxs("div", { className: "sheet sheet--stacked", children: [_jsx("div", { className: "sheet-handle" }), _jsxs("div", { className: "sheet-header", children: [_jsx("button", { className: "sheet-header__back", onClick: handleBack, type: "button", children: "\u2039 Changer de nation" }), _jsx("p", { className: "sheet-title", children: pendingNation.nom }), _jsxs("p", { className: "sheet-subtitle", children: [activePost, " \u2014 ", ligne] })] }), _jsxs("div", { className: "sheet-body", children: [_jsx("p", { className: "lineup-intro", children: "Tous les joueurs de cette ligne seront automatiquement inclus dans ton \u00E9quipage." }), joueurs.length === 0 ? (_jsx("p", { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }, children: "Aucun joueur disponible pour cette ligne." })) : (_jsx("ul", { className: "player-list", children: joueurs.map(j => (_jsxs("li", { className: "player-item", children: [_jsx("span", { className: "player-item__name", children: j.nom }), _jsx("span", { className: "player-item__poste", children: j.posteReel })] }, j.id))) })), _jsxs("button", { className: "btn-confirm", onClick: handleConfirm, type: "button", children: ["Confirmer ", pendingNation.nom] }), _jsx("button", { className: "btn-back", onClick: handleBack, type: "button", children: "Retour" })] })] })] }));
}
