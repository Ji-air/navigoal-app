import React, { useState } from "react"
import { useEquipage } from "../store/equipage"
import { useLigue } from "../store/ligue"
import { useScoreJournee } from "../hooks/useScoreJournee"
import { useClassementLigue } from "../hooks/useClassementLigue"
import type { EntreeClassementLigue } from "../hooks/useClassementLigue"

// ---------------------------------------------------------------------------
// Ligne de classement
// ---------------------------------------------------------------------------

function LigneClassement({ entry, precedent }: {
  entry: EntreeClassementLigue
  precedent: EntreeClassementLigue | null
}) {
  const exAequo = precedent !== null && entry.rang === precedent.rang

  return (
    <div className={`classement-row${entry.isCurrentUser ? " classement-row--user" : ""}`}>
      <span className="classement-row__rang">{exAequo ? "=" : entry.rang}</span>

      <span className="classement-row__pseudo">
        {entry.isCurrentUser && <span className="classement-row__marker">▶</span>}
        {entry.pseudo}
        {entry.totalBoost > 0 && (
          <span className="classement-row__boost" title="Départage Boost">
            ⬡{entry.totalBoost}
          </span>
        )}
      </span>

      <span className="classement-row__nm">{entry.positionNm}nm</span>

      <span className="classement-row__ecart">
        {entry.ecartPrecedentNm === null ? "" :
         entry.ecartPrecedentNm === 0
           ? <span className="classement-row__ecart--eq">ex-æquo</span>
           : <span className="classement-row__ecart--behind">▼ {entry.ecartPrecedentNm}nm</span>
        }
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lien d'invitation + bouton copier
// ---------------------------------------------------------------------------

function SectionPartage({ codeInvitation }: { codeInvitation: string }) {
  const [copie, setCopie] = useState(false)
  const lien = `https://navigoal.app/join/${codeInvitation}`

  function copierLien() {
    navigator.clipboard.writeText(lien).then(() => {
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    })
  }

  return (
    <div className="ligue-share">
      <div className="ligue-share__row">
        <span className="ligue-share__label">Code</span>
        <span className="ligue-share__code">{codeInvitation}</span>
      </div>
      <div className="ligue-share__row ligue-share__row--link">
        <span className="ligue-share__lien">{lien}</span>
        <button
          type="button"
          className="ligue-share__copier"
          onClick={copierLien}
        >
          {copie ? "Copié !" : "Copier"}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vue "sans ligue"
// ---------------------------------------------------------------------------

const MESSAGES_ERREUR: Record<string, string> = {
  NOM_VIDE:     "Le nom de la ligue ne peut pas être vide.",
  CODE_INVALIDE:"Code introuvable — vérifie l'invitation.",
  DEJA_MEMBRE:  "Tu es déjà membre de cette ligue.",
  PHASE_FERMEE: "Les inscriptions ferment à la fin de la phase de groupes.",
}

function VueSansLigue() {
  const { creerLigue, rejoindreParCode, phaseGroupesOuverte } = useLigue()

  const [nomLigue, setNomLigue] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [erreurCreer, setErreurCreer] = useState("")
  const [erreurRejoindre, setErreurRejoindre] = useState("")

  function handleCreer(e: React.FormEvent) {
    e.preventDefault()
    setErreurCreer("")
    const res = creerLigue(nomLigue)
    if (!res.ok) setErreurCreer(MESSAGES_ERREUR[res.erreur] ?? res.erreur)
  }

  function handleRejoindre(e: React.FormEvent) {
    e.preventDefault()
    setErreurRejoindre("")
    const res = rejoindreParCode(codeInput)
    if (!res.ok) setErreurRejoindre(MESSAGES_ERREUR[res.erreur] ?? res.erreur)
  }

  return (
    <div className="ligue-empty">
      <p className="ligue-empty__titre">Tu n'as pas encore de ligue</p>
      <p className="ligue-empty__hint">
        Crée une ligue ou rejoins-en une pour valider ton équipage et apparaître au classement.
      </p>

      {/* Créer */}
      <form className="ligue-form" onSubmit={handleCreer}>
        <p className="ligue-form__label">Créer une ligue</p>
        <div className="ligue-form__row">
          <input
            className="ligue-form__input"
            type="text"
            placeholder="Nom de ta ligue…"
            value={nomLigue}
            onChange={e => setNomLigue(e.target.value)}
            maxLength={40}
          />
          <button className="ligue-form__btn" type="submit">Créer</button>
        </div>
        {erreurCreer && <p className="ligue-form__erreur">{erreurCreer}</p>}
      </form>

      <div className="ligue-separateur">ou</div>

      {/* Rejoindre */}
      <form className="ligue-form" onSubmit={handleRejoindre}>
        <p className="ligue-form__label">Rejoindre avec un code</p>
        <div className="ligue-form__row">
          <input
            className="ligue-form__input ligue-form__input--code"
            type="text"
            placeholder="ex. PIRATES"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            disabled={!phaseGroupesOuverte}
          />
          <button
            className="ligue-form__btn"
            type="submit"
            disabled={!phaseGroupesOuverte}
          >
            Rejoindre
          </button>
        </div>
        {!phaseGroupesOuverte && (
          <p className="ligue-form__erreur">{MESSAGES_ERREUR.PHASE_FERMEE}</p>
        )}
        {erreurRejoindre && <p className="ligue-form__erreur">{erreurRejoindre}</p>}
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Classement
// ---------------------------------------------------------------------------

export default function ClassementPage() {
  const { state } = useEquipage()
  const { ligueActive } = useLigue()
  const { totalNm, totalBoost } = useScoreJournee(state.crew)
  const classement = useClassementLigue(
    ligueActive?.membres ?? [],
    totalNm,
    totalBoost,
  )

  const monRang = classement.find(e => e.isCurrentUser)?.rang ?? "—"

  if (!ligueActive) {
    return (
      <div className="classement-page">
        <div className="classement-page__header">
          <h1 className="classement-page__title">Classement</h1>
        </div>
        <VueSansLigue />
      </div>
    )
  }

  return (
    <div className="classement-page">
      <div className="classement-page__header">
        <h1 className="classement-page__title">Classement</h1>
        <p className="classement-page__ligue">{ligueActive.nom}</p>
      </div>

      <div className="classement-meta">
        <span className="classement-meta__rang">
          Ta position : <strong>{monRang}</strong>
        </span>
        <span className="classement-meta__nm">{totalNm}nm</span>
      </div>

      <div className="classement-list">
        {classement.map((entry, i) => (
          <LigneClassement
            key={entry.utilisateurId}
            entry={entry}
            precedent={i > 0 ? classement[i - 1] : null}
          />
        ))}
      </div>

      <SectionPartage codeInvitation={ligueActive.codeInvitation} />

      <p className="classement-note">
        Départage par nombre d'impulsions Boost (40nm) — journées cumulées
      </p>
    </div>
  )
}
