import React from 'react'
import { useEquipage } from '../store/equipage'
import { nationById, coteByNationId, type PosteNavigoal } from '../data/mock'

const POST_LABELS: Record<PosteNavigoal, string> = {
  Captain:   'Captain',
  Second:    'Second',
  Navigator: 'Navigator',
  Watch:     'Watch',
  Keeper:    'Keeper',
}

const POST_SYMBOLS: Record<PosteNavigoal, string> = {
  Captain:   '⚓',
  Second:    '⎈',
  Navigator: '🧭',
  Watch:     '🔭',
  Keeper:    '🔵',
}

interface Props {
  post: PosteNavigoal
  variant?: 'card' | 'icon'
}

export default function PostSlot({ post, variant = 'card' }: Props) {
  const { state, dispatch, gelState } = useEquipage()
  const nationId = state.crew[post]
  const nation   = nationId ? nationById(nationId)     : null
  const cote     = nationId ? coteByNationId(nationId) : null
  const frozen   = gelState.estGele

  function handleClick() {
    if (!frozen) dispatch({ type: 'SELECT_POST', post })
  }

  if (variant === 'icon') {
    const filledClass = nation ? ' crew-icon--filled' : ''
    const palierClass = cote   ? ` crew-icon--${cote.palier}` : ''
    const frozenClass = frozen ? ' crew-icon--frozen' : ''

    return (
      <button
        type="button"
        className={`crew-icon${filledClass}${palierClass}${frozenClass}`}
        onClick={handleClick}
        disabled={frozen}
        aria-label={`${POST_LABELS[post]}${nation ? ` — ${nation.nom}` : ''}`}
      >
        <span className="crew-icon__circle">
          {nation ? (
            <span className="crew-icon__nation">
              {nation.nom.substring(0, 3).toUpperCase()}
            </span>
          ) : (
            POST_SYMBOLS[post]
          )}
        </span>
        <span className="crew-icon__label">{POST_LABELS[post]}</span>
      </button>
    )
  }

  return (
    <button
      className={`post-slot${frozen ? ' post-slot--frozen' : ''}`}
      onClick={frozen ? undefined : handleClick}
      disabled={frozen}
      type="button"
      aria-disabled={frozen}
    >
      <span className="post-slot__label">{POST_LABELS[post]}</span>

      {nation ? (
        <span className="post-slot__nation">{nation.nom}</span>
      ) : (
        <span className="post-slot__empty">
          {frozen ? 'Non sélectionné' : 'Choisir une nation'}
        </span>
      )}

      {cote && (
        <span className={`post-slot__tier post-slot__tier--${cote.palier}`}>
          {cote.palier}
        </span>
      )}

      {frozen ? (
        <span className="post-slot__frozen-icon" aria-hidden>&#9645;</span>
      ) : (
        <span className="post-slot__arrow">›</span>
      )}
    </button>
  )
}
