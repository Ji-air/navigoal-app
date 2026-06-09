import React, { memo, useEffect, useState } from 'react'
import CarteBase, { type BoatAdversaire } from './CarteBase'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

const VIEW_H = 724

const DEMO_ADVERSAIRES: BoatAdversaire[] = [
  { pseudo: '', nm: 320, offset: 0 },
  { pseudo: '', nm: 240, offset: 0 },
  { pseudo: '', nm: 80,  offset: 0 },
  { pseudo: '', nm: 40,  offset: 0 },
]

interface CarteFondProps {
  visible?: boolean
}

function CarteFond({ visible = true }: CarteFondProps) {
  const userId = useAuthStore(s => s.userId)

  const [nmSelf,      setNmSelf]      = useState(0)
  const [adversaires, setAdversaires] = useState<BoatAdversaire[]>(DEMO_ADVERSAIRES)

  useEffect(() => {
    if (!userId) return
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: selfBoat } = await (supabase as any)
        .from('bateaux')
        .select('position_actuelle_nm')
        .eq('utilisateur_id', userId)
        .maybeSingle()
      if (selfBoat?.position_actuelle_nm != null) {
        setNmSelf(selfBoat.position_actuelle_nm as number)
      }

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
      const advs: BoatAdversaire[] = (membresData as any[])
        .filter((m: any) => m.utilisateur_id !== userId)
        .map((m: any) => ({
          pseudo: m.utilisateurs?.pseudo ?? '',
          nm:     m.bateau?.position_actuelle_nm ?? 0,
          offset: 0,
        }))
      if (advs.length > 0) setAdversaires(advs)
    })()
  }, [userId])

  if (!visible) return null

  return (
    <div className="eq-bg-carte">
      <CarteBase joueurNm={nmSelf} adversaires={adversaires} height={VIEW_H}/>
    </div>
  )
}

export default memo(CarteFond)
