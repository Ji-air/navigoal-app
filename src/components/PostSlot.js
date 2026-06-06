import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEquipage } from '../store/equipage';
import { nationById, coteByNationId } from '../data/mock';
const POST_LABELS = {
    Captain: 'Captain',
    Second: 'Second',
    Navigator: 'Navigator',
    Watch: 'Watch',
    Keeper: 'Keeper',
};
const POST_SYMBOLS = {
    Captain: '⚓',
    Second: '⎈',
    Navigator: '🧭',
    Watch: '🔭',
    Keeper: '🔵',
};
export default function PostSlot({ post, variant = 'card' }) {
    const { state, dispatch, gelState } = useEquipage();
    const nationId = state.crew[post];
    const nation = nationId ? nationById(nationId) : null;
    const cote = nationId ? coteByNationId(nationId) : null;
    const frozen = gelState.estGele;
    function handleClick() {
        if (!frozen)
            dispatch({ type: 'SELECT_POST', post });
    }
    if (variant === 'icon') {
        const filledClass = nation ? ' crew-icon--filled' : '';
        const palierClass = cote ? ` crew-icon--${cote.palier}` : '';
        const frozenClass = frozen ? ' crew-icon--frozen' : '';
        return (_jsxs("button", { type: "button", className: `crew-icon${filledClass}${palierClass}${frozenClass}`, onClick: handleClick, disabled: frozen, "aria-label": `${POST_LABELS[post]}${nation ? ` — ${nation.nom}` : ''}`, children: [_jsx("span", { className: "crew-icon__circle", children: nation ? (_jsx("span", { className: "crew-icon__nation", children: nation.nom.substring(0, 3).toUpperCase() })) : (POST_SYMBOLS[post]) }), _jsx("span", { className: "crew-icon__label", children: POST_LABELS[post] })] }));
    }
    return (_jsxs("button", { className: `post-slot${frozen ? ' post-slot--frozen' : ''}`, onClick: frozen ? undefined : handleClick, disabled: frozen, type: "button", "aria-disabled": frozen, children: [_jsx("span", { className: "post-slot__label", children: POST_LABELS[post] }), nation ? (_jsx("span", { className: "post-slot__nation", children: nation.nom })) : (_jsx("span", { className: "post-slot__empty", children: frozen ? 'Non sélectionné' : 'Choisir une nation' })), cote && (_jsx("span", { className: `post-slot__tier post-slot__tier--${cote.palier}`, children: cote.palier })), frozen ? (_jsx("span", { className: "post-slot__frozen-icon", "aria-hidden": true, children: "\u25AD" })) : (_jsx("span", { className: "post-slot__arrow", children: "\u203A" }))] }));
}
