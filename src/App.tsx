import React, { useState } from 'react'
import EquipagePage from './pages/EquipagePage'
import MatchsPage   from './pages/MatchsPage'
import './styles/app.css'

type Tab = 'equipage' | 'matchs' | 'carte' | 'classement'

const TABS: { id: Tab; label: string }[] = [
  { id: 'equipage',   label: 'Équipage'    },
  { id: 'matchs',     label: 'Matchs'      },
  { id: 'carte',      label: 'Carte'       },
  { id: 'classement', label: 'Classement'  },
]

function CartePage() {
  return <div className="placeholder-page">Carte — à venir</div>
}

function ClassementPage() {
  return <div className="placeholder-page">Classement — à venir</div>
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('equipage')

  return (
    <div className="app">
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
  )
}
