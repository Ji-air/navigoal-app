import React, { useEffect, useState } from 'react'
import CarteFond from '../components/CarteFond'
import PosteRow from '../components/PosteRow'
import SheetPoste from '../components/SheetPoste'
import TabBar from '../components/TabBar'
import { useEquipageStore } from '../stores/equipageStore'
import type { PosteKey, NationDispo } from '../stores/equipageStore'
import { useAuthStore } from '../stores/authStore'
import type { AppPage } from '../App'

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


interface EquipageProps {
  onNavigate?: (page: AppPage) => void
}

export default function Equipage({ onNavigate }: EquipageProps) {
  const {
    journee, equipage, nationsDisponibles, loading, error,
    setPoste, validerEquipage,
  } = useEquipageStore()

  const { pseudo } = useAuthStore()

  const [selectedPoste, setSelectedPoste] = useState<PosteKey | null>(null)
  const [validating,    setValidating]    = useState(false)
  const [countdown,      setCountdown]      = useState('')

  useEffect(() => {
    if (!journee) return
    const tick = () =>
      setCountdown(formatCountdown(journee.heure_gel_utc, journee.statut_gel))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [journee])

  const isGele = journee?.statut_gel === 'gelé' || equipage?.statut === 'gelé'

  const allFilled = !!(
    equipage?.cap_nation_id &&
    equipage?.barre_nation_id &&
    equipage?.ancre_nation_id &&
    equipage?.vigie_nation_id
  )

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
  }

  function handleClose() {
    setSelectedPoste(null)
  }

  async function handleConfirm(nation: NationDispo) {
    if (!selectedPoste) return
    await setPoste(selectedPoste, nation.id)
    handleClose()
  }

  async function handleValidate() {
    if (validating) return
    setValidating(true)
    await validerEquipage()
    setValidating(false)
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
        <span className="eq-captain-name">{pseudo ?? 'Capitaine'}</span>
      </div>

      {/* Panel équipage */}
      <div className="eq-crew">
        <div className="eq-crew-hd">
          <span className="eq-crew-h1">Équipage</span>
          {journee && equipage?.statut === 'validé' ? (
            <span className="eq-crew-status" style={{ color: 'var(--accent)' }}>
              Validé ✓
            </span>
          ) : journee && (
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

            {/* Bouton de validation — visible quand l'équipage est complet et en brouillon */}
            {!isGele && allFilled && equipage?.statut === 'brouillon' && (
              <div className="eq-validate">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleValidate}
                  disabled={validating}
                >
                  {validating ? 'Validation…' : 'Valider l\'équipage'}
                </button>
              </div>
            )}

            {equipage?.statut === 'validé' && (
              <div className="eq-validated">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                Équipage validé
              </div>
            )}
          </>
        )}
      </div>

      {/* Sheet nation + lineup (déployé dans le même bottom sheet) */}
      {selectedPoste && (
        <SheetPoste
          poste={selectedPoste}
          equipage={equipage}
          nationsDisponibles={nationsDisponibles}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}

      <TabBar active="equipage" onNavigate={onNavigate ?? (() => {})} />

    </div>
  )
}
