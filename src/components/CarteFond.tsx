import React, { memo, useEffect, useRef, useState } from 'react'
import {
  TRAJECTOIRE_PATH, COTE_PATH, COTE_CLIP_D, COTE_HATCH,
  SVG_W, NM_TO_PX,
} from '../lib/generer-trajectoire'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// ── Geometry (same as CartePage) ──────────────────────────────────────────────

const CENTRE_Y   = 356
const SVG_BOTTOM = 2700
const VIEW_H     = 724

function nmToSvgY(nm: number) { return SVG_BOTTOM - nm * NM_TO_PX }

// ── SVG DOM helpers ───────────────────────────────────────────────────────────

function lenAtY(path: SVGPathElement, targetY: number): number {
  const total = path.getTotalLength()
  let lo = 0, hi = total
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    const { y } = path.getPointAtLength(mid)
    if (Math.abs(y - targetY) < 0.15) return mid
    if (y > targetY) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function computeBoatTransform(
  path: SVGPathElement, len: number, halfH: number, scale: number,
): string {
  const total  = path.getTotalLength()
  const pPoupe = path.getPointAtLength(Math.max(0, len - halfH))
  const pProue = path.getPointAtLength(Math.min(total, len + halfH))
  const cx  = (pPoupe.x + pProue.x) / 2
  const cy  = (pPoupe.y + pProue.y) / 2
  const ang = Math.atan2(pProue.x - pPoupe.x, pPoupe.y - pProue.y) * 180 / Math.PI
  return `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${scale})`
}

// ── Demo fallback (pas de ligue) ──────────────────────────────────────────────

const DEMO_ADVERSAIRES = [
  { nm: 320 },
  { nm: 240 },
  { nm: 80  },
  { nm: 40  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoatTf {
  isSelf:    boolean
  transform: string
}

interface CarteFondProps {
  visible?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

function CarteFond({ visible = true }: CarteFondProps) {
  const trajRef = useRef<SVGPathElement>(null)
  const userId  = useAuthStore(s => s.userId)

  const [nmSelf,      setNmSelf]      = useState(0)
  const [adversaires, setAdversaires] = useState<{ nm: number }[]>(DEMO_ADVERSAIRES)
  const [boatTfs,     setBoatTfs]     = useState<BoatTf[]>([])
  const [pathReady,   setPathReady]   = useState(false)

  // Signale que le SVGPathElement est monté et prêt pour les calculs DOM
  useEffect(() => { if (visible) setPathReady(true) }, [visible])

  // ── Fetch positions une seule fois au montage ─────────────────────────────
  useEffect(() => {
    if (!userId) return
    void (async () => {
      // 1. Position du joueur
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: selfBoat } = await (supabase as any)
        .from('bateaux')
        .select('position_actuelle_nm')
        .eq('utilisateur_id', userId)
        .maybeSingle()
      if (selfBoat?.position_actuelle_nm != null) {
        setNmSelf(selfBoat.position_actuelle_nm as number)
      }

      // 2. Ligue du joueur
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membreRow } = await (supabase as any)
        .from('membres_ligue')
        .select('ligue_id')
        .eq('utilisateur_id', userId)
        .limit(1)
        .maybeSingle()

      if (!membreRow?.ligue_id) return

      // 3. Positions des adversaires de la ligue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membresData } = await (supabase as any)
        .from('membres_ligue')
        .select('utilisateur_id, bateau:bateaux(position_actuelle_nm)')
        .eq('ligue_id', membreRow.ligue_id)

      if (!membresData?.length) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const advs = (membresData as any[])
        .filter((m: any) => m.utilisateur_id !== userId)
        .map((m: any) => ({ nm: m.bateau?.position_actuelle_nm ?? 0 }))
      if (advs.length > 0) setAdversaires(advs)
    })()
  }, [userId])

  // ── Calcul des transforms bateaux après montage du path ───────────────────
  useEffect(() => {
    const path = trajRef.current
    if (!path || !pathReady) return
    const all = [
      { nm: nmSelf, isSelf: true },
      ...adversaires.map(a => ({ nm: a.nm, isSelf: false })),
    ]
    setBoatTfs(all.map(b => ({
      isSelf:    b.isSelf,
      transform: computeBoatTransform(
        path,
        lenAtY(path, nmToSvgY(b.nm)),
        b.isSelf ? 25.56 : 19.88,
        b.isSelf ? 1.8   : 1.4,
      ),
    })))
  }, [nmSelf, adversaires, pathReady])

  if (!visible) return null

  const translateY = CENTRE_Y - nmToSvgY(nmSelf)

  return (
    <div className="eq-bg-carte">
      <svg
        width={SVG_W} height={VIEW_H}
        viewBox={`0 0 ${SVG_W} ${VIEW_H}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="cf-coast-l" x="-20%" y="-2%" width="140%" height="104%">
            <feTurbulence type="turbulence" baseFrequency="0.022 0.014"
              numOctaves={4} seed={4} result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={14}
              xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <clipPath id="cf-clip-coast-l">
            <path d={COTE_CLIP_D}/>
          </clipPath>
        </defs>

        {/* Fond fixe */}
        <rect width={SVG_W} height={VIEW_H} fill="#0D1117"/>

        {/* Contenu de la carte — cadré sur la position du joueur */}
        <g transform={`translate(0, ${translateY})`}>

          {/* Zones concentriques autour de la trajectoire */}
          <path d={TRAJECTOIRE_PATH} fill="none"
            stroke="rgba(0,229,204,0.040)" strokeWidth="55"  strokeLinecap="round"/>
          <path d={TRAJECTOIRE_PATH} fill="none"
            stroke="rgba(0,229,204,0.022)" strokeWidth="110" strokeLinecap="round"/>
          <path d={TRAJECTOIRE_PATH} fill="none"
            stroke="rgba(0,0,0,0.05)"     strokeWidth="180" strokeLinecap="round"/>

          {/* Côte gauche */}
          <path d={COTE_PATH} fill="none"
            stroke="rgba(0,229,204,0.08)"   strokeWidth="4"   strokeLinecap="round"
            filter="url(#cf-coast-l)"/>
          <path d={COTE_PATH} fill="none"
            stroke="rgba(240,244,248,0.10)" strokeWidth="1.5" strokeLinecap="round"
            filter="url(#cf-coast-l)"/>
          <g clipPath="url(#cf-clip-coast-l)">
            {COTE_HATCH.map(({ y0, opacity }, i) => (
              <line key={i}
                x1="0" y1={y0} x2={SVG_W} y2={y0 + SVG_W}
                stroke={`rgba(0,229,204,${opacity})`} strokeWidth="0.6"/>
            ))}
          </g>

          {/* Path de référence caché — utilisé pour les calculs DOM */}
          <path ref={trajRef} d={TRAJECTOIRE_PATH} fill="none" visibility="hidden"/>

          {/* Bateaux */}
          {boatTfs.map((b, i) =>
            b.isSelf ? (
              <g key={i} transform={b.transform}>
                <path
                  d="M 0,-14.2 C -2.2,-11.6 -4.9,-6.7 -5.3,0 C -5.8,5.3 -4.9,11.1 -4.4,14.2 L 4.4,14.2 C 4.9,11.1 5.8,5.3 5.3,0 C 4.9,-6.7 2.2,-11.6 0,-14.2 Z"
                  fill="#00E5CC" opacity=".90"/>
                <path
                  d="M 0,-10.7 C -1.3,-8 -2.9,-4.4 -3.1,0 C -3.3,4.4 -2.7,9.8 -2.2,12.4 L 2.2,12.4 C 2.7,9.8 3.3,4.4 3.1,0 C 2.9,-4.4 1.3,-8 0,-10.7 Z"
                  fill="rgba(0,0,0,.28)"/>
              </g>
            ) : (
              <g key={i} transform={b.transform}>
                <path
                  d="M 0,-11.4 C -1.8,-9.3 -3.9,-5.4 -4.2,0 C -4.6,4.2 -3.9,8.9 -3.5,11.4 L 3.5,11.4 C 3.9,8.9 4.6,4.2 4.2,0 C 3.9,-5.4 1.8,-9.3 0,-11.4 Z"
                  fill="rgba(138,173,187,0.50)"/>
              </g>
            )
          )}
        </g>
      </svg>
    </div>
  )
}

export default memo(CarteFond)
