import React from 'react'
import type { AppPage } from '../App'

interface TabBarProps {
  active:     AppPage
  onNavigate: (page: AppPage) => void
}

function IconEquipage() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <circle cx="128" cy="52" r="22" stroke="currentColor" strokeWidth="18"/>
      <line x1="128" y1="74"  x2="128" y2="182" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <path d="M52,124 C36,132 36,164 36,164 C36,190 70,208 128,208 C186,208 220,190 220,164 C220,164 220,132 204,124"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <line x1="52" y1="124" x2="204" y2="124" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
    </svg>
  )
}

function IconMatchs() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <line x1="36" y1="76"  x2="220" y2="76"  stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <line x1="36" y1="128" x2="220" y2="128" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <line x1="36" y1="180" x2="220" y2="180" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
    </svg>
  )
}

function IconCarte() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <polygon points="28,60 92,28 164,60 228,28 228,196 164,228 92,196 28,228"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinejoin="round"/>
      <line x1="92"  y1="28"  x2="92"  y2="196" stroke="currentColor" strokeWidth="18"/>
      <line x1="164" y1="60"  x2="164" y2="228" stroke="currentColor" strokeWidth="18"/>
    </svg>
  )
}

function IconClassement() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <path d="M84,228 L172,228" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <line x1="128" y1="188" x2="128" y2="228" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <path d="M52,36 L52,118 C52,154 86,188 128,188 C170,188 204,154 204,118 L204,36"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <path d="M52,76 C28,76 28,110 28,110 C28,128 52,130 52,130"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <path d="M204,76 C228,76 228,110 228,110 C228,128 204,130 204,130"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export default function TabBar({ active, onNavigate }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="Navigation">
      <button
        type="button"
        className={`tab-bar__item${active === 'equipage' ? ' tab-bar__item--active' : ''}`}
        aria-current={active === 'equipage' ? 'page' : undefined}
        onClick={() => onNavigate('equipage')}
      >
        <IconEquipage />
        <span>Équipage</span>
      </button>
      <button
        type="button"
        className={`tab-bar__item${active === 'matchs' ? ' tab-bar__item--active' : ''}`}
        aria-current={active === 'matchs' ? 'page' : undefined}
        onClick={() => onNavigate('matchs')}
      >
        <IconMatchs />
        <span>Matchs</span>
      </button>
      <button
        type="button"
        className={`tab-bar__item${active === 'carte' ? ' tab-bar__item--active' : ''}`}
        aria-current={active === 'carte' ? 'page' : undefined}
        onClick={() => onNavigate('carte')}
      >
        <IconCarte />
        <span>Carte</span>
      </button>
      <button
        type="button"
        className={`tab-bar__item${active === 'classement' ? ' tab-bar__item--active' : ''}`}
        aria-current={active === 'classement' ? 'page' : undefined}
        onClick={() => onNavigate('classement')}
      >
        <IconClassement />
        <span>Classement</span>
      </button>
    </nav>
  )
}
