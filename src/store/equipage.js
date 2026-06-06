import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer } from 'react';
import { nationsGrisees } from '../logic/impulse';
import { useGel } from '../hooks/useGel';
import { EMPTY_CREW, MATCHS_JOUR, JOURNEE_COURANTE, KICKOFFS, GEL_DEMO_MODE, } from '../data/mock';
// Actions bloquées quand l'équipage est gelé (comportement 8)
const BLOCKED_WHEN_FROZEN = new Set([
    'SELECT_POST',
    'SELECT_NATION',
    'CONFIRM_NATION',
]);
const initialState = {
    crew: EMPTY_CREW,
    activePost: null,
    pendingNation: null,
    uiPhase: 'idle',
};
function reducer(state, action) {
    switch (action.type) {
        case 'SELECT_POST':
            return {
                ...state,
                activePost: action.post,
                pendingNation: null,
                uiPhase: 'selectingNation',
            };
        case 'SELECT_NATION':
            return {
                ...state,
                pendingNation: action.nation,
                uiPhase: 'confirmingLineup',
            };
        case 'BACK_TO_NATIONS':
            return {
                ...state,
                pendingNation: null,
                uiPhase: 'selectingNation',
            };
        case 'CONFIRM_NATION':
            if (!state.activePost || !state.pendingNation)
                return state;
            return {
                crew: { ...state.crew, [state.activePost]: state.pendingNation.id },
                activePost: null,
                pendingNation: null,
                uiPhase: 'idle',
            };
        case 'CANCEL':
            return {
                ...state,
                activePost: null,
                pendingNation: null,
                uiPhase: 'idle',
            };
    }
}
const EquipageContext = createContext(null);
export function EquipageProvider({ children }) {
    const [state, rawDispatch] = useReducer(reducer, initialState);
    const gelState = useGel(JOURNEE_COURANTE.heure_gel_utc, KICKOFFS, GEL_DEMO_MODE);
    // Bloque les modifications d'équipage une fois gelé (comportement 8)
    function dispatch(action) {
        if (gelState.estGele && BLOCKED_WHEN_FROZEN.has(action.type))
            return;
        rawDispatch(action);
    }
    // R6 : calcule les nations exclues en fonction des postes déjà remplis (hors activePost)
    const selectedInOtherPosts = Object.entries(state.crew)
        .filter(([post, nationId]) => post !== state.activePost && nationId !== null)
        .map(([, nationId]) => nationId);
    const grayed = nationsGrisees(selectedInOtherPosts, MATCHS_JOUR);
    const excludedNationIds = new Set(grayed);
    return (_jsx(EquipageContext.Provider, { value: { state, dispatch, excludedNationIds, gelState }, children: children }));
}
export function useEquipage() {
    const ctx = useContext(EquipageContext);
    if (!ctx)
        throw new Error('useEquipage must be used inside EquipageProvider');
    return ctx;
}
