import React, { memo, useEffect, useState } from 'react'
import CarteBase, { type BoatAdversaire } from './CarteBase'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

const VIEW_H = 724

// Répartition symétrique autour de 0, espacement 14px
// n=5 → [-28, -14, 0, +14, +28]
// n=4 → [-21,  -7,    +7, +21]
function assignOffsets(n: number): number[] {
  const half = (n - 1) / 2
  return Array.from({ length: n }, (_, i) => Math.round((i - half) * 14))
}

function withOffsets(boats: { pseudo: string; nm: number }[]): BoatAdversaire[] {
  const offsets = assignOffsets(boats.length)
  return boats.map((b, i) => ({ ...b, offset: offsets[i] ?? 0 }))
}

const DEMO_ADVERSAIRES = [
  { pseudo: '', nm: 320 },
  { pseudo: '', nm: 240 },
  { pseudo: '', nm: 80  },
  { pseudo: '', nm: 40  },
]

interface CarteFondProps {
  visible?: boolean
}

function CarteFond({ visible = true }: CarteFondProps) {
  const userId = useAuthStore(s => s.userId)

  const [nmSelf,      setNmSelf]      = useState<number | null>(null)
  const [adversaires, setAdversaires] = useState(DEMO_ADVERSAIRES)

  useEffect(() => {
    if (!userId) return
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: selfBoat } = await (supabase as any)
        .from('bateaux')
        .select('position_actuelle_nm')
        .eq('utilisateur_id', userId)
        .maybeSingle()
      // null fallback → 0nm (départ de course)
      setNmSelf(selfBoat?.position_actuelle_nm ?? 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membreRow } = await (supabase as any)
        .from('membres_ligue')
        .select('ligue_id')
        .eq('utilisateur_id', userId)
        .limit(1)
        .maybeSingle()
      if (!membreRow?.ligue_id) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membresData } = await (supabase as any)
        .from('membres_ligue')
        .select('utilisateur_id, utilisateurs(pseudo), bateau:bateaux(position_actuelle_nm)')
        .eq('ligue_id', membreRow.ligue_id)
      if (!membresData?.length) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const advs = (membresData as any[])
        .filter((m: any) => m.utilisateur_id !== userId)
        .map((m: any) => ({
          pseudo: m.utilisateurs?.pseudo ?? '',
          nm:     m.bateau?.position_actuelle_nm ?? 0,
        }))
      if (advs.length > 0) setAdversaires(advs)
    })()
  }, [userId])

  if (!visible) return null

  // Fond fixe pendant le chargement — évite le jump translateY
  if (nmSelf === null) {
    return <div className="eq-bg-carte" style={{ background: '#0D1117' }}/>
  }

  return (
    <div className="eq-bg-carte">
      <CarteBase joueurNm={nmSelf} adversaires={withOffsets(adversaires)} height={VIEW_H}/>
    </div>
  )
}

export default memo(CarteFond)
