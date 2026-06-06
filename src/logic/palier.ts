export type Palier = "Breeze" | "Wind" | "Boost"

// R3 — table cote → palier
export function calculerPalier(cote: number | null): Palier {
  if (cote === null) return "Wind"
  if (cote < 2.0) return "Breeze"
  if (cote <= 4.5) return "Wind"
  return "Boost"
}

// R3 — table palier → nm
export function impulsionDuPalier(palier: Palier): number {
  const table: Record<Palier, number> = { Breeze: 10, Wind: 20, Boost: 40 }
  return table[palier]
}
