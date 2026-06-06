// Données de journée — mock statique pour le développement local.
// Remplacé par des appels Supabase quand USE_REAL_API = true.

import type { Nation, MatchJour, JourneeCourante } from '../types'

const _now = new Date()

export const JOURNEE_COURANTE: JourneeCourante = {
  id:   'j1',
  numero: 1,
  heure_premier_match_utc: new Date(_now.getTime() + 25 * 60 * 1000),
  heure_gel_utc:            new Date(_now.getTime() + 10 * 60 * 1000),
}

export const NATIONS: Nation[] = [
  { id: 'france',     nom: 'France'     },
  { id: 'allemagne',  nom: 'Allemagne'  },
  { id: 'espagne',    nom: 'Espagne'    },
  { id: 'bresil',     nom: 'Brésil'     },
  { id: 'argentine',  nom: 'Argentine'  },
  { id: 'angleterre', nom: 'Angleterre' },
]

export const MATCHS_JOUR: MatchJour[] = [
  {
    id: 'm1',
    nationAId: 'france',
    nationBId: 'allemagne',
    heureKickoffUtc: new Date(_now.getTime() + 25 * 60 * 1000),
  },
  {
    id: 'm2',
    nationAId: 'espagne',
    nationBId: 'bresil',
    heureKickoffUtc: new Date(_now.getTime() + 28 * 60 * 1000),
  },
  {
    id: 'm3',
    nationAId: 'argentine',
    nationBId: 'angleterre',
    heureKickoffUtc: new Date(_now.getTime() + 31 * 60 * 1000),
  },
]

export function nationById(id: string): Nation | undefined {
  return NATIONS.find(n => n.id === id)
}
