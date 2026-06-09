import React, { memo, useEffect, useRef, useState } from 'react'
import {
  TRAJECTOIRE_PATH, COTE_PATH, COTE_CLIP_D, COTE_HATCH,
  SVG_W, NM_TO_PX,
} from '../lib/generer-trajectoire'

// ── Geometry ──────────────────────────────────────────────────────────────────

export const CENTRE_Y   = 356
export const SVG_BOTTOM = 2700

export function nmToSvgY(nm: number) { return SVG_BOTTOM - nm * NM_TO_PX }

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

function subPath(path: SVGPathElement, lenA: number, lenB: number, offsetX = 0): string {
  const lo = Math.min(lenA, lenB), hi = Math.max(lenA, lenB)
  let d = ''
  for (let i = 0; i <= 80; i++) {
    const pt = path.getPointAtLength(lo + i * (hi - lo) / 80)
    d += `${i === 0 ? 'M' : 'L'} ${(pt.x + offsetX).toFixed(1)},${pt.y.toFixed(1)} `
  }
  return d
}

function boatTransform(
  path: SVGPathElement, len: number, halfH: number, scale: number, offsetX = 0,
): string {
  const total  = path.getTotalLength()
  const pPoupe = path.getPointAtLength(Math.max(0, len - halfH))
  const pProue = path.getPointAtLength(Math.min(total, len + halfH))
  const cx  = (pProue.x + pPoupe.x) / 2 + offsetX
  const cy  = (pProue.y + pPoupe.y) / 2
  const ang = Math.atan2(pProue.x - pPoupe.x, pPoupe.y - pProue.y) * 180 / Math.PI
  return `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${scale})`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BoatAdversaire {
  pseudo: string
  nm:     number
  offset: number
}

interface BoatRender {
  isSelf:    boolean
  transform: string
  trailD:    string
  futureD:   string
  labelX:    number
  labelY:    number
  label:     string
  anchor:    'start' | 'end'
}

interface CarteBaseProps {
  joueurNm:    number
  adversaires: BoatAdversaire[]
  height:      number
  translateY?: number  // optional drag override (CartePage); defaults to CENTRE_Y - nmToSvgY(joueurNm)
}

// ── Component ─────────────────────────────────────────────────────────────────

function CarteBase({ joueurNm, adversaires, height, translateY: translateYProp }: CarteBaseProps) {
  const trajRef               = useRef<SVGPathElement>(null)
  const [pathReady, setPathReady] = useState(false)
  const [boats,     setBoats]     = useState<BoatRender[]>([])

  useEffect(() => { setPathReady(true) }, [])

  useEffect(() => {
    const path = trajRef.current
    if (!path || !pathReady) return

    const total = path.getTotalLength()
    const all = [
      { pseudo: '', nm: joueurNm, isSelf: true,  offset: 0 },
      ...adversaires.map(a => ({ ...a, isSelf: false })),
    ]

    setBoats(all.map(b => {
      const svgY  = nmToSvgY(b.nm)
      const len   = lenAtY(path, svgY)
      const pt    = path.getPointAtLength(len)
      const anchor: 'start' | 'end' = b.isSelf || b.offset >= 0 ? 'start' : 'end'
      return {
        isSelf:    b.isSelf,
        transform: boatTransform(path, len, b.isSelf ? 25.56 : 19.88, b.isSelf ? 1.8 : 1.4, b.offset),
        trailD:    subPath(path, 0,   len,   b.offset),
        futureD:   subPath(path, len, total, b.offset),
        labelX:    pt.x + b.offset + (b.isSelf || b.offset >= 0 ? 9 : -9),
        labelY:    svgY + 4,
        label:     b.pseudo ? `${b.pseudo} · ${b.nm}nm` : `${b.nm}nm`,
        anchor,
      }
    }))
  }, [joueurNm, adversaires, pathReady])

  const ty = translateYProp ?? (CENTRE_Y - nmToSvgY(joueurNm))

  return (
    <svg
      width={SVG_W} height={height}
      viewBox={`0 0 ${SVG_W} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="cb-coast-l" x="-20%" y="-2%" width="140%" height="104%">
          <feTurbulence type="turbulence" baseFrequency="0.022 0.014"
            numOctaves={4} seed={4} result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={14}
            xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <clipPath id="cb-clip-coast-l">
          <path d={COTE_CLIP_D}/>
        </clipPath>
      </defs>

      <rect width={SVG_W} height={height} fill="#0D1117"/>

      <g transform={`translate(0, ${ty})`}>

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
          filter="url(#cb-coast-l)"/>
        <path d={COTE_PATH} fill="none"
          stroke="rgba(240,244,248,0.10)" strokeWidth="1.5" strokeLinecap="round"
          filter="url(#cb-coast-l)"/>
        <g clipPath="url(#cb-clip-coast-l)">
          {COTE_HATCH.map(({ y0, opacity }, i) => (
            <line key={i}
              x1="0" y1={y0} x2={SVG_W} y2={y0 + SVG_W}
              stroke={`rgba(0,229,204,${opacity})`} strokeWidth="0.6"/>
          ))}
        </g>

        {/* Path de référence — DOM uniquement, non visible */}
        <path ref={trajRef} d={TRAJECTOIRE_PATH} fill="none" visibility="hidden"/>

        {/* Sillages passés + routes futures */}
        <g>
          {boats.map((b, i) =>
            b.isSelf ? (
              <React.Fragment key={i}>
                <path d={b.trailD}  fill="none" stroke="#00E5CC"
                  strokeWidth="1.5" strokeDasharray="7 5" opacity="0.35"/>
                <path d={b.futureD} fill="none" stroke="#00E5CC"
                  strokeWidth="1.5" strokeDasharray="7 5" opacity="0.20"/>
              </React.Fragment>
            ) : (
              <React.Fragment key={i}>
                <path d={b.trailD}  fill="none" stroke="rgba(232,237,242,0.50)"
                  strokeWidth="0.8" strokeDasharray="3 5" opacity="0.28"/>
                <path d={b.futureD} fill="none" stroke="rgba(232,237,242,0.50)"
                  strokeWidth="0.8" strokeDasharray="3 5" opacity="0.14"/>
              </React.Fragment>
            )
          )}
        </g>

        {/* Bateaux + labels */}
        <g>
          {boats.map((b, i) => (
            <React.Fragment key={i}>
              {b.isSelf ? (
                <g transform={b.transform}>
                  <path d="M 0,-14.2 C -2.2,-11.6 -4.9,-6.7 -5.3,0 C -5.8,5.3 -4.9,11.1 -4.4,14.2 L 4.4,14.2 C 4.9,11.1 5.8,5.3 5.3,0 C 4.9,-6.7 2.2,-11.6 0,-14.2 Z"
                    fill="#00E5CC" opacity=".90"/>
                  <path d="M 0,-10.7 C -1.3,-8 -2.9,-4.4 -3.1,0 C -3.3,4.4 -2.7,9.8 -2.2,12.4 L 2.2,12.4 C 2.7,9.8 3.3,4.4 3.1,0 C 2.9,-4.4 1.3,-8 0,-10.7 Z"
                    fill="rgba(0,0,0,.28)"/>
                  <line x1="-3.3" y1="-2.7" x2="3.3" y2="-2.7" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="-3.8" y1="1.8"  x2="3.8" y2="1.8"  stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="-3.6" y1="6.2"  x2="3.6" y2="6.2"  stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
                </g>
              ) : (
                <g transform={b.transform}>
                  <path d="M 0,-11.4 C -1.8,-9.3 -3.9,-5.4 -4.2,0 C -4.6,4.2 -3.9,8.9 -3.5,11.4 L 3.5,11.4 C 3.9,8.9 4.6,4.2 4.2,0 C 3.9,-5.4 1.8,-9.3 0,-11.4 Z"
                    fill="rgba(138,173,187,0.50)"/>
                  <path d="M 0,-8.6 C -1.0,-6.4 -2.3,-3.5 -2.5,0 C -2.6,3.5 -2.2,7.8 -1.8,9.9 L 1.8,9.9 C 2.2,7.8 2.6,3.5 2.5,0 C 2.3,-3.5 1.0,-6.4 0,-8.6 Z"
                    fill="rgba(0,0,0,.18)"/>
                  <line x1="-2.6" y1="-2.2" x2="2.6" y2="-2.2" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
                  <line x1="-3.0" y1="1.4"  x2="3.0" y2="1.4"  stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
                  <line x1="-2.9" y1="5.0"  x2="2.9" y2="5.0"  stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
                </g>
              )}
              <text
                x={b.labelX} y={b.labelY}
                textAnchor={b.anchor}
                fontSize={b.isSelf ? '10' : '8'}
                fontWeight={b.isSelf ? '700' : '500'}
                fill={b.isSelf ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.75)'}
                fontFamily="-apple-system,sans-serif"
                opacity={b.isSelf ? 1 : 0.70}
              >
                {b.label}
              </text>
            </React.Fragment>
          ))}
        </g>

      </g>
    </svg>
  )
}

export default memo(CarteBase)
