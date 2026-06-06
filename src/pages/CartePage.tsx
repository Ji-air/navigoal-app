import React, { useMemo } from 'react'
import { useEquipage } from '../store/equipage'
import { useLigue } from '../store/ligue'
import { useScoreJournee } from '../hooks/useScoreJournee'
import { useClassementLigue } from '../hooks/useClassementLigue'

// ─── Constantes issues du fichier de contexte ──────────────────────────────────
const TOTAL_NM = 1200          // score max théorique tournoi
const NM_TO_PX = 1.8           // 1 nm = 1.8px
const FENETRE_NM = 150         // ±150nm autour du bateau
const FENETRE_PX = FENETRE_NM * NM_TO_PX * 2  // 540px = hauteur utile

const W = 390
const H = 540  // hauteur SVG = fenêtre ±150nm

// La trajectoire totale en pixels
const TRAJ_TOTAL_PX = TOTAL_NM * NM_TO_PX  // 2160px

// ─── Trajectoire de référence ──────────────────────────────────────────────────
// Définie sur la hauteur totale (TRAJ_TOTAL_PX), sens bas→haut
// Méandres avec grandes amplitudes et variations naturelles
// Le bateau se positionne à un ratio [0-1] sur cette trajectoire

function buildTrajPoints(totalPx: number) {
  const cx = W / 2
  // 8 segments avec amplitudes variables
  const amplitudes = [70, 90, 60, 85, 75, 95, 65, 80]
  const segH = totalPx / amplitudes.length

  const points: Array<{ x: number; y: number }> = [{ x: cx, y: totalPx }]

  for (let i = 0; i < amplitudes.length; i++) {
    const amp = amplitudes[i]
    const dir = i % 2 === 0 ? 1 : -1
    const y0 = totalPx - i * segH
    const y1 = totalPx - (i + 1) * segH
    const targetX = cx + dir * amp
    points.push({
      x: targetX,
      y: y1 + segH * 0.5,
    })
  }
  points.push({ x: cx, y: 0 })
  return points
}

// Retourne le point (x, y) sur la trajectoire pour un ratio [0-1]
// en utilisant une interpolation linéaire entre les waypoints
function getPointAtRatio(
  ratio: number,
  points: Array<{ x: number; y: number }>,
  totalPx: number
): { x: number; y: number } {
  const targetY = totalPx - ratio * totalPx
  // Trouver le segment
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const yMin = Math.min(p0.y, p1.y)
    const yMax = Math.max(p0.y, p1.y)
    if (targetY >= yMin && targetY <= yMax) {
      const t = (targetY - p0.y) / (p1.y - p0.y)
      return {
        x: p0.x + t * (p1.x - p0.x),
        y: targetY,
      }
    }
  }
  return points[points.length - 1]
}

// Convertit une position absolue en nm vers coordonnée Y dans le SVG
// Le bateau (maNm) est centré à H/2
function nmToSvgY(nm: number, maNm: number): number {
  const deltaNm = nm - maNm
  const deltaPx = deltaNm * NM_TO_PX
  return H / 2 - deltaPx
}

// Convertit Y absolu sur la trajectoire vers Y dans la fenêtre SVG
function trajYToSvgY(trajY: number, maTrajY: number): number {
  const delta = trajY - maTrajY
  return H / 2 + delta
}

function getOffsetX(i: number, total: number): number {
  const esp = total <= 3 ? 20 : total <= 5 ? 14 : total <= 8 ? 10 : 7
  return (i - Math.floor(total / 2)) * esp
}

export default function CartePage() {
  const { state } = useEquipage()
  const { ligueActive } = useLigue()
  const { totalNm, totalBoost, parMatch } = useScoreJournee(state.crew)
  const classement = useClassementLigue(ligueActive?.membres ?? [], totalNm, totalBoost)

  const { totalBreeze, totalWind } = useMemo(() => {
    let b = 0, w = 0
    parMatch.forEach(m => m.postesDeclenches.forEach(p => {
      if (p.nm === 10) b++
      else if (p.nm === 20) w++
    }))
    return { totalBreeze: b, totalWind: w }
  }, [parMatch])

  const maNm = classement.find(e => e.isCurrentUser)?.positionNm ?? totalNm

  // Construire les waypoints de la trajectoire
  const trajPoints = useMemo(() => buildTrajPoints(TRAJ_TOTAL_PX), [])

  // Position du bateau sur la trajectoire
  const monRatio = Math.min(maNm / TOTAL_NM, 1)
  const monPointAbs = getPointAtRatio(monRatio, trajPoints, TRAJ_TOTAL_PX)

  // Construire le path SVG — on affiche uniquement la fenêtre ±150nm
  // On translate la trajectoire pour que le bateau soit centré
  const svgPath = useMemo(() => {
    // Filtrer les points visibles dans la fenêtre ±FENETRE_PX/2
    const windowTop = monPointAbs.y - FENETRE_PX / 2
    const windowBottom = monPointAbs.y + FENETRE_PX / 2

    // Générer le path avec translation
    const offsetY = H / 2 - monPointAbs.y

    let d = `M ${trajPoints[0].x} ${trajPoints[0].y + offsetY}`
    for (let i = 1; i < trajPoints.length; i++) {
      const p0 = trajPoints[i - 1]
      const p1 = trajPoints[i]
      const cp1x = p0.x + (p1.x - p0.x) * 0.25
      const cp1y = p0.y + offsetY + (p1.y - p0.y) * 0.1
      const cp2x = p0.x + (p1.x - p0.x) * 0.75
      const cp2y = p1.y + offsetY - (p1.y - p0.y) * 0.1
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p1.x} ${p1.y + offsetY}`
    }
    return { d, offsetY, windowTop, windowBottom }
  }, [trajPoints, monPointAbs])

  // Clip pour portion parcourue : du bas jusqu'au bateau
  const bateauSvgY = H / 2  // bateau toujours centré
  const clipY = bateauSvgY

  if (!ligueActive) {
    return (
      <div style={{ padding: '24px 16px', background: '#F5F0E0', height: '100%' }}>
        <p style={{ fontSize: '14px', color: '#6B6560', textAlign: 'center', marginTop: '60px', lineHeight: 1.6 }}>
          Rejoins une ligue dans l'onglet Classement pour voir les bateaux de tes adversaires.
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: '#F5F0E0' }}>

      {/* SVG plein écran */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id="bgG7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C4D9E4" />
            <stop offset="100%" stopColor="#EDE8D8" />
          </linearGradient>
          <clipPath id="clipP7">
            <rect x="0" y={clipY} width={W} height={H - clipY + 20} />
          </clipPath>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#bgG7)" />

        {/* Trajectoire restante (pointillés) */}
        <path d={svgPath.d} fill="none" stroke="#9A9490" strokeWidth="1.8" strokeDasharray="7 5" opacity="0.4" />

        {/* Trajectoire parcourue (pleine) */}
        {maNm > 0 && (
          <path d={svgPath.d} fill="none" stroke="#4A8FA0" strokeWidth="2.5" strokeLinecap="round" clipPath="url(#clipP7)" />
        )}

        {/* Bateaux adverses */}
        {classement.filter(e => !e.isCurrentUser).map((e, i) => {
          const nm = e.positionNm
          // Vérifier si dans la fenêtre
          if (nm < maNm - FENETRE_NM || nm > maNm + FENETRE_NM) return null
          const ratio2 = Math.min(nm / TOTAL_NM, 1)
          const ptAbs = getPointAtRatio(ratio2, trajPoints, TRAJ_TOTAL_PX)
          const svgY = ptAbs.y + svgPath.offsetY
          const svgX = ptAbs.x + getOffsetX(i + 1, classement.length)
          return (
            <g key={e.utilisateurId}>
              <circle cx={svgX} cy={svgY} r={4} fill="#5a7a8a" opacity={0.65} />
              {classement.length <= 8 && (
                <text x={svgX} y={svgY - 8} textAnchor="middle" fontSize="9" fill="#2D2D2D" opacity={0.65}>
                  {e.pseudo} · {nm}nm
                </text>
              )}
            </g>
          )
        })}

        {/* Bateau utilisateur — toujours centré */}
        <circle cx={monPointAbs.x} cy={bateauSvgY} r={14} fill="#4A8FA0" opacity={0.18} />
        <circle cx={monPointAbs.x} cy={bateauSvgY} r={6} fill="#4A8FA0" />
        <text x={monPointAbs.x} y={bateauSvgY - 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="#2D2D2D">
          Vous · {maNm}nm
        </text>

        {/* Flèches adversaires hors fenêtre */}
        {classement.filter(e => !e.isCurrentUser && e.positionNm > maNm + FENETRE_NM)
          .sort((a, b) => a.positionNm - b.positionNm).slice(0, 2)
          .map((e, i) => (
            <text key={e.utilisateurId} x={80 + i * 160} y={20} fontSize="10" fill="#4A8FA0">
              ↑ {e.pseudo} +{e.positionNm - maNm}nm
            </text>
          ))}
        {classement.filter(e => !e.isCurrentUser && e.positionNm < maNm - FENETRE_NM)
          .sort((a, b) => b.positionNm - a.positionNm).slice(0, 2)
          .map((e, i) => (
            <text key={e.utilisateurId} x={80 + i * 160} y={H - 6} fontSize="10" fill="#6B6560">
              ↓ {e.pseudo} -{maNm - e.positionNm}nm
            </text>
          ))}
      </svg>

      {/* HUD flottant en haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'linear-gradient(to bottom, rgba(245,240,224,0.9) 0%, rgba(245,240,224,0) 100%)',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#6B6560', textTransform: 'uppercase' }}>
          JOURNÉE 1
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A8FA0' }}>
          {maNm} nm
        </span>
      </div>

      {/* Tableau de bord flottant en bas */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16,
        padding: '14px 16px',
        background: 'rgba(245,240,224,0.92)',
        border: '1px solid rgba(74,143,160,0.20)',
        borderRadius: '12px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A8FA0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          {ligueActive.nom}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {[
            { val: maNm,        label: 'nm',     color: '#2D2D2D' },
            { val: totalBreeze, label: 'Breeze', color: '#8AADBB' },
            { val: totalWind,   label: 'Wind',   color: '#4A8FA0' },
            { val: totalBoost,  label: 'Boost',  color: '#C4704A' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i === 1 && <div style={{ width: 1, height: 32, background: 'rgba(45,45,45,0.15)', flexShrink: 0 }} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</span>
                <span style={{ fontSize: '10px', color: '#9A9490', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  )
}
