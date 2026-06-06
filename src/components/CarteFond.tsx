import { memo, useEffect, useRef } from 'react'

// Demo positions — remplacées par les vraies données store en phase 2
const DEMO_MOI = { nm: 180, offset: 0 }
const DEMO_JOUEURS = [
  { nm: 320, offset: -21 },
  { nm: 240, offset: -7 },
  { nm: 150, offset: 7 },
  { nm: 80, offset: 21 },
]
const CENTRE_Y = 356
const NM_TO_PX = 1.8

function nmToY(nm: number) { return CENTRE_Y - (nm - DEMO_MOI.nm) * NM_TO_PX }

function lenAtY(p: SVGPathElement, y: number) {
  let lo = 0, hi = p.getTotalLength()
  for (let i = 0; i < 64; i++) {
    const m = (lo + hi) / 2
    const pt = p.getPointAtLength(m)
    if (Math.abs(pt.y - y) < 0.15) return m
    pt.y > y ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}

function subPath(p: SVGPathElement, a: number, b: number, ox = 0) {
  const lo = Math.min(a, b), hi = Math.max(a, b)
  let d = ''
  for (let i = 0; i <= 80; i++) {
    const pt = p.getPointAtLength(lo + i * (hi - lo) / 80)
    d += (i === 0 ? 'M' : 'L') + ` ${(pt.x + ox).toFixed(1)},${pt.y.toFixed(1)} `
  }
  return d
}

function boatTransform(p: SVGPathElement, len: number, hh: number, sc: number, ox = 0) {
  const tot = p.getTotalLength()
  const pp = p.getPointAtLength(Math.max(0, len - hh))
  const pr = p.getPointAtLength(Math.min(tot, len + hh))
  const cx = (pr.x + pp.x) / 2 + ox
  const cy = (pr.y + pp.y) / 2
  const ang = Math.atan2(pr.x - pp.x, pp.y - pr.y) * 180 / Math.PI
  return `translate(${cx},${cy}) rotate(${ang}) scale(${sc})`
}

const COAST_PATH = "M 47,724 C 64,688 72,648 69,608 C 66,568 55,543 36,513 C 20,486 16,458 25,428 C 34,398 43,383 47,356 C 51,329 58,306 67,276 C 77,246 82,214 76,178 C 71,142 60,122 47,96 C 34,70 27,44 29,12"
const TRAJ_PATH = "M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 250,246 248,216 235,186 C 222,156 200,130 168,100 C 148,80 150,43 195,0"
const ZONE_PATH = "M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 249,246 258,214 248,178 C 238,142 218,122 195,96 C 172,70 158,44 162,12"

const HACHURES_Y = [
  -390, -354, -318, -282, -246, -210, -174, -138, -102, -66, -30,
  6, 42, 78, 114, 150, 186, 222, 258, 294, 330, 366, 402,
]
const HACHURES_OPACITY = [
  0.076, 0.061, 0.079, 0.086, 0.067, 0.059, 0.051, 0.076, 0.059,
  0.082, 0.082, 0.064, 0.088, 0.054, 0.084, 0.082, 0.071, 0.065,
  0.083, 0.084, 0.078, 0.059, 0.053,
]

function CarteFond() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const refPath = svg.querySelector<SVGPathElement>('#traj-ref')
    const trajG = svg.querySelector<SVGGElement>('#trajectoires')
    const bateauG = svg.querySelector<SVGGElement>('#bateaux')
    if (!refPath || !trajG || !bateauG) return

    const ns = 'http://www.w3.org/2000/svg'
    const el = (tag: string, attrs: Record<string, string>) => {
      const e = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
      return e
    }

    const tot = refPath.getTotalLength()
    const lenA = lenAtY(refPath, CENTRE_Y)

    // Trajectoire joueur
    trajG.appendChild(el('path', {
      d: subPath(refPath, 0, lenA),
      fill: 'none', stroke: '#00E5CC', 'stroke-width': '1.5',
      'stroke-dasharray': '7 5', opacity: '0.35',
    }))
    trajG.appendChild(el('path', {
      d: subPath(refPath, lenA, tot),
      fill: 'none', stroke: '#00E5CC', 'stroke-width': '1.5',
      'stroke-dasharray': '7 5', opacity: '0.35',
    }))

    // Bateau joueur
    bateauG.appendChild(el('use', {
      href: '#boat-player',
      transform: boatTransform(refPath, lenA, 25.56, 1.8),
    }))

    // Adversaires
    for (const j of DEMO_JOUEURS) {
      const yJ = nmToY(j.nm)
      const lJ = lenAtY(refPath, yJ)

      trajG.appendChild(el('path', {
        d: subPath(refPath, lJ, tot, j.offset),
        fill: 'none', stroke: 'rgba(232,237,242,0.50)',
        'stroke-width': '0.8', 'stroke-dasharray': '3 5', opacity: '0.22',
      }))
      trajG.appendChild(el('path', {
        d: subPath(refPath, 0, lJ, j.offset),
        fill: 'none', stroke: 'rgba(232,237,242,0.50)',
        'stroke-width': '0.8', 'stroke-dasharray': '3 5', opacity: '0.35',
      }))
      bateauG.appendChild(el('use', {
        href: '#boat-adverse',
        transform: boatTransform(refPath, lJ, 19.88, 1.4, j.offset),
      }))
    }
  }, [])

  return (
    <div className="eq-bg-carte">
      <svg
        ref={svgRef}
        width="390" height="724" viewBox="0 0 390 724"
        xmlns="http://www.w3.org/2000/svg"
        className="eq-bg-svg"
      >
        <defs>
          {/* Bateau joueur */}
          <g id="boat-player">
            <path d="M 0,-14.2 C -2.2,-11.6 -4.9,-6.7 -5.3,0 C -5.8,5.3 -4.9,11.1 -4.4,14.2 L 4.4,14.2 C 4.9,11.1 5.8,5.3 5.3,0 C 4.9,-6.7 2.2,-11.6 0,-14.2 Z"
              fill="#00E5CC" opacity=".90"/>
            <path d="M 0,-10.7 C -1.3,-8 -2.9,-4.4 -3.1,0 C -3.3,4.4 -2.7,9.8 -2.2,12.4 L 2.2,12.4 C 2.7,9.8 3.3,4.4 3.1,0 C 2.9,-4.4 1.3,-8 0,-10.7 Z"
              fill="rgba(0,0,0,.28)"/>
            <line x1="-3.3" y1="-2.7" x2="3.3" y2="-2.7" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
            <line x1="-3.8" y1="1.8" x2="3.8" y2="1.8" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
            <line x1="-3.6" y1="6.2" x2="3.6" y2="6.2" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
          </g>

          {/* Bateau adverse */}
          <g id="boat-adverse">
            <path d="M 0,-11.4 C -1.8,-9.3 -3.9,-5.4 -4.2,0 C -4.6,4.2 -3.9,8.9 -3.5,11.4 L 3.5,11.4 C 3.9,8.9 4.6,4.2 4.2,0 C 3.9,-5.4 1.8,-9.3 0,-11.4 Z"
              fill="rgba(138,173,187,0.50)"/>
            <path d="M 0,-8.6 C -1.0,-6.4 -2.3,-3.5 -2.5,0 C -2.6,3.5 -2.2,7.8 -1.8,9.9 L 1.8,9.9 C 2.2,7.8 2.6,3.5 2.5,0 C 2.3,-3.5 1.0,-6.4 0,-8.6 Z"
              fill="rgba(0,0,0,.18)"/>
            <line x1="-2.6" y1="-2.2" x2="2.6" y2="-2.2" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="-3.0" y1="1.4" x2="3.0" y2="1.4" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="-2.9" y1="5.0" x2="2.9" y2="5.0" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
          </g>

          {/* Chemin de référence pour les trajectoires (invisible) */}
          <path id="traj-ref" d={TRAJ_PATH} fill="none" visibility="hidden"/>

          {/* Filtre côte */}
          <filter id="coast-l" x="-20%" y="-2%" width="140%" height="104%">
            <feTurbulence type="turbulence" baseFrequency="0.022 0.014"
              numOctaves={4} seed={4} result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise"
              scale={14} xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Clip côte */}
          <clipPath id="clip-coast-l">
            <path d="M 47,724 C 64,688 72,648 69,608 C 66,568 55,543 36,513 C 20,486 16,458 25,428 C 34,398 43,383 47,356 C 51,329 58,306 67,276 C 77,246 82,214 76,178 C 71,142 60,122 47,96 C 34,70 27,44 29,12 L 0,12 L 0,724 Z"/>
          </clipPath>
        </defs>

        {/* Fond */}
        <rect width="390" height="724" fill="#0D1117"/>

        {/* Zones concentriques */}
        <path d={ZONE_PATH} fill="none" stroke="rgba(0,229,204,0.042)" strokeWidth="55" strokeLinecap="round"/>
        <path d={ZONE_PATH} fill="none" stroke="rgba(0,229,204,0.025)" strokeWidth="110" strokeLinecap="round"/>
        <path d={ZONE_PATH} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="180" strokeLinecap="round"/>
        <path d={ZONE_PATH} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="260" strokeLinecap="round"/>

        {/* Côte gauche */}
        <path d={COAST_PATH} fill="none" stroke="rgba(0,229,204,0.08)" strokeWidth="4" strokeLinecap="round" filter="url(#coast-l)"/>
        <path d={COAST_PATH} fill="none" stroke="rgba(240,244,248,0.10)" strokeWidth="1.5" strokeLinecap="round" filter="url(#coast-l)"/>

        {/* Hachures clippées */}
        <g clipPath="url(#clip-coast-l)">
          {HACHURES_Y.map((y, i) => (
            <line
              key={y}
              x1="0" y1={y} x2="390" y2={y + 390}
              stroke={`rgba(0,229,204,${HACHURES_OPACITY[i]})`}
              strokeWidth="0.6"
            />
          ))}
        </g>

        {/* Groupes peuplés par useEffect */}
        <g id="trajectoires"/>
        <g id="bateaux"/>
      </svg>

      {/* Fondu vers le bas — transition carte → panel */}
      <div className="eq-bg-fade"/>
    </div>
  )
}

export default memo(CarteFond)
