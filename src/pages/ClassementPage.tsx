import React, { useEffect, useRef, useState } from 'react'
import TabBar from '../components/TabBar'
import ModaleCreerLigue from '../components/ModaleCreerLigue'
import type { AppPage } from '../App'
import { useEquipageStore } from '../stores/equipageStore'
import { useLigueStore } from '../stores/ligueStore'
import { useAuthStore } from '../stores/authStore'
import type { LiguePrive } from '../lib/supabase'
import type { MembreScore } from '../lib/supabase-classement'

interface ClassementPageProps {
  onNavigate: (page: AppPage) => void
  userId?: string
}

const DEMO_USER_ID = 'demo-user'

export default function ClassementPage({ onNavigate, userId = DEMO_USER_ID }: ClassementPageProps) {
  const journee = useEquipageStore(s => s.journee)
  const pseudo  = useAuthStore(s => s.pseudo) ?? 'Capitaine'

  const pageState    = useLigueStore(s => s.pageState)
  const ligue        = useLigueStore(s => s.ligue)
  const membres      = useLigueStore(s => s.membres)
  const fetchClassement = useLigueStore(s => s.fetchClassement)
  const storeJoin    = useLigueStore(s => s.joinLigue)
  const setWithLigue = useLigueStore(s => s.setWithLigue)

  const [formError, setFormError]   = useState<string | null>(null)
  const [joining,   setJoining]     = useState(false)
  const [copied,    setCopied]      = useState<'code' | 'link' | null>(null)
  const [showCreer, setShowCreer]   = useState(false)

  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchClassement(userId)
  }, [userId])

  async function handleJoin() {
    const code = codeRef.current?.value.trim() ?? ''
    if (!code) { setFormError('Entre un code de ligue.'); return }
    setJoining(true); setFormError(null)
    const { error } = await storeJoin(code, userId)
    setJoining(false)
    if (error) { setFormError(error) }
  }

  function handleCopy(type: 'code' | 'link') {
    if (!ligue) return
    const text = type === 'code'
      ? ligue.code_invitation
      : `${window.location.origin}${window.location.pathname}?ligue=${ligue.code_invitation}`
    void navigator.clipboard.writeText(text).catch(() => null)
    setCopied(type)
    setTimeout(() => setCopied(null), 1800)
  }

  function handleCreated(newLigue: LiguePrive, newMembres: MembreScore[]) {
    setWithLigue(newLigue, newMembres)
    setShowCreer(false)
  }

  const numJournee = journee?.numero ?? '—'
  const myRank     = membres.findIndex(m => m.utilisateurId === userId) + 1
  const myScore    = membres.find(m => m.utilisateurId === userId)?.nmTotal ?? 0
  const leader     = membres[0]

  return (
    <div className="cl-screen">

      <header className="cl-hd">
        <span className="cl-hd-logo">Navigoal</span>
        <span className="cl-hd-user">{pseudo}</span>
      </header>

      <div className="cl-scr">

        <div className="cl-pg-label">Journée {numJournee}</div>
        <h1 className="cl-pg-h1">Classement</h1>

        {pageState === 'loading' && (
          <p className="cl-hint">Chargement…</p>
        )}

        {pageState === 'no-ligue' && (
          <>
            <p className="cl-hint">
              Crée ou rejoins une ligue<br/>
              pour naviguer en course avec tes amis.
            </p>

            {formError && <p className="cl-error">{formError}</p>}

            <div>
              <span className="cl-form-label">Créer une ligue</span>
              <div className="cl-form-row">
                <button
                  type="button"
                  className="cl-form-btn"
                  style={{ flex: 1 }}
                  onClick={() => setShowCreer(true)}
                >
                  Créer
                </button>
              </div>
            </div>

            <div className="cl-or"><span className="cl-or-txt">ou</span></div>

            <div>
              <span className="cl-form-label">Rejoindre</span>
              <div className="cl-form-row">
                <input
                  ref={codeRef}
                  className="cl-form-inp cl-form-inp--code"
                  type="text"
                  placeholder="CODE"
                  maxLength={8}
                  onKeyDown={e => e.key === 'Enter' && void handleJoin()}
                />
                <button
                  type="button"
                  className="cl-form-btn"
                  disabled={joining}
                  onClick={() => void handleJoin()}
                >
                  {joining ? '…' : 'Join'}
                </button>
              </div>
            </div>
          </>
        )}

        {pageState === 'with-ligue' && ligue && (
          <>
            <div className="cl-ligue-label">{ligue.nom}</div>

            <div className="cl-rank-card">
              <div className="cl-rank-pos">
                <span className="cl-rank-n">{myRank || 1}</span>
                <span className="cl-rank-sub">sur {membres.length}</span>
              </div>
              <div className="cl-rank-right">
                <span className="cl-rank-nm">{myScore}</span>
                <span className="cl-rank-unit">milles nautiques</span>
                {myRank > 1 && leader && (
                  <span className="cl-rank-gap">−{leader.nmTotal - myScore}nm du leader</span>
                )}
              </div>
            </div>

            <div className="cl-lb">
              {membres.map((m, i) => {
                const rank  = i + 1
                const isMe  = m.utilisateurId === userId
                const ecart = i > 0 ? m.nmTotal - membres[0].nmTotal : null
                return (
                  <div key={m.utilisateurId} className={`cl-lb-row${isMe ? ' cl-lb-row--me' : ''}`}>
                    <span className={`cl-lb-rng${rank === 1 ? ' cl-lb-rng--1' : ''}`}>{rank}</span>
                    <div className="cl-lb-info">
                      <span className="cl-lb-name">{m.pseudo}</span>
                      {ecart !== null && (
                        <span className="cl-lb-delta">{ecart}nm</span>
                      )}
                    </div>
                    <span className="cl-lb-nm">{m.nmTotal}NM</span>
                  </div>
                )
              })}
            </div>

            <div className="cl-share">
              <div className="cl-share-row">
                <span className="cl-share-lbl">Code</span>
                <span className="cl-share-val">{ligue.code_invitation}</span>
                <button type="button" className="cl-share-btn" onClick={() => handleCopy('code')}>
                  {copied === 'code' ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
              <div className="cl-share-row">
                <span className="cl-share-lbl">Lien</span>
                <span className="cl-share-link">
                  {window.location.origin}{window.location.pathname}?ligue={ligue.code_invitation}
                </span>
                <button type="button" className="cl-share-btn" onClick={() => handleCopy('link')}>
                  {copied === 'link' ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <TabBar active="classement" onNavigate={onNavigate}/>

      {showCreer && (
        <ModaleCreerLigue
          userId={userId}
          onClose={() => setShowCreer(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
