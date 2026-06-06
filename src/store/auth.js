import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
const TRENTE_JOURS_MS = 30 * 24 * 60 * 60 * 1000;
const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;
const LS_KEY = 'navigoal_session';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [session, setSession] = useState(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw)
                return null;
            const s = JSON.parse(raw);
            if (Date.now() > s.expiresAt) {
                localStorage.removeItem(LS_KEY);
                return null;
            }
            return s;
        }
        catch {
            return null;
        }
    });
    useEffect(() => {
        if (!session)
            return;
        if (session.expiresAt - Date.now() < SEPT_JOURS_MS) {
            const renewed = { ...session, expiresAt: Date.now() + TRENTE_JOURS_MS };
            localStorage.setItem(LS_KEY, JSON.stringify(renewed));
            setSession(renewed);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    function connexionRapide(pseudo) {
        const s = {
            id: `user-${Date.now()}`,
            pseudo: pseudo.trim(),
            email: '',
            expiresAt: Date.now() + TRENTE_JOURS_MS,
        };
        localStorage.setItem(LS_KEY, JSON.stringify(s));
        setSession(s);
    }
    function seDeconnecter() {
        localStorage.removeItem(LS_KEY);
        setSession(null);
    }
    return (_jsx(AuthContext.Provider, { value: { session, connexionRapide, seDeconnecter }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
