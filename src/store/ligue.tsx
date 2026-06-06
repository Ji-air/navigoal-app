import React, { createContext, useContext, useState } from 'react'
import {
  LIGUE_SEED,
  PHASE_GROUPES_OUVERTE,
  type LigueData,
  type MembreLigue,
} from '../data/ligue'
import { useAuth } from './auth'

type ResultatAction = { ok: true } | { ok: false; erreur: string }

interface LigueContextValue {
  ligueActive: LigueData | null
  phaseGroupesOuverte: boolean
  creerLigue(nom: string): ResultatAction
  rejoindreParCode(code: string): ResultatAction
}

const LigueContext = createContext<LigueContextValue | null>(null)

function genererCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function LigueProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [ligueActive, setLigueActive] = useState<LigueData | null>(null)
  // Registre de toutes les ligues connues — pré-semé avec la ligue mock
  const [registre, setRegistre] = useState<LigueData[]>([LIGUE_SEED])

  function moiMembre(): MembreLigue {
    return {
      utilisateurId: session!.id,
      pseudo: session!.pseudo,
      positionNm: 0,
      totalBoost: 0,
      isCurrentUser: true,
    }
  }

  function creerLigue(nom: string): ResultatAction {
    if (nom.trim() === '') {
      return { ok: false, erreur: 'NOM_VIDE' }
    }
    const nouvelle: LigueData = {
      id: `ligue-${Date.now()}`,
      nom: nom.trim(),
      codeInvitation: genererCode(),
      membres: [moiMembre()],
    }
    setRegistre(prev => [...prev, nouvelle])
    setLigueActive(nouvelle)
    return { ok: true }
  }

  function rejoindreParCode(code: string): ResultatAction {
    if (!PHASE_GROUPES_OUVERTE) {
      return { ok: false, erreur: 'PHASE_FERMEE' }
    }
    const normalized = code.trim().toUpperCase()
    const ligue = registre.find(l => l.codeInvitation === normalized)
    if (!ligue) {
      return { ok: false, erreur: 'CODE_INVALIDE' }
    }
    if (ligueActive?.id === ligue.id) {
      return { ok: false, erreur: 'DEJA_MEMBRE' }
    }
    setLigueActive(ligue)
    return { ok: true }
  }

  return (
    <LigueContext.Provider
      value={{ ligueActive, phaseGroupesOuverte: PHASE_GROUPES_OUVERTE, creerLigue, rejoindreParCode }}
    >
      {children}
    </LigueContext.Provider>
  )
}

export function useLigue(): LigueContextValue {
  const ctx = useContext(LigueContext)
  if (!ctx) throw new Error('useLigue must be used inside LigueProvider')
  return ctx
}
