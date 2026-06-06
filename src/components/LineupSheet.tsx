import React from 'react'
import { useEquipage } from '../store/equipage'
import { joueursByNationAndPoste, LIGNE_PAR_POSTE } from '../data/mock'

export default function LineupSheet() {
  const { state, dispatch } = useEquipage()

  if (state.uiPhase !== 'confirmingLineup' || !state.activePost || !state.pendingNation) {
    return null
  }

  const { activePost, pendingNation } = state
  const ligne = LIGNE_PAR_POSTE[activePost]
  const joueurs = joueursByNationAndPoste(pendingNation.id, ligne)

  function handleOverlayClick() {
    dispatch({ type: 'CANCEL' })
  }

  function handleBack() {
    dispatch({ type: 'BACK_TO_NATIONS' })
  }

  function handleConfirm() {
    dispatch({ type: 'CONFIRM_NATION' })
  }

  return (
    <>
      <div className="sheet-overlay" onClick={handleOverlayClick} />
      <div className="sheet sheet--stacked">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <button className="sheet-header__back" onClick={handleBack} type="button">
            ‹ Changer de nation
          </button>
          <p className="sheet-title">{pendingNation.nom}</p>
          <p className="sheet-subtitle">
            {activePost} — {ligne}
          </p>
        </div>
        <div className="sheet-body">
          <p className="lineup-intro">
            Tous les joueurs de cette ligne seront automatiquement inclus dans ton équipage.
          </p>

          {joueurs.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Aucun joueur disponible pour cette ligne.
            </p>
          ) : (
            <ul className="player-list">
              {joueurs.map(j => (
                <li className="player-item" key={j.id}>
                  <span className="player-item__name">{j.nom}</span>
                  <span className="player-item__poste">{j.posteReel}</span>
                </li>
              ))}
            </ul>
          )}

          <button className="btn-confirm" onClick={handleConfirm} type="button">
            Confirmer {pendingNation.nom}
          </button>
          <button className="btn-back" onClick={handleBack} type="button">
            Retour
          </button>
        </div>
      </div>
    </>
  )
}
