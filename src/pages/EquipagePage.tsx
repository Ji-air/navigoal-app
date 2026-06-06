import { useState, useEffect } from 'react'
import CarteFond from '../components/CarteFond'
import PosteRow from '../components/PosteRow'
import SheetNation, { type NationInfo } from '../components/SheetNation'
import SheetLigne from '../components/SheetLigne'
import { useEquipageStore, type PosteKey } from '../stores/equipageStore'
import { fetchJourneeCourante } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Vignette capitaine (top-right)
// ---------------------------------------------------------------------------

function CaptainBadge({ pseudo }: { pseudo: string }) {
  return (
    <div className="eq-captain-badge">
      <div className="eq-captain-avatar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: .85 }}>
          <path d="M2 17 C2 17 4 15 12 15 C20 15 22 17 22 17"/>
          <path d="M12 15 L12 10"/>
          <path d="M6 15 C6 12 12 10 12 10 C12 10 18 12 18 15"/>
          <rect x="2" y="17" width="20" height="2.5" rx="1.2"/>
        </svg>
      </div>
      <span className="eq-captain-name">{pseudo}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compte à rebours gel
// ---------------------------------------------------------------------------

function formatCountdown(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

const POSTES: PosteKey[] = ['cap', 'barre', 'ancre', 'vigie']

export default function EquipagePage() {
  const { postes, journeeNumero, validerEquipage, valide, setPoste } = useEquipageStore()
  const gelState = { estGele: false, secondsAvantGel: null as number | null }

  const [journeeId, setJourneeId] = useState<string>('')
  const [activePoste, setActivePoste] = useState<PosteKey | null>(null)
  const [pendingNation, setPendingNation] = useState<NationInfo | null>(null)

  useEffect(() => {
    fetchJourneeCourante().then(j => {
      if (j) setJourneeId(j.id)
    })
  }, [])

  const complet = Object.values(postes).every(p => p !== null)

  function handlePosteClick(poste: PosteKey) {
    if (gelState.estGele) return
    setActivePoste(poste)
    setPendingNation(null)
  }

  function handleSelectNation(nation: NationInfo) {
    setPendingNation(nation)
  }

  function handleConfirm() {
    if (!activePoste || !pendingNation) return
    setPoste(activePoste, pendingNation.id, pendingNation.flag)
    setActivePoste(null)
    setPendingNation(null)
  }

  function handleBack() {
    setPendingNation(null)
  }

  function handleClose() {
    setActivePoste(null)
    setPendingNation(null)
  }

  return (
    <div className="equipage-scene">

      {/* Carte en fond */}
      <CarteFond />

      {/* Vignette capitaine */}
      <CaptainBadge pseudo="Capitaine" />

      {/* Panel équipage */}
      <div className="eq-crew">
        <div className="eq-crew-hd">
          <span className="eq-crew-h1">Équipage</span>
          <span className="eq-crew-status">
            {gelState.estGele ? (
              'Navigation en cours'
            ) : gelState.secondsAvantGel !== null ? (
              <>
                <span className="eq-dot" />
                {`Gel dans ${formatCountdown(gelState.secondsAvantGel)}`}
              </>
            ) : (
              <>
                <span className="eq-dot" />
                {`Journée ${journeeNumero}`}
              </>
            )}
          </span>
        </div>

        {POSTES.map(poste => (
          <PosteRow
            key={poste}
            poste={poste}
            flag={postes[poste]?.flag ?? null}
            onClick={() => handlePosteClick(poste)}
            disabled={gelState.estGele}
          />
        ))}

        {/* Bouton validation / verrouillé */}
        <div className="eq-validate">
          {gelState.estGele ? (
            <button type="button" className="eq-validate__locked" disabled>
              ⚓ Sélections verrouillées
            </button>
          ) : valide ? (
            <div className="eq-validate__succes">Équipage validé ✓</div>
          ) : (
            <button
              type="button"
              className="eq-validate__btn"
              disabled={!complet}
              onClick={() => void validerEquipage()}
            >
              Valider l'équipage
            </button>
          )}
        </div>
      </div>

      {/* Bottom sheet — sélection nation */}
      {activePoste && (
        <SheetNation
          poste={activePoste}
          journeeId={journeeId}
          onSelect={handleSelectNation}
          onClose={handleClose}
        />
      )}

      {/* Bottom sheet — lineup confirmation (par-dessus SheetNation) */}
      {activePoste && pendingNation && (
        <SheetLigne
          poste={activePoste}
          nation={pendingNation}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}

    </div>
  )
}
