// Generates deterministic SVG path data for CartePage.
// Seed 42 — identical paths across all builds/sessions.

export const SVG_W    = 390
export const SVG_H    = 3150
export const CX       = SVG_W / 2   // 195
export const NM_TO_PX = 1.8
export const SEGMENTS = 35          // × 90 px = 3150 px

type Pt = { x: number; y: number }

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function genAnchors(seed: number, amp: number): Pt[] {
  const rand = lcg(seed)
  const SEG  = SVG_H / SEGMENTS  // 90 px per segment
  const pts: Pt[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const y = SVG_H - i * SEG
    let x = CX
    if (i > 0 && i < SEGMENTS) {
      const osc = Math.sin(i * Math.PI * 2 / 9) * amp
      const jit = (rand() - 0.5) * amp * 0.4
      x = Math.max(8, Math.min(SVG_W - 8, CX + osc + jit))
    }
    pts.push({ x, y })
  }
  return pts
}

// Catmull-Rom → cubic Bézier conversion (uniform parameterisation)
function catmullPath(pts: Pt[]): string {
  const n = pts.length
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

// ── Race trajectory (main line) ───────────────────────────────────────────────

const TRAJ_ANCHORS = genAnchors(42, 42)
export const TRAJECTOIRE_PATH = catmullPath(TRAJ_ANCHORS)

// ── Left coast (shifted −148 px from trajectory) ──────────────────────────────

const COTE_ANCHORS: Pt[] = TRAJ_ANCHORS.map(p => ({
  x: Math.max(1, Math.min(CX - 10, p.x - 148)),
  y: p.y,
}))
export const COTE_PATH    = catmullPath(COTE_ANCHORS)
export const COTE_CLIP_D  = `${COTE_PATH} L 0,0 L 0,${SVG_H} Z`

// ── Diagonal hatch lines (pre-computed opacities for stable renders) ──────────

const hRand = lcg(99)
export const COTE_HATCH: { y0: number; opacity: number }[] = (() => {
  const lines: { y0: number; opacity: number }[] = []
  for (let y = -SVG_W; y <= SVG_H + SVG_W; y += 18) {
    lines.push({ y0: y, opacity: +(0.05 + hRand() * 0.04).toFixed(3) })
  }
  return lines
})()
