import React, { useEffect, useRef, useState } from 'react'
import TabBar from '../components/TabBar'
import type { AppPage } from '../App'
import { useEquipageStore } from '../stores/equipageStore'
import { useAuthStore } from '../stores/authStore'
import { db } from '../lib/supabase'
import {
  TRAJECTOIRE_PATH, COTE_PATH, COTE_CLIP_D, COTE_HATCH,
  SVG_W, SVG_H, CX, NM_TO_PX,
} from '../lib/generer-trajectoire'

interface CartePageProps {
  onNavigate: (page: AppPage) => void
}

// ── Geometry ──────────────────────────────────────────────────────────────────

const CENTRE_Y = 356   // viewport y at which the player's boat is anchored

function nmToSvgY(nm: number): number { return SVG_H - nm * NM_TO_PX }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

// ── SVG DOM helpers ────────────────────────────────────────────────────────────

// Binary search for path length at a given SVG y coordinate.
// Path goes bottom→top (y decreasing as length increases).
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface BoatInfo {
  pseudo: string
  nm: number
  isSelf: boolean
  offset: number
}

interface ComputedBoat {
  isSelf: boolean
  transform: string
  trailD: string
  futureD: string
  labelX: number
  labelY: number
  label: string
  anchor: 'start' | 'end'
}

interface DashStats {
  total: number
  breeze: number
  wind: number
  boost: number
}

// ── Mock data (demo sans auth) ─────────────────────────────────────────────────

// Offsets: N=5, spacing = max(12, floor(44/4)) = 12px, slots [-24,-12,0,+12,+24]
const MOCK_BOATS: BoatInfo[] = [
  { pseudo: 'Capitaine', nm: 124, isSelf: true,  offset:   0 },
  { pseudo: 'Marc',      nm: 320, isSelf: false,  offset: -24 },
  { pseudo: 'Sophie',    nm: 240, isSelf: false,  offset: -12 },
  { pseudo: 'Lucas',     nm: 80,  isSelf: false,  offset:  12 },
  { pseudo: 'Camille',   nm: 40,  isSelf: false,  offset:  24 },
]
const MOCK_STATS: DashStats = { total: 124, breeze: 2, wind: 0, boost: 2 }
const MOCK_LIGUE = 'Les Pirates du Ballon'

// ── Computation ────────────────────────────────────────────────────────────────

function computeBoatData(path: SVGPathElement, boatInfos: BoatInfo[]): ComputedBoat[] {
  const total = path.getTotalLength()
  return boatInfos.map(b => {
    const svgY = nmToSvgY(b.nm)
    const len  = lenAtY(path, svgY)
    const pt   = path.getPointAtLength(len)
    const anchor: 'start' | 'end' = b.isSelf || b.offset >= 0 ? 'start' : 'end'
    const lx = pt.x + b.offset + (b.isSelf || b.offset >= 0 ? 9 : -9)
    return {
      isSelf:    b.isSelf,
      transform: boatTransform(path, len, b.isSelf ? 25.56 : 19.88, b.isSelf ? 1.8 : 1.4, b.offset),
      trailD:    subPath(path, 0, len, b.offset),
      futureD:   subPath(path, len, total, b.offset),
      labelX:    lx,
      labelY:    svgY + 4,
      label:     `${b.pseudo} · ${b.nm}nm`,
      anchor,
    }
  })
}

// ── Race segment sub-component ────────────────────────────────────────────────

function RaceSegment({ boats }: { boats: BoatInfo[] }) {
  const sorted = [...boats].sort((a, b) => b.nm - a.nm)
  const nmMax  = sorted[0]?.nm ?? 1
  const nmMin  = sorted[sorted.length - 1]?.nm ?? 0
  const range  = Math.max(nmMax - nmMin, 1)

  const TOP_PAD = 52, BOT_PAD = 52, SEG_H = 480
  const LINE_X  = 20
  const usableH = SEG_H - TOP_PAD - BOT_PAD

  function posY(nm: number) {
    return SEG_H - BOT_PAD - ((nm - nmMin) / range) * usableH
  }

  return (
    <svg
      width="72" height={SEG_H}
      viewBox={`0 0 72 ${SEG_H}`}
      style={{ display: 'block' }}
    >
      {/* Vertical axis */}
      <line
        x1={LINE_X} y1={TOP_PAD} x2={LINE_X} y2={SEG_H - BOT_PAD}
        stroke="rgba(240,244,248,0.10)" strokeWidth="1"
      />

      {/* Extreme nm labels */}
      <text x={LINE_X} y={TOP_PAD - 8} textAnchor="middle"
        fontSize="7" fill="rgba(240,244,248,0.28)"
        fontFamily="'DM Mono',monospace">
        {nmMax}nm
      </text>
      <text x={LINE_X} y={SEG_H - BOT_PAD + 16} textAnchor="middle"
        fontSize="7" fill="rgba(240,244,248,0.18)"
        fontFamily="'DM Mono',monospace">
        {nmMin}nm
      </text>

      {/* Boat dots */}
      {sorted.map((b, i) => {
        const y = posY(b.nm)
        return (
          <g key={i}>
            <circle
              cx={LINE_X} cy={y}
              r={b.isSelf ? 5 : 3}
              fill={b.isSelf ? '#00E5CC' : 'rgba(140,170,185,0.50)'}
            />
            {b.isSelf && (
              <>
                <text x={LINE_X + 10} y={y + 4}
                  fontSize="9" fontWeight="700"
                  fill="#00E5CC" fontFamily="'DM Mono',monospace">
                  {b.nm}nm
                </text>
                <text x={LINE_X + 10} y={y + 15}
                  fontSize="7"
                  fill="rgba(0,229,204,0.50)" fontFamily="'DM Mono',monospace">
                  {b.pseudo}
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CartePage({ onNavigate }: CartePageProps) {
  const trajRef  = useRef<SVGPathElement>(null)
  const dragRef  = useRef<{ startY: number; startTY: number } | null>(null)

  const equipage = useEquipageStore(s => s.equipage)
  const journee  = useEquipageStore(s => s.journee)
  const pseudo   = useAuthStore(s => s.pseudo)

  const [nmSelf,     setNmSelf]     = useState(MOCK_BOATS.find(b => b.isSelf)!.nm)
  const [stats,      setStats]      = useState<DashStats>(MOCK_STATS)
  const [boats,      setBoats]      = useState<ComputedBoat[]>([])
  const [translateY, setTranslateY] = useState(
    () => CENTRE_Y - nmToSvgY(MOCK_BOATS.find(b => b.isSelf)!.nm),
  )

  // Scroll bounds: clamp between last and first boat
  const allNms = MOCK_BOATS.map(b => b.isSelf ? nmSelf : b.nm)
  const nmMax  = Math.max(...allNms)
  const nmMin  = Math.min(...allNms)
  const maxTY  = CENTRE_Y - nmToSvgY(nmMax)
  const minTY  = CENTRE_Y - nmToSvgY(nmMin)

  // Load impulsions from Supabase for dashboard stats
  useEffect(() => {
    if (!equipage?.id || !journee?.id) return
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.impulsions() as any)
        .select('valeur_nm')
        .eq('equipage_id', equipage.id)
        .eq('journee_id', journee.id)
      if (!data?.length) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = data as any[]
      const total  = rows.reduce((s: number, i: any) => s + (i.valeur_nm as number), 0)
      const breeze = rows.filter((i: any) => i.valeur_nm === 12).length
      const wind   = rows.filter((i: any) => i.valeur_nm === 28).length
      const boost  = rows.filter((i: any) => i.valeur_nm === 50).length
      setStats({ total, breeze, wind, boost })
      setNmSelf(total)
      // Recenter on player with updated bounds
      const updatedNms = MOCK_BOATS.map(b => b.isSelf ? total : b.nm)
      const newMaxTY = CENTRE_Y - nmToSvgY(Math.max(...updatedNms))
      const newMinTY = CENTRE_Y - nmToSvgY(Math.min(...updatedNms))
      setTranslateY(clamp(CENTRE_Y - nmToSvgY(total), newMinTY, newMaxTY))
    })()
  }, [equipage?.id, journee?.id])

  // Recompute boat SVG positions after path mounts or nmSelf changes
  useEffect(() => {
    const path = trajRef.current
    if (!path) return
    const infos = MOCK_BOATS.map(b => b.isSelf ? { ...b, nm: nmSelf } : b)
    setBoats(computeBoatData(path, infos))
  }, [nmSelf])  // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer drag handlers
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startTY: translateY }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const delta = e.clientY - dragRef.current.startY
    setTranslateY(clamp(dragRef.current.startTY + delta, minTY, maxTY))
  }

  function handlePointerUp() { dragRef.current = null }

  function recenter() {
    setTranslateY(clamp(CENTRE_Y - nmToSvgY(nmSelf), minTY, maxTY))
  }

  const numJournee = journee?.numero ?? 3
  const currentBoats = MOCK_BOATS.map(b => b.isSelf ? { ...b, nm: nmSelf } : b)

  return (
    <div className="ct-screen">

      {/* ── HUD (full-width overlay) ────────────────────────────────────────── */}
      <div className="ct-hud" aria-hidden="true">
        <span className="ct-hud-j">Journée {numJournee}</span>
        <button type="button" className="ct-captain" onClick={recenter}>
          <div className="ct-captain-avatar">
            <svg viewBox="0 0 24 24" width="17" height="17"
              strokeWidth="1.5" stroke="#00E5CC" fill="none"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 17 C2 17 4 15 12 15 C20 15 22 17 22 17"/>
              <path d="M12 15 L12 10"/>
              <path d="M6 15 C6 12 12 10 12 10 C12 10 18 12 18 15"/>
              <rect x="2" y="17" width="20" height="2.5" rx="1.2"/>
            </svg>
          </div>
          <span className="ct-captain-name">{pseudo ?? 'Capitaine'}</span>
        </button>
      </div>

      {/* ── Map (full-width, scrollable) ──────────────────────────────────── */}
      <div
        className="ct-map-outer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <div className="ct-map-inner" style={{ transform: `translateY(${translateY}px)` }}>
          <svg
            width={SVG_W} height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <defs>
              {/* Boat shapes */}
              <g id="boat-player">
                <path
                  d="M 0,-14.2 C -2.2,-11.6 -4.9,-6.7 -5.3,0 C -5.8,5.3 -4.9,11.1 -4.4,14.2 L 4.4,14.2 C 4.9,11.1 5.8,5.3 5.3,0 C 4.9,-6.7 2.2,-11.6 0,-14.2 Z"
                  fill="#00E5CC" opacity=".90"
                />
                <path
                  d="M 0,-10.7 C -1.3,-8 -2.9,-4.4 -3.1,0 C -3.3,4.4 -2.7,9.8 -2.2,12.4 L 2.2,12.4 C 2.7,9.8 3.3,4.4 3.1,0 C 2.9,-4.4 1.3,-8 0,-10.7 Z"
                  fill="rgba(0,0,0,.28)"
                />
                <line x1="-3.3" y1="-2.7" x2="3.3" y2="-2.7" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
                <line x1="-3.8" y1="1.8"  x2="3.8" y2="1.8"  stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
                <line x1="-3.6" y1="6.2"  x2="3.6" y2="6.2"  stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinecap="round"/>
              </g>
              <g id="boat-adverse">
                <path
                  d="M 0,-11.4 C -1.8,-9.3 -3.9,-5.4 -4.2,0 C -4.6,4.2 -3.9,8.9 -3.5,11.4 L 3.5,11.4 C 3.9,8.9 4.6,4.2 4.2,0 C 3.9,-5.4 1.8,-9.3 0,-11.4 Z"
                  fill="rgba(138,173,187,0.50)"
                />
                <path
                  d="M 0,-8.6 C -1.0,-6.4 -2.3,-3.5 -2.5,0 C -2.6,3.5 -2.2,7.8 -1.8,9.9 L 1.8,9.9 C 2.2,7.8 2.6,3.5 2.5,0 C 2.3,-3.5 1.0,-6.4 0,-8.6 Z"
                  fill="rgba(0,0,0,.18)"
                />
                <line x1="-2.6" y1="-2.2" x2="2.6" y2="-2.2" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="-3.0" y1="1.4"  x2="3.0" y2="1.4"  stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="-2.9" y1="5.0"  x2="2.9" y2="5.0"  stroke="rgba(0,0,0,.25)" strokeWidth="0.8" strokeLinecap="round"/>
              </g>

              {/* Coast turbulence filter */}
              <filter id="coast-l" x="-20%" y="-2%" width="140%" height="104%">
                <feTurbulence type="turbulence" baseFrequency="0.022 0.014" numOctaves={4} seed={4} result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={14} xChannelSelector="R" yChannelSelector="G"/>
              </filter>

              {/* Coast clip region (land to the left of coast path) */}
              <clipPath id="clip-coast-l">
                <path d={COTE_CLIP_D}/>
              </clipPath>
            </defs>

            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="#0D1117"/>

            {/* Concentric glow zones around trajectory */}
            <path d={TRAJECTOIRE_PATH} fill="none" stroke="rgba(0,229,204,0.040)" strokeWidth="55"  strokeLinecap="round"/>
            <path d={TRAJECTOIRE_PATH} fill="none" stroke="rgba(0,229,204,0.022)" strokeWidth="110" strokeLinecap="round"/>
            <path d={TRAJECTOIRE_PATH} fill="none" stroke="rgba(0,0,0,0.05)"      strokeWidth="180" strokeLinecap="round"/>

            {/* Left coast */}
            <path d={COTE_PATH} fill="none" stroke="rgba(0,229,204,0.08)"   strokeWidth="4"   strokeLinecap="round" filter="url(#coast-l)"/>
            <path d={COTE_PATH} fill="none" stroke="rgba(240,244,248,0.10)" strokeWidth="1.5" strokeLinecap="round" filter="url(#coast-l)"/>
            <g clipPath="url(#clip-coast-l)">
              {COTE_HATCH.map(({ y0, opacity }, i) => (
                <line
                  key={i}
                  x1="0" y1={y0} x2={SVG_W} y2={y0 + SVG_W}
                  stroke={`rgba(0,229,204,${opacity})`} strokeWidth="0.6"
                />
              ))}
            </g>

            {/* Hidden reference path — used only for DOM length queries */}
            <path ref={trajRef} d={TRAJECTOIRE_PATH} fill="none" visibility="hidden"/>

            {/* Trajectories (past trail + future path) */}
            <g>
              {boats.map((b, i) =>
                b.isSelf ? (
                  <React.Fragment key={i}>
                    <path d={b.trailD}  fill="none" stroke="#00E5CC" strokeWidth="1.5" strokeDasharray="7 5" opacity="0.35"/>
                    <path d={b.futureD} fill="none" stroke="#00E5CC" strokeWidth="1.5" strokeDasharray="7 5" opacity="0.20"/>
                  </React.Fragment>
                ) : (
                  <React.Fragment key={i}>
                    <path d={b.trailD}  fill="none" stroke="rgba(232,237,242,0.50)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.28"/>
                    <path d={b.futureD} fill="none" stroke="rgba(232,237,242,0.50)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.14"/>
                  </React.Fragment>
                ),
              )}
            </g>

            {/* Boats + labels */}
            <g>
              {boats.map((b, i) => (
                <React.Fragment key={i}>
                  <use href={b.isSelf ? '#boat-player' : '#boat-adverse'} transform={b.transform}/>
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

            {/* CX guide line (dev only — remove before production) */}
            {false && (
              <line x1={CX} y1="0" x2={CX} y2={SVG_H} stroke="red" strokeWidth="0.5" opacity="0.3"/>
            )}
          </svg>
        </div>

        {/* Compass */}
        <div className="ct-compass" aria-hidden="true">
          <svg width="44" height="48" viewBox="-22 -26 44 48">
            <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(232,237,242,0.25)" strokeWidth="0.8"/>
            <circle cx="0" cy="0" r="2.5" fill="rgba(232,237,242,0.55)"/>
            <polygon points="0,-18 -4,-8 0,-12 4,-8" fill="rgba(232,237,242,0.80)"/>
            <polygon points="0,18 -2.5,9 0,12 2.5,9" fill="rgba(232,237,242,0.30)"/>
            <polygon points="18,0 9,-2.5 12,0 9,2.5"  fill="rgba(232,237,242,0.30)"/>
            <polygon points="-18,0 -9,-2.5 -12,0 -9,2.5" fill="rgba(232,237,242,0.30)"/>
            <text x="0" y="-21" textAnchor="middle" fontSize="7" fontWeight="700"
              fill="rgba(232,237,242,0.70)" fontFamily="'DM Mono',monospace">N</text>
          </svg>
        </div>
      </div>

      {/* ── Race segment (absolute overlay, right side) ────────────────────── */}
      <div className="ct-race-seg" aria-hidden="true">
        <RaceSegment boats={currentBoats}/>
      </div>

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      <div className="ct-dashboard">
        <div className="ct-db-ligue">{MOCK_LIGUE}</div>
        <div className="ct-db-stats">
          <div className="ct-stat">
            <span className="ct-sv ct-sv--nm">{stats.total}</span>
            <span className="ct-sl">nm total</span>
          </div>
          <div className="ct-stat-sep"/>
          <div className="ct-stat">
            <span className="ct-sv ct-sv--breeze">{stats.breeze}</span>
            <span className="ct-sl">Breeze</span>
          </div>
          <div className="ct-stat-sep"/>
          <div className="ct-stat">
            <span className="ct-sv ct-sv--wind">{stats.wind}</span>
            <span className="ct-sl">Wind</span>
          </div>
          <div className="ct-stat-sep"/>
          <div className="ct-stat">
            <span className="ct-sv ct-sv--boost">{stats.boost}</span>
            <span className="ct-sl">Boost</span>
          </div>
        </div>
      </div>

      <TabBar active="carte" onNavigate={onNavigate}/>
    </div>
  )
}
