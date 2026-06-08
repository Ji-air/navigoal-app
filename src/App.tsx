import React, { useEffect, useState } from 'react'
import './styles/app.css'
import Equipage from './pages/Equipage'
import MatchsPage from './pages/MatchsPage'
import CartePage from './pages/CartePage'
import ClassementPage from './pages/ClassementPage'
import ModaleRejoindre from './components/ModaleRejoindre'
import ModaleIdentification from './components/ModaleIdentification'
import { useEquipageStore } from './stores/equipageStore'
import { useLigueStore } from './stores/ligueStore'
import { useAuthStore } from './stores/authStore'

export type AppPage = 'equipage' | 'matchs' | 'carte' | 'classement'

function getLigueCodeFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('ligue')
  } catch {
    return null
  }
}

function clearLigueParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('ligue')
  window.history.replaceState({}, '', url.toString())
}

export default function App() {
  const [page,      setPage]      = useState<AppPage>('equipage')
  const [ligueCode, setLigueCode] = useState<string | null>(() => getLigueCodeFromUrl())

  const userId      = useAuthStore(s => s.userId)
  const authLoading = useAuthStore(s => s.loading)
  const restoreSession = useAuthStore(s => s.restoreSession)

  const init            = useEquipageStore(s => s.init)
  const fetchClassement = useLigueStore(s => s.fetchClassement)

  // 1. Restaurer la session au démarrage
  useEffect(() => {
    void restoreSession()
  }, [])

  // 2. Charger les données dès qu'on a un userId
  useEffect(() => {
    if (userId) {
      void init(userId)
      void fetchClassement(userId)
    }
  }, [userId])

  function handleJoined() {
    setLigueCode(null)
    clearLigueParam()
    setPage('classement')
  }

  function handleCloseLigue() {
    setLigueCode(null)
    clearLigueParam()
  }

  // Pendant la vérification de session : l'app s'affiche en arrière-plan,
  // la modale d'identification apparaît dessus si aucune session n'est trouvée.
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>

      {/* Pages de l'application */}
      {page === 'equipage'   && <Equipage onNavigate={setPage} />}
      {page === 'matchs'     && <MatchsPage onNavigate={setPage} />}
      {page === 'carte'      && <CartePage onNavigate={setPage} />}
      {page === 'classement' && <ClassementPage onNavigate={setPage} userId={userId ?? 'demo-user'} />}

      {/* Portail auth : affiché une fois la vérification de session terminée */}
      {!authLoading && !userId && <ModaleIdentification />}

      {/* Invitation ligue : affiché uniquement après authentification */}
      {userId && ligueCode && (
        <ModaleRejoindre
          code={ligueCode}
          userId={userId}
          onClose={handleCloseLigue}
          onJoined={handleJoined}
        />
      )}
    </div>
  )
}
