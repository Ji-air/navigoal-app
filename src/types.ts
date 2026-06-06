// Types centraux de l'application — partagés entre stores, composants et pages.

export type PosteNavigoal = 'Captain' | 'Second' | 'Navigator' | 'Watch' | 'Keeper'

export type Palier = 'Breeze' | 'Wind' | 'Boost'

export type Crew = Record<PosteNavigoal, string | null>

export interface Nation {
  id: string
  nom: string
}

export interface MatchJour {
  id: string
  nationAId: string
  nationBId: string
  heureKickoffUtc: Date
}

export interface JourneeCourante {
  id: string
  numero: number
  heure_premier_match_utc: Date
  heure_gel_utc: Date
}
