import React, { useState } from 'react'
import { AuthProvider, useAuth } from './store/auth'
import { LigueProvider } from './store/ligue'
import { EquipageProvider } from './store/equipage'
import AuthPage from './pages/AuthPage'
import EquipagePage from './pages/EquipagePage'
import MatchsPage from './pages/MatchsPage'
import CartePage from './pages/CartePage'
import ClassementPage from './pages/ClassementPage'

type Tab = 'equipage' | 'matchs' | 'carte' | 'classement'

const TABS: { id: Tab; label: string }[] = [
  { id: 'equipage',    label: 'Équipage' },
  { id: 'matchs',      label: 'Matchs' },
  { id: 'carte',       label: 'Carte' },
  { id: 'classement',  label: 'Classement' },
]

function AppInner() {
  const { session, seDeconnecter } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('equipage')

  if (!session) return <AuthPage />

  return (
    <LigueProvider>
    <EquipageProvider>
      <div className="app">
        <header className="app-header">
          <span className="app-header__pseudo">{session.pseudo}</span>
          <button type="button" className="app-header__deconnexion" onClick={seDeconnecter}>
            Déconnexion
          </button>
        </header>

        <main className="app-content">
          {activeTab === 'equipage'   && <EquipagePage />}
          {activeTab === 'matchs'     && <MatchsPage />}
          {activeTab === 'carte'      && <CartePage />}
          {activeTab === 'classement' && <ClassementPage />}
        </main>

        <nav className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tab-bar__item${activeTab === tab.id ? ' tab-bar__item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </EquipageProvider>
    </LigueProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
