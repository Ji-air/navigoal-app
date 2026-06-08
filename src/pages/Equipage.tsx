import React, { useEffect, useRef, useState } from 'react'
import CarteFond from '../components/CarteFond'
import PosteRow from '../components/PosteRow'
import { useEquipageStore } from '../stores/equipageStore'
import type { PosteKey } from '../stores/equipageStore'

/* ── Countdown gel ── */
function formatCountdown(heureGelUtc: string | null, statutGel: string): string {
  if (statutGel === 'gelé') return 'Équipage gelé'
  if (!heureGelUtc) return '—'
  const diff = new Date(heureGelUtc).getTime() - Date.now()
  if (diff <= 0) return 'Gel imminent'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `Gel dans ${h}h ${String(m).padStart(2, '0')}m`
}

/* ── Icônes tab bar ── */
function TabEquipage() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <circle cx="128" cy="52" r="22" stroke="currentColor" strokeWidth="18"/>
      <line x1="128" y1="74" x2="128" y2="182" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <path d="M52,124 C36,132 36,164 36,164 C36,190 70,208 128,208 C186,208 220,190 220,164 C220,164 220,132 204,124"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <line x1="52" y1="124" x2="204" y2="124" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
    </svg>
  )
}
function TabMatchs() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <line x1="36" y1="76"  x2="220" y2="76"  stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <line x1="36" y1="128" x2="220" y2="128" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
      <line x1="36" y1="180" x2="220" y2="180" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
    </svg>
  )
}
function TabCarte() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <polygon points="28,60 92,28 164,60 228,28 228,196 164,228 92,196 28,228"
        stroke="currentColor" strokeWidth="18" fill="none" strokeLinejoin="round"/>
      <line x1="92" y1="28" x2="92" y2="196" stroke="currentColor" strokeWidth="18"/>
      <line x1="164" y1="60" x2="164" y2="228" stroke="currentColor" strokeWidth="18"/>
    </svg>
  )
}
function TabClassement() {
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

export default function Equipage() {
  const { journee, equipage, nationsDisponibles, loading, error, init } = useEquipageStore()
  const [selectedPoste, setSelectedPoste] = useState<PosteKey | null>(null)
  const [countdown, setCountdown]         = useState('')
  const initialized = useRef(false)

  // TODO: replace with useAuthStore().userId when auth is wired
  const userId = 'demo-user'

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      void init(userId)
    }
  }, [])

  useEffect(() => {
    if (!journee) return
    const tick = () =>
      setCountdown(formatCountdown(journee.heure_gel_utc, journee.statut_gel))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [journee])

  const isGele = journee?.statut_gel === 'gelé' || equipage?.statut === 'gelé'

  /* Résout un nation_id en { id, nom } depuis les nations disponibles.
     Fallback sur l'ID seul si les nations ne sont pas encore chargées. */
  function resolveNation(id: string | null): { id: string; nom: string } | null {
    if (!id) return null
    const found = nationsDisponibles.find(n => n.id === id)
    return found ? { id: found.id, nom: found.nom } : { id, nom: id }
  }

  function handlePosteClick(poste: PosteKey) {
    if (isGele) return
    setSelectedPoste(poste)
    // TODO: ouvrir la bottom sheet de sélection de nation
  }

  return (
    <div className="eq-screen">

      {/* Carte en fond */}
      <CarteFond />

      {/* Vignette capitaine */}
      <div className="eq-captain">
        <div className="eq-captain-avatar">
          <svg viewBox="0 0 24 24">
            <path d="M2 17 C2 17 4 15 12 15 C20 15 22 17 22 17"/>
            <path d="M12 15 L12 10"/>
            <path d="M6 15 C6 12 12 10 12 10 C12 10 18 12 18 15"/>
            <rect x="2" y="17" width="20" height="2.5" rx="1.2"/>
          </svg>
        </div>
        {/* TODO: afficher le pseudo depuis useAuthStore */}
        <span className="eq-captain-name">Moi</span>
      </div>

      {/* Panel équipage */}
      <div className="eq-crew">
        <div className="eq-crew-hd">
          <span className="eq-crew-h1">Équipage</span>
          {journee && (
            <span className="eq-crew-status">
              {!isGele && <span className="eq-dot" />}
              {countdown}
            </span>
          )}
        </div>

        {loading && (
          <p className="eq-hint">Chargement…</p>
        )}
        {error && !loading && (
          <p className="eq-error">{error}</p>
        )}

        {!loading && (
          <>
            <PosteRow
              poste="cap"
              nation={resolveNation(equipage?.cap_nation_id ?? null)}
              isGele={isGele}
              onClick={() => handlePosteClick('cap')}
            />
            <PosteRow
              poste="barre"
              nation={resolveNation(equipage?.barre_nation_id ?? null)}
              isGele={isGele}
              onClick={() => handlePosteClick('barre')}
            />
            <PosteRow
              poste="ancre"
              nation={resolveNation(equipage?.ancre_nation_id ?? null)}
              isGele={isGele}
              onClick={() => handlePosteClick('ancre')}
            />
            <PosteRow
              poste="vigie"
              nation={resolveNation(equipage?.vigie_nation_id ?? null)}
              isGele={isGele}
              onClick={() => handlePosteClick('vigie')}
            />
          </>
        )}
      </div>

      {/* Tab bar — stub non-fonctionnel pour les autres onglets */}
      <nav className="tab-bar" aria-label="Navigation">
        <button type="button" className="tab-bar__item tab-bar__item--active" aria-current="page">
          <TabEquipage />
          <span>Équipage</span>
        </button>
        <button type="button" className="tab-bar__item" disabled>
          <TabMatchs />
          <span>Matchs</span>
        </button>
        <button type="button" className="tab-bar__item" disabled>
          <TabCarte />
          <span>Carte</span>
        </button>
        <button type="button" className="tab-bar__item" disabled>
          <TabClassement />
          <span>Classement</span>
        </button>
      </nav>

    </div>
  )
}
