import { useState, useEffect } from 'react'

export interface GelState {
  estGele: boolean
  secondsAvantGel: number | null   // null si déjà gelé
}

/**
 * Comportement 9 : si un match démarre avant heure_gel_utc, gel immédiat.
 * Retourne l'heure de gel effective = min(heure_gel_utc, premier kickoff déjà passé).
 */
function heureGelEffective(heureGelUtc: Date, kickoffs: Date[]): Date {
  const now = Date.now()
  const earlyStarted = kickoffs.some(
    k => k.getTime() < heureGelUtc.getTime() && k.getTime() <= now
  )
  return earlyStarted ? new Date(0) : heureGelUtc
}

function compute(heureGelUtc: Date, kickoffs: Date[], demoMode: boolean): GelState {
  if (demoMode) return { estGele: true, secondsAvantGel: null }
  const gel = heureGelEffective(heureGelUtc, kickoffs)
  const delta = Math.floor((gel.getTime() - Date.now()) / 1000)
  if (delta <= 0) return { estGele: true, secondsAvantGel: null }
  return { estGele: false, secondsAvantGel: delta }
}

/**
 * Suit l'état de gel en temps réel (tick toutes les secondes).
 * heureGelUtc et kickoffs doivent être des références stables (constantes module).
 */
export function useGel(
  heureGelUtc: Date,
  kickoffs: Date[],
  demoMode = false
): GelState {
  const [gelState, setGelState] = useState<GelState>(() =>
    compute(heureGelUtc, kickoffs, demoMode)
  )

  useEffect(() => {
    if (demoMode) {
      setGelState({ estGele: true, secondsAvantGel: null })
      return
    }
    const update = () => setGelState(compute(heureGelUtc, kickoffs, false))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
    // heureGelUtc et kickoffs sont des constantes module — références stables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  return gelState
}
