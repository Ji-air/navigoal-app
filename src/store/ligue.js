import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
import { LIGUE_SEED, PHASE_GROUPES_OUVERTE, } from '../data/ligue';
import { useAuth } from './auth';
const LigueContext = createContext(null);
function genererCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
export function LigueProvider({ children }) {
    const { session } = useAuth();
    const [ligueActive, setLigueActive] = useState(null);
    // Registre de toutes les ligues connues — pré-semé avec la ligue mock
    const [registre, setRegistre] = useState([LIGUE_SEED]);
    function moiMembre() {
        return {
            utilisateurId: session.id,
            pseudo: session.pseudo,
            positionNm: 0,
            totalBoost: 0,
            isCurrentUser: true,
        };
    }
    function creerLigue(nom) {
        if (nom.trim() === '') {
            return { ok: false, erreur: 'NOM_VIDE' };
        }
        const nouvelle = {
            id: `ligue-${Date.now()}`,
            nom: nom.trim(),
            codeInvitation: genererCode(),
            membres: [moiMembre()],
        };
        setRegistre(prev => [...prev, nouvelle]);
        setLigueActive(nouvelle);
        return { ok: true };
    }
    function rejoindreParCode(code) {
        if (!PHASE_GROUPES_OUVERTE) {
            return { ok: false, erreur: 'PHASE_FERMEE' };
        }
        const normalized = code.trim().toUpperCase();
        const ligue = registre.find(l => l.codeInvitation === normalized);
        if (!ligue) {
            return { ok: false, erreur: 'CODE_INVALIDE' };
        }
        if (ligueActive?.id === ligue.id) {
            return { ok: false, erreur: 'DEJA_MEMBRE' };
        }
        setLigueActive(ligue);
        return { ok: true };
    }
    return (_jsx(LigueContext.Provider, { value: { ligueActive, phaseGroupesOuverte: PHASE_GROUPES_OUVERTE, creerLigue, rejoindreParCode }, children: children }));
}
export function useLigue() {
    const ctx = useContext(LigueContext);
    if (!ctx)
        throw new Error('useLigue must be used inside LigueProvider');
    return ctx;
}
