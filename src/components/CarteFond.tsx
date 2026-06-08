import React from 'react'

interface CarteFondProps {
  visible?: boolean
}

/* SVG de fond porté depuis screen mockup/V3/eq1_vide_carte_bg.html.
   Rendu statique : pas de bateaux ni de trajectoires pour l'instant. */
export default function CarteFond({ visible = true }: CarteFondProps) {
  if (!visible) return null

  return (
    <div className="eq-bg-carte">
      <svg
        id="carte"
        width="390"
        height="724"
        viewBox="0 0 390 724"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="coast-l" x="-20%" y="-2%" width="140%" height="104%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.022 0.014"
              numOctaves={4}
              seed={4}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={14}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <clipPath id="clip-coast-l">
            <path d="M 47,724 C 64,688 72,648 69,608
              C 66,568 55,543 36,513
              C 20,486 16,458 25,428
              C 34,398 43,383 47,356
              C 51,329 58,306 67,276
              C 77,246 82,214 76,178
              C 71,142 60,122 47,96
              C 34,70 27,44 29,12 L 0,12 L 0,724 Z"/>
          </clipPath>
        </defs>

        {/* Fond */}
        <rect width="390" height="724" fill="#0D1117"/>

        {/* Zones concentriques */}
        <path
          d="M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 249,246 258,214 248,178 C 238,142 218,122 195,96 C 172,70 158,44 162,12"
          fill="none" stroke="rgba(0,229,204,0.042)" strokeWidth="55" strokeLinecap="round"/>
        <path
          d="M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 249,246 258,214 248,178 C 238,142 218,122 195,96 C 172,70 158,44 162,12"
          fill="none" stroke="rgba(0,229,204,0.025)" strokeWidth="110" strokeLinecap="round"/>
        <path
          d="M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 249,246 258,214 248,178 C 238,142 218,122 195,96 C 172,70 158,44 162,12"
          fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="180" strokeLinecap="round"/>
        <path
          d="M 195,724 C 225,688 240,648 235,608 C 230,568 210,543 175,513 C 145,486 138,458 155,428 C 172,398 188,383 195,356 C 202,329 215,306 232,276 C 249,246 258,214 248,178 C 238,142 218,122 195,96 C 172,70 158,44 162,12"
          fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="260" strokeLinecap="round"/>

        {/* Côte gauche — contour teal */}
        <path
          d="M 47,724 C 64,688 72,648 69,608 C 66,568 55,543 36,513 C 20,486 16,458 25,428 C 34,398 43,383 47,356 C 51,329 58,306 67,276 C 77,246 82,214 76,178 C 71,142 60,122 47,96 C 34,70 27,44 29,12"
          fill="none"
          stroke="rgba(0,229,204,0.08)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#coast-l)"/>

        {/* Côte gauche — ligne lumineuse */}
        <path
          d="M 47,724 C 64,688 72,648 69,608 C 66,568 55,543 36,513 C 20,486 16,458 25,428 C 34,398 43,383 47,356 C 51,329 58,306 67,276 C 77,246 82,214 76,178 C 71,142 60,122 47,96 C 34,70 27,44 29,12"
          fill="none"
          stroke="rgba(240,244,248,0.10)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#coast-l)"/>

        {/* Hachures clippées */}
        <g clipPath="url(#clip-coast-l)">
          <line x1="0" y1="-390" x2="390" y2="0"   stroke="rgba(0,229,204,0.076)" strokeWidth="0.6"/>
          <line x1="0" y1="-354" x2="390" y2="36"  stroke="rgba(0,229,204,0.061)" strokeWidth="0.6"/>
          <line x1="0" y1="-318" x2="390" y2="72"  stroke="rgba(0,229,204,0.079)" strokeWidth="0.6"/>
          <line x1="0" y1="-282" x2="390" y2="108" stroke="rgba(0,229,204,0.086)" strokeWidth="0.6"/>
          <line x1="0" y1="-246" x2="390" y2="144" stroke="rgba(0,229,204,0.067)" strokeWidth="0.6"/>
          <line x1="0" y1="-210" x2="390" y2="180" stroke="rgba(0,229,204,0.059)" strokeWidth="0.6"/>
          <line x1="0" y1="-174" x2="390" y2="216" stroke="rgba(0,229,204,0.051)" strokeWidth="0.6"/>
          <line x1="0" y1="-138" x2="390" y2="252" stroke="rgba(0,229,204,0.076)" strokeWidth="0.6"/>
          <line x1="0" y1="-102" x2="390" y2="288" stroke="rgba(0,229,204,0.059)" strokeWidth="0.6"/>
          <line x1="0" y1="-66"  x2="390" y2="324" stroke="rgba(0,229,204,0.082)" strokeWidth="0.6"/>
          <line x1="0" y1="-30"  x2="390" y2="360" stroke="rgba(0,229,204,0.082)" strokeWidth="0.6"/>
          <line x1="0" y1="6"    x2="390" y2="396" stroke="rgba(0,229,204,0.064)" strokeWidth="0.6"/>
          <line x1="0" y1="42"   x2="390" y2="432" stroke="rgba(0,229,204,0.088)" strokeWidth="0.6"/>
          <line x1="0" y1="78"   x2="390" y2="468" stroke="rgba(0,229,204,0.054)" strokeWidth="0.6"/>
          <line x1="0" y1="114"  x2="390" y2="504" stroke="rgba(0,229,204,0.084)" strokeWidth="0.6"/>
          <line x1="0" y1="150"  x2="390" y2="540" stroke="rgba(0,229,204,0.082)" strokeWidth="0.6"/>
          <line x1="0" y1="186"  x2="390" y2="576" stroke="rgba(0,229,204,0.071)" strokeWidth="0.6"/>
          <line x1="0" y1="222"  x2="390" y2="612" stroke="rgba(0,229,204,0.065)" strokeWidth="0.6"/>
          <line x1="0" y1="258"  x2="390" y2="648" stroke="rgba(0,229,204,0.083)" strokeWidth="0.6"/>
          <line x1="0" y1="294"  x2="390" y2="684" stroke="rgba(0,229,204,0.084)" strokeWidth="0.6"/>
          <line x1="0" y1="330"  x2="390" y2="720" stroke="rgba(0,229,204,0.078)" strokeWidth="0.6"/>
          <line x1="0" y1="366"  x2="390" y2="756" stroke="rgba(0,229,204,0.059)" strokeWidth="0.6"/>
          <line x1="0" y1="402"  x2="390" y2="792" stroke="rgba(0,229,204,0.053)" strokeWidth="0.6"/>
        </g>
      </svg>
    </div>
  )
}
