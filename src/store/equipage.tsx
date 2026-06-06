import React, { createContext, useContext, useReducer } from 'react'
import { nationsGrisees } from '../logic/impulse'
import { useGel, type GelState } from '../hooks/useGel'
import {
  EMPTY_CREW,
  MATCHS_JOUR,
  JOURNEE_COURANTE,
  KICKOFFS,
  GEL_DEMO_MODE,
  type Crew,
  type Nation,
  type PosteNavigoal,
} from '../data/mock'

type UiPhase = 'idle' | 'selectingNation' | 'confirmingLineup'

interface EquipageState {
  crew: Crew
  activePost: PosteNavigoal | null
  pendingNation: Nation | null
  uiPhase: UiPhase
}

type Action =
  | { type: 'SELECT_POST'; post: PosteNavigoal }
  | { type: 'SELECT_NATION'; nation: Nation }
  | { type: 'CONFIRM_NATION' }
  | { type: 'BACK_TO_NATIONS' }
  | { type: 'CANCEL' }

// Actions bloquées quand l'équipage est gelé (comportement 8)
const BLOCKED_WHEN_FROZEN = new Set<Action['type']>([
  'SELECT_POST',
  'SELECT_NATION',
  'CONFIRM_NATION',
])

const initialState: EquipageState = {
  crew: EMPTY_CREW,
  activePost: null,
  pendingNation: null,
  uiPhase: 'idle',
}

function reducer(state: EquipageState, action: Action): EquipageState {
  switch (action.type) {
    case 'SELECT_POST':
      return {
        ...state,
        activePost: action.post,
        pendingNation: null,
        uiPhase: 'selectingNation',
      }

    case 'SELECT_NATION':
      return {
        ...state,
        pendingNation: action.nation,
        uiPhase: 'confirmingLineup',
      }

    case 'BACK_TO_NATIONS':
      return {
        ...state,
        pendingNation: null,
        uiPhase: 'selectingNation',
      }

    case 'CONFIRM_NATION':
      if (!state.activePost || !state.pendingNation) return state
      return {
        crew: { ...state.crew, [state.activePost]: state.pendingNation.id },
        activePost: null,
        pendingNation: null,
        uiPhase: 'idle',
      }

    case 'CANCEL':
      return {
        ...state,
        activePost: null,
        pendingNation: null,
        uiPhase: 'idle',
      }
  }
}

interface EquipageContextValue {
  state: EquipageState
  dispatch: React.Dispatch<Action>
  // Nation IDs grisées pour le poste actif (R6)
  excludedNationIds: Set<string>
  // État du gel en temps réel
  gelState: GelState
}

const EquipageContext = createContext<EquipageContextValue | null>(null)

export function EquipageProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initialState)

  const gelState = useGel(JOURNEE_COURANTE.heure_gel_utc, KICKOFFS, GEL_DEMO_MODE)

  // Bloque les modifications d'équipage une fois gelé (comportement 8)
  function dispatch(action: Action): void {
    if (gelState.estGele && BLOCKED_WHEN_FROZEN.has(action.type)) return
    rawDispatch(action)
  }

  // R6 : calcule les nations exclues en fonction des postes déjà remplis (hors activePost)
  const selectedInOtherPosts = Object.entries(state.crew)
    .filter(([post, nationId]) => post !== state.activePost && nationId !== null)
    .map(([, nationId]) => nationId as string)

  const grayed = nationsGrisees(selectedInOtherPosts, MATCHS_JOUR)
  const excludedNationIds = new Set(grayed)

  return (
    <EquipageContext.Provider value={{ state, dispatch, excludedNationIds, gelState }}>
      {children}
    </EquipageContext.Provider>
  )
}

export function useEquipage(): EquipageContextValue {
  const ctx = useContext(EquipageContext)
  if (!ctx) throw new Error('useEquipage must be used inside EquipageProvider')
  return ctx
}
