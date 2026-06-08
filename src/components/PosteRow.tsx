import React from 'react'
import type { Nation } from '../lib/supabase'

export type PosteId = 'cap' | 'barre' | 'ancre' | 'vigie'

interface PosteRowProps {
  poste:   PosteId
  nation:  Nation | null
  isGele?: boolean
  onClick: () => void
}

/* ── Métadonnées par poste ── */
const POSTE_META: Record<PosteId, { label: string; sub: string; num: string }> = {
  cap:   { label: 'Cap',   sub: 'ATT · Buteur',  num: '01' },
  barre: { label: 'Barre', sub: 'MIL · Passeur', num: '02' },
  ancre: { label: 'Ancre', sub: 'DEF · Bloc',    num: '03' },
  vigie: { label: 'Vigie', sub: 'GK · Arrêt',    num: '04' },
}

/* ── Icônes SVG maritimes (portées depuis les maquettes V3) ── */

function IconCap() {
  return (
    <svg viewBox="0 0 93.64 82.29" style={{ width: 28, height: 28, display: 'block', overflow: 'hidden' }}>
      <g transform="translate(-14.48,4.55)">
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 612.773438 649.853125 C 755.703125 649.853125 871.5625 533.954688 871.5625 391.064063 C 871.5625 248.134375 755.703125 132.275 612.773438 132.275 C 469.84375 132.275 353.984375 248.134375 353.984375 391.064063 C 353.984375 533.954688 469.84375 649.853125 612.773438 649.853125 Z"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 607.382812 445.24375 L 774.0625 537.978125 L 666.25 380.673438 C 667.226562 387.509375 667.226562 391.064063 667.226562 421.142188 642.851562 445.517188 612.773438 445.517188 C 607.382812 445.24375 Z"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 559.257812 401.415625 L 451.484375 244.110938 L 618.125 336.845313 C 582.695312 336.571875 558.28125 360.946875 558.28125 391.064063 C 558.28125 401.415625 Z"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 612.773438 445.517188 C 642.851562 445.517188 667.226562 421.142188 667.226562 391.064063 C 667.226562 360.946875 642.851562 336.571875 612.773438 336.571875 C 582.695312 336.571875 558.28125 360.946875 558.28125 391.064063 C 558.28125 421.142188 582.695312 445.517188 612.773438 445.517188 Z"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
      </g>
    </svg>
  )
}

function IconBarre() {
  return (
    <svg viewBox="0 0 90.96 90.96" style={{ width: 28, height: 28, display: 'block', overflow: 'hidden' }}>
      <g transform="translate(-0.12,0.58)">
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 455.703125 719.560938 C 598.632812 719.560938 714.492188 603.701563 714.492188 460.771875 C 714.492188 317.842188 598.632812 201.982813 455.703125 201.982813 C 312.773438 201.982813 196.914062 317.842188 196.914062 460.771875 C 196.914062 603.701563 312.773438 719.560938 455.703125 719.560938 Z"
          transform="matrix(0.1,0,0,-0.1,0,90.96)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 455.703125 784.795313 L 455.703125 532.529688 M 455.703125 389.014063 L 455.703125 136.748438"
          transform="matrix(0.1,0,0,-0.1,0,90.96)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 131.679688 460.771875 L 383.945312 460.771875 M 527.460938 460.771875 L 779.726562 460.771875"
          transform="matrix(0.1,0,0,-0.1,0,90.96)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 455.703125 532.529688 C 495.351562 532.529688 527.460938 500.420313 527.460938 460.771875 C 527.460938 421.123438 495.351562 389.014063 455.703125 389.014063 C 416.09375 389.014063 383.945312 421.123438 383.945312 460.771875 C 383.945312 500.420313 416.09375 532.529688 455.703125 532.529688 Z"
          transform="matrix(0.1,0,0,-0.1,0,90.96)"/>
      </g>
    </svg>
  )
}

function IconAncre() {
  return (
    <svg viewBox="0 0 85.64 82.29" style={{ width: 28, height: 28, display: 'block', overflow: 'hidden' }}>
      <g transform="translate(-11.68,4.6)">
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 544.960938 730.790625 C 572.109375 730.790625 594.101562 708.798438 594.101562 681.689063 C 594.101562 654.540625 572.109375 632.548438 544.960938 632.548438 C 517.8125 632.548438 495.820312 654.540625 495.820312 681.689063 C 495.820312 708.798438 517.8125 730.790625 544.960938 730.790625 Z"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 544.960938 632.548438 L 544.960938 183.603125"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 445.351562 534.853125 L 644.570312 534.853125"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 735.429688 356.610938 C 726.210938 259.540625 644.453125 183.603125 544.960938 183.603125 C 445.46875 183.603125 363.710938 259.540625 354.492188 356.610938"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 330.234375 307.235938 L 354.492188 356.610938 L 397.851562 321.884375"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 759.726562 307.235938 L 735.429688 356.610938 L 692.070312 321.884375"
          transform="matrix(0.1,0,0,-0.1,0,82.29)"/>
      </g>
    </svg>
  )
}

function IconVigie() {
  return (
    <svg viewBox="0 0 101.64 90.29" style={{ width: 28, height: 28, display: 'block', overflow: 'hidden' }}>
      <g transform="translate(-10.48,8.0)">
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 909.453125 681.767188 L 763.203125 828.017188 L 609.023438 673.798438 C 605.078125 669.853125 605.078125 663.407813 609.023438 659.423438 L 740.898438 527.548438 C 744.84375 523.603125 751.328125 523.603125 755.273438 527.548438 Z"
          transform="matrix(0.1,0,0,-0.1,0,90.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 618.398438 434.892188 L 516.328125 536.9625 C 513.4375 539.853125 513.4375 544.61875 516.328125 547.509375 L 613.359375 644.540625 C 616.289062 647.43125 621.015625 647.43125 623.945312 644.540625 L 725.976562 542.470313 C 728.90625 539.579688 728.90625 534.814063 725.976562 531.923438 L 628.984375 434.892188 C 626.054688 431.9625 621.328125 431.9625 618.398438 434.892188 Z"
          transform="matrix(0.1,0,0,-0.1,0,90.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 593.90625 459.384375 L 540.859375 512.43125 C 539.257812 514.032813 536.679688 514.032813 535.078125 512.43125 L 335.78125 313.134375 C 334.179688 311.571875 334.179688 308.954688 335.78125 307.353125 L 388.828125 254.30625 C 390.429688 252.704688 393.007812 252.704688 394.609375 254.30625 L 593.90625 453.603125 C 595.507812 455.204688 595.507812 457.782813 593.90625 459.384375 Z"
          transform="matrix(0.1,0,0,-0.1,0,90.29)"/>
        <path fill="none" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"
          stroke="#00E5CC"
          d="M 408.515625 234.61875 L 316.054688 327.079688"
          transform="matrix(0.1,0,0,-0.1,0,90.29)"/>
      </g>
    </svg>
  )
}

const ICONS: Record<PosteId, React.FC> = {
  cap:   IconCap,
  barre: IconBarre,
  ancre: IconAncre,
  vigie: IconVigie,
}

/* Chevron droite */
function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9,18 15,12 9,6"/>
    </svg>
  )
}

/* Abréviation nation (3 premières lettres, majuscules) */
function abrev(nom: string) {
  return nom.slice(0, 3).toUpperCase()
}

export default function PosteRow({ poste, nation, isGele = false, onClick }: PosteRowProps) {
  const { label, sub, num } = POSTE_META[poste]
  const Icon = ICONS[poste]

  const isOn  = nation !== null
  const isOff = isGele && !isOn  // gelé sans nation → grisé

  const rowClass = [
    'eq-row',
    isOn   ? 'eq-row--on'     : '',
    isOff  ? 'eq-row--off'    : '',
    isGele && isOn ? 'eq-row--frozen' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass} onClick={isGele ? undefined : onClick} role="button" tabIndex={isGele ? -1 : 0}>
      <div className="eq-rico">
        <Icon />
      </div>

      <div className="eq-rinfo">
        <span className="eq-rname">{label}</span>
        <span className="eq-rsub">{sub}</span>
      </div>

      <div className="eq-rright">
        {isOn && (
          <span className="eq-rflag">{abrev(nation!.nom)}</span>
        )}
        <span className="eq-rnum">{num}</span>
        <span className="eq-rarr">
          <Chevron />
        </span>
      </div>
    </div>
  )
}
