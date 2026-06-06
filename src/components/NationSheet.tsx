import React from 'react'
import { useEquipage } from '../store/equipage'
import {
  MATCHS_JOUR,
  NATIONS,
  coteByNationId,
  nationById,
  type Nation,
} from '../data/mock'

const POST_LABELS_FR: Record<string, string> = {
  Captain:   'Captain — Attaquants',
  Second:    'Second — Milieux',
  Navigator: 'Navigator — Milieux',
  Watch:     'Watch — Défenseurs',
  Keeper:    'Keeper — Gardiens',
}

export default function NationSheet() {
  const { state, dispatch, excludedNationIds } = useEquipage()

  if (state.uiPhase !== 'selectingNation' || !state.activePost) return null

  function handleOverlayClick() {
    dispatch({ type: 'CANCEL' })
  }

  function handleNationClick(nation: Nation) {
    if (excludedNationIds.has(nation.id)) return
    dispatch({ type: 'SELECT_NATION', nation })
  }

  // Trouver la nation qui exclut une nation grisée, pour afficher "Adversaire de X"
  function adversaireDe(nationId: string): string {
    for (const match of MATCHS_JOUR) {
      const adversaireId =
        match.nationAId === nationId ? match.nationBId :
        match.nationBId === nationId ? match.nationAId : null

      if (!adversaireId) continue

      // L'adversaire est-il sélectionné dans un autre poste ?
      const autresPostes = Object.entries(state.crew).filter(
        ([post, id]) => post !== state.activePost && id === adversaireId
      )
      if (autresPostes.length > 0) {
        return nationById(adversaireId)?.nom ?? adversaireId
      }
    }
    return ''
  }

  return (
    <>
      <div className="sheet-overlay" onClick={handleOverlayClick} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <p className="sheet-title">{state.activePost}</p>
          <p className="sheet-subtitle">
            {state.activePost ? POST_LABELS_FR[state.activePost] : ''}
          </p>
        </div>
        <div className="sheet-body">
          {MATCHS_JOUR.map(match => {
            const nationA = NATIONS.find(n => n.id === match.nationAId)!
            const nationB = NATIONS.find(n => n.id === match.nationBId)!
            const coteA = coteByNationId(match.nationAId)
            const coteB = coteByNationId(match.nationBId)
            const griseeA = excludedNationIds.has(match.nationAId)
            const griseeB = excludedNationIds.has(match.nationBId)

            return (
              <div className="match-card" key={match.id}>
                <div className="match-card__vs-row">
                  <button
                    type="button"
                    className={`nation-btn${griseeA ? ' nation-btn--disabled' : ''}`}
                    onClick={() => handleNationClick(nationA)}
                    disabled={griseeA}
                  >
                    <span className="nation-btn__name">{nationA.nom}</span>
                    {coteA && (
                      <span className={`nation-btn__tier nation-btn__tier--${coteA.palier}`}>
                        {coteA.palier}
                      </span>
                    )}
                    {griseeA && (
                      <span className="nation-btn__reason">
                        Adversaire de {adversaireDe(match.nationAId)}
                      </span>
                    )}
                  </button>

                  <span className="match-card__vs">vs</span>

                  <button
                    type="button"
                    className={`nation-btn${griseeB ? ' nation-btn--disabled' : ''}`}
                    onClick={() => handleNationClick(nationB)}
                    disabled={griseeB}
                  >
                    <span className="nation-btn__name">{nationB.nom}</span>
                    {coteB && (
                      <span className={`nation-btn__tier nation-btn__tier--${coteB.palier}`}>
                        {coteB.palier}
                      </span>
                    )}
                    {griseeB && (
                      <span className="nation-btn__reason">
                        Adversaire de {adversaireDe(match.nationBId)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
