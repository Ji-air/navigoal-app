import type { EvenementMatch, JoueurLigne, PosteNavigoal } from "../logic/impulse"

export type StatutMatch = "planifié" | "en_cours" | "terminé"

export interface NationMatchData {
  // Événements offensifs de la nation dans ce match (officiel=true garanti)
  evenements: EvenementMatch[]
  // Buts concédés hors tirs_au_but (pour Watch condition collective)
  butsEncaisses: number
  // Joueurs par ligne football du poste Navigoal — pour résolution B1
  ligneParPoste: Record<PosteNavigoal, JoueurLigne[]>
}

export interface ResultatMatch {
  matchId: string
  statut: StatutMatch
  scoreNationA: number
  scoreNationB: number
  vainqueurTirsAuBut: string | null  // nationId ou null (CL6)
  nationA: NationMatchData
  nationB: NationMatchData
}

// ---------------------------------------------------------------------------
// Journée 1 — 3 matchs terminés
// ---------------------------------------------------------------------------

// Helpers locaux
let _eid = 0
const mkBut     = (joueurId: string, phase: EvenementMatch["phaseJeu"] = "temps_reglementaire"): EvenementMatch =>
  ({ id: `m-e${_eid++}`, joueurId, type: "but",        phaseJeu: phase, officiel: true, minutesJouees: 90 })
const mkAssist  = (joueurId: string): EvenementMatch =>
  ({ id: `m-e${_eid++}`, joueurId, type: "assist",     phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 })
const mkPreAss  = (joueurId: string): EvenementMatch =>
  ({ id: `m-e${_eid++}`, joueurId, type: "pre_assist", phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 })
const mkArret   = (joueurId: string): EvenementMatch =>
  ({ id: `m-e${_eid++}`, joueurId, type: "arret",      phaseJeu: "temps_reglementaire", officiel: true, minutesJouees: 90 })

// ---------------------------------------------------------------------------
// Match 1 : France (Breeze 1.6) 2–1 Allemagne (Wind 2.8)
// Vainqueur : France
// France : Mbappé 2 buts · Griezmann assist + pré-assist · Maignan 3 arrêts
// Allemagne : Havertz 1 but · ter Stegen 1 arrêt
// ---------------------------------------------------------------------------

const franceEvents: EvenementMatch[] = [
  mkBut("f-fwd-1"),    // Mbappé but
  mkBut("f-fwd-1"),    // Mbappé but
  mkAssist("f-mid-3"), // Griezmann assist
  mkPreAss("f-mid-3"), // Griezmann pré-assist
  mkArret("f-gk-1"),   // Maignan arrêt
  mkArret("f-gk-1"),   // Maignan arrêt
  mkArret("f-gk-1"),   // Maignan arrêt
]

const allemagnePerdEvents: EvenementMatch[] = [
  mkBut("a-fwd-2"),    // Havertz but (Deutschland marque 1)
  mkArret("a-gk-1"),   // ter Stegen arrêt
]

const franceLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "f-fwd-1", minutesJouees: 90 }, { joueurId: "f-fwd-2", minutesJouees: 90 }, { joueurId: "f-fwd-3", minutesJouees: 72 }],
  Second:    [{ joueurId: "f-mid-1", minutesJouees: 90 }, { joueurId: "f-mid-2", minutesJouees: 90 }, { joueurId: "f-mid-3", minutesJouees: 90 }, { joueurId: "f-mid-4", minutesJouees: 76 }],
  Navigator: [{ joueurId: "f-mid-1", minutesJouees: 90 }, { joueurId: "f-mid-2", minutesJouees: 90 }, { joueurId: "f-mid-3", minutesJouees: 90 }, { joueurId: "f-mid-4", minutesJouees: 76 }],
  Watch:     [{ joueurId: "f-def-1", minutesJouees: 90 }, { joueurId: "f-def-2", minutesJouees: 90 }, { joueurId: "f-def-3", minutesJouees: 90 }, { joueurId: "f-def-4", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "f-gk-1",  minutesJouees: 90 }, { joueurId: "f-gk-2",  minutesJouees: 0  }],
}

const allemagneLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "a-fwd-1", minutesJouees: 72 }, { joueurId: "a-fwd-2", minutesJouees: 90 }, { joueurId: "a-fwd-3", minutesJouees: 90 }],
  Second:    [{ joueurId: "a-mid-1", minutesJouees: 90 }, { joueurId: "a-mid-2", minutesJouees: 90 }, { joueurId: "a-mid-3", minutesJouees: 90 }, { joueurId: "a-mid-4", minutesJouees: 78 }],
  Navigator: [{ joueurId: "a-mid-1", minutesJouees: 90 }, { joueurId: "a-mid-2", minutesJouees: 90 }, { joueurId: "a-mid-3", minutesJouees: 90 }, { joueurId: "a-mid-4", minutesJouees: 78 }],
  Watch:     [{ joueurId: "a-def-1", minutesJouees: 90 }, { joueurId: "a-def-2", minutesJouees: 90 }, { joueurId: "a-def-3", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "a-gk-1",  minutesJouees: 90 }, { joueurId: "a-gk-2",  minutesJouees: 0  }],
}

// ---------------------------------------------------------------------------
// Match 2 : Espagne (Wind 2.2) 1–3 Brésil (Wind 2.4)
// Vainqueur : Brésil
// Brésil : Vinicius 2 buts · Paquetá but + assist · Raphinha 2 assists · Alisson 4 arrêts
// Espagne : Morata 1 but · Unai Simón 1 arrêt
// ---------------------------------------------------------------------------

const bresilEvents: EvenementMatch[] = [
  mkBut("b-fwd-1"),    // Vinicius but
  mkBut("b-fwd-1"),    // Vinicius but
  mkBut("b-mid-2"),    // Paquetá but
  mkAssist("b-mid-2"), // Paquetá assist
  mkAssist("b-mid-4"), // Raphinha assist
  mkAssist("b-mid-4"), // Raphinha assist
  mkArret("b-gk-1"),   // Alisson arrêt
  mkArret("b-gk-1"),   // Alisson arrêt
  mkArret("b-gk-1"),   // Alisson arrêt
  mkArret("b-gk-1"),   // Alisson arrêt
]

const espagnePerdEvents: EvenementMatch[] = [
  mkBut("e-fwd-1"),    // Morata but
  mkArret("e-gk-1"),   // Unai Simón arrêt
]

const bresilLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "b-fwd-1", minutesJouees: 90 }, { joueurId: "b-fwd-2", minutesJouees: 78 }, { joueurId: "b-fwd-3", minutesJouees: 65 }],
  Second:    [{ joueurId: "b-mid-1", minutesJouees: 90 }, { joueurId: "b-mid-2", minutesJouees: 90 }, { joueurId: "b-mid-3", minutesJouees: 90 }, { joueurId: "b-mid-4", minutesJouees: 90 }],
  Navigator: [{ joueurId: "b-mid-1", minutesJouees: 90 }, { joueurId: "b-mid-2", minutesJouees: 90 }, { joueurId: "b-mid-3", minutesJouees: 90 }, { joueurId: "b-mid-4", minutesJouees: 90 }],
  Watch:     [{ joueurId: "b-def-1", minutesJouees: 90 }, { joueurId: "b-def-2", minutesJouees: 90 }, { joueurId: "b-def-3", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "b-gk-1",  minutesJouees: 90 }, { joueurId: "b-gk-2",  minutesJouees: 0  }],
}

const espagneLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "e-fwd-1", minutesJouees: 90 }, { joueurId: "e-fwd-2", minutesJouees: 76 }, { joueurId: "e-fwd-3", minutesJouees: 90 }],
  Second:    [{ joueurId: "e-mid-1", minutesJouees: 90 }, { joueurId: "e-mid-2", minutesJouees: 78 }, { joueurId: "e-mid-3", minutesJouees: 90 }, { joueurId: "e-mid-4", minutesJouees: 80 }],
  Navigator: [{ joueurId: "e-mid-1", minutesJouees: 90 }, { joueurId: "e-mid-2", minutesJouees: 78 }, { joueurId: "e-mid-3", minutesJouees: 90 }, { joueurId: "e-mid-4", minutesJouees: 80 }],
  Watch:     [{ joueurId: "e-def-1", minutesJouees: 90 }, { joueurId: "e-def-2", minutesJouees: 90 }, { joueurId: "e-def-3", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "e-gk-1",  minutesJouees: 90 }, { joueurId: "e-gk-2",  minutesJouees: 0  }],
}

// ---------------------------------------------------------------------------
// Match 3 : Argentine (Wind 2.0) 1–1 Angleterre (Wind 3.2), TAB → Angleterre
// Vainqueur : Angleterre (tirs au but — R4 déclenché, CL6)
// Argentine : Messi 1 but · De Paul assist · E. Martínez 5 arrêts
// Angleterre : Kane 1 but · Bellingham assist · Pickford 3 arrêts
// Argentine ne gagne pas → pas de R4 pour Argentine
// ---------------------------------------------------------------------------

const argentineEvents: EvenementMatch[] = [
  mkBut("ar-fwd-1"),    // Messi but
  mkAssist("ar-mid-1"), // De Paul assist
  mkArret("ar-gk-1"),   // E. Martínez arrêt ×5
  mkArret("ar-gk-1"),
  mkArret("ar-gk-1"),
  mkArret("ar-gk-1"),
  mkArret("ar-gk-1"),
]

const angletterreEvents: EvenementMatch[] = [
  mkBut("an-fwd-1"),    // Kane but
  mkAssist("an-mid-1"), // Bellingham assist
  mkArret("an-gk-1"),   // Pickford arrêt ×3
  mkArret("an-gk-1"),
  mkArret("an-gk-1"),
]

const argentineLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "ar-fwd-1", minutesJouees: 90 }, { joueurId: "ar-fwd-2", minutesJouees: 90 }, { joueurId: "ar-fwd-3", minutesJouees: 77 }],
  Second:    [{ joueurId: "ar-mid-1", minutesJouees: 90 }, { joueurId: "ar-mid-2", minutesJouees: 90 }, { joueurId: "ar-mid-3", minutesJouees: 82 }, { joueurId: "ar-mid-4", minutesJouees: 90 }],
  Navigator: [{ joueurId: "ar-mid-1", minutesJouees: 90 }, { joueurId: "ar-mid-2", minutesJouees: 90 }, { joueurId: "ar-mid-3", minutesJouees: 82 }, { joueurId: "ar-mid-4", minutesJouees: 90 }],
  Watch:     [{ joueurId: "ar-def-1", minutesJouees: 90 }, { joueurId: "ar-def-2", minutesJouees: 90 }, { joueurId: "ar-def-3", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "ar-gk-1",  minutesJouees: 90 }, { joueurId: "ar-gk-2",  minutesJouees: 0  }],
}

const angletterreLigne: Record<PosteNavigoal, JoueurLigne[]> = {
  Captain:   [{ joueurId: "an-fwd-1", minutesJouees: 90 }, { joueurId: "an-fwd-2", minutesJouees: 90 }, { joueurId: "an-fwd-3", minutesJouees: 90 }],
  Second:    [{ joueurId: "an-mid-1", minutesJouees: 90 }, { joueurId: "an-mid-2", minutesJouees: 90 }, { joueurId: "an-mid-3", minutesJouees: 88 }, { joueurId: "an-mid-4", minutesJouees: 70 }],
  Navigator: [{ joueurId: "an-mid-1", minutesJouees: 90 }, { joueurId: "an-mid-2", minutesJouees: 90 }, { joueurId: "an-mid-3", minutesJouees: 88 }, { joueurId: "an-mid-4", minutesJouees: 70 }],
  Watch:     [{ joueurId: "an-def-1", minutesJouees: 90 }, { joueurId: "an-def-2", minutesJouees: 90 }, { joueurId: "an-def-3", minutesJouees: 90 }],
  Keeper:    [{ joueurId: "an-gk-1",  minutesJouees: 90 }, { joueurId: "an-gk-2",  minutesJouees: 0  }],
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

export const RESULTATS_J1: ResultatMatch[] = [
  {
    matchId: "m1",
    statut: "terminé",
    scoreNationA: 2, scoreNationB: 1,
    vainqueurTirsAuBut: null,
    nationA: { evenements: franceEvents,       butsEncaisses: 1, ligneParPoste: franceLigne },
    nationB: { evenements: allemagnePerdEvents, butsEncaisses: 2, ligneParPoste: allemagneLigne },
  },
  {
    matchId: "m2",
    statut: "terminé",
    scoreNationA: 1, scoreNationB: 3,
    vainqueurTirsAuBut: null,
    nationA: { evenements: espagnePerdEvents, butsEncaisses: 3, ligneParPoste: espagneLigne },
    nationB: { evenements: bresilEvents,      butsEncaisses: 1, ligneParPoste: bresilLigne },
  },
  {
    matchId: "m3",
    statut: "terminé",
    scoreNationA: 1, scoreNationB: 1,
    vainqueurTirsAuBut: "angleterre",
    nationA: { evenements: argentineEvents,   butsEncaisses: 1, ligneParPoste: argentineLigne },
    nationB: { evenements: angletterreEvents, butsEncaisses: 1, ligneParPoste: angletterreLigne },
  },
]
