import React, { useEffect, useRef, useState } from 'react'
import TabBar from '../components/TabBar'
import CarteBase, { CENTRE_Y, nmToSvgY, type BoatAdversaire } from '../components/CarteBase'
import type { AppPage } from '../App'
import { useEquipageStore } from '../stores/equipageStore'
import { useAuthStore } from '../stores/authStore'
import { db } from '../lib/supabase'

interface CartePageProps {
  onNavigate: (page: AppPage) => void
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

const MAP_H = typeof window !== 'undefined' ? Math.max(600, window.innerHeight - 64) : 780

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoatInfo {
  pseudo: string
  nm:     number
  isSelf: boolean
  offset: number
}

interface DashStats {
  total:  number
  breeze: number
  wind:   number
  boost:  number
}

// ── Mock data (demo sans auth) ─────────────────────────────────────────────────

const MOCK_BOATS: BoatInfo[] = [
  { pseudo: 'Capitaine', nm: 124, isSelf: true,  offset:   0 },
  { pseudo: 'Marc',      nm: 320, isSelf: false,  offset: -24 },
  { pseudo: 'Sophie',    nm: 240, isSelf: false,  offset: -12 },
  { pseudo: 'Lucas',     nm: 80,  isSelf: false,  offset:  12 },
  { pseudo: 'Camille',   nm: 40,  isSelf: false,  offset:  24 },
]
const MOCK_STATS: DashStats = { total: 124, breeze: 2, wind: 0, boost: 2 }
const MOCK_LIGUE = 'Les Pirates du Ballon'

const ADV_BOATS: BoatAdversaire[] = MOCK_BOATS
  .filter(b => !b.isSelf)
  .map(({ pseudo, nm, offset }) => ({ pseudo, nm, offset }))

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
      <line
        x1={LINE_X} y1={TOP_PAD} x2={LINE_X} y2={SEG_H - BOT_PAD}
        stroke="rgba(240,244,248,0.10)" strokeWidth="1"
      />
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
  const dragRef = useRef<{ startY: number; startTY: number } | null>(null)

  const equipage = useEquipageStore(s => s.equipage)
  const journee  = useEquipageStore(s => s.journee)
  const pseudo   = useAuthStore(s => s.pseudo)

  const [nmSelf,     setNmSelf]     = useState(MOCK_BOATS.find(b => b.isSelf)!.nm)
  const [stats,      setStats]      = useState<DashStats>(MOCK_STATS)
  const [translateY, setTranslateY] = useState(
    () => CENTRE_Y - nmToSvgY(MOCK_BOATS.find(b => b.isSelf)!.nm),
  )

  const allNms = MOCK_BOATS.map(b => b.isSelf ? nmSelf : b.nm)
  const nmMax  = Math.max(...allNms)
  const nmMin  = Math.min(...allNms)
  const maxTY  = CENTRE_Y - nmToSvgY(nmMax)
  const minTY  = CENTRE_Y - nmToSvgY(nmMin)

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
      const updatedNms = MOCK_BOATS.map(b => b.isSelf ? total : b.nm)
      const newMaxTY = CENTRE_Y - nmToSvgY(Math.max(...updatedNms))
      const newMinTY = CENTRE_Y - nmToSvgY(Math.min(...updatedNms))
      setTranslateY(clamp(CENTRE_Y - nmToSvgY(total), newMinTY, newMaxTY))
    })()
  }, [equipage?.id, journee?.id])

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

  const numJournee  = journee?.numero ?? 3
  const currentBoats = MOCK_BOATS.map(b => b.isSelf ? { ...b, nm: nmSelf } : b)
  const advBoats: BoatAdversaire[] = ADV_BOATS.map(a => a)

  return (
    <div className="ct-screen">

      {/* ── HUD (full-width overlay) ────────────────────────────────────────── */}
      <div className="ct-hud" aria-hidden="true">
        <span className="ct-hud-j">Journée {numJournee}</span>
        <button type="button" className="eq-captain" onClick={recenter}
          style={{ pointerEvents: 'auto', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
          <div className="eq-captain-avatar">
            <svg viewBox="0 0 24 24">
              <path d="M2 17 C2 17 4 15 12 15 C20 15 22 17 22 17"/>
              <path d="M12 15 L12 10"/>
              <path d="M6 15 C6 12 12 10 12 10 C12 10 18 12 18 15"/>
              <rect x="2" y="17" width="20" height="2.5" rx="1.2"/>
            </svg>
          </div>
          <span className="eq-captain-name">{pseudo ?? 'Capitaine'}</span>
        </button>
      </div>

      {/* ── Map (full-width, draggable) ───────────────────────────────────── */}
      <div
        className="ct-map-outer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <CarteBase
          joueurNm={nmSelf}
          adversaires={advBoats}
          height={MAP_H}
          translateY={translateY}
        />

        {/* Compass */}
        <div className="ct-compass" aria-hidden="true">
          <svg width="64" height="64" viewBox="-22 -26 44 48">
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

      {/* ── Race segment (absolute overlay, right side) ─────────────────────── */}
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
