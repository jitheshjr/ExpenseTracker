import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage       from './pages/AuthPage'
import Dashboard      from './pages/Dashboard'
import Analytics      from './pages/Analytics'
import History        from './pages/History'
import Budget         from './pages/Budget'
import AIAssistant    from './pages/AIAssistant'
import AddTransaction from './pages/AddTransaction'
import './styles/index.css'
import './styles/theme.css'
import './App.css'

const NAV = [
  { id: 'dashboard', label: 'Home',      icon: 'ti-home'      },
  { id: 'analytics', label: 'Analytics', icon: 'ti-chart-bar' },
  { id: 'history',   label: 'History',   icon: 'ti-list'      },
  { id: 'budget',    label: 'Budget',    icon: 'ti-target'    },
  { id: 'ai',        label: 'Insights',  icon: 'ti-bulb' },
]

export default function App() {
  const [session,    setSession]    = useState(null)
  const [authReady,  setAuthReady]  = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editTxn,    setEditTxn]    = useState(null)

  useEffect(() => {
    supabase.from('transactions').select('*').limit(3).then(({ data, error }) => {
      console.log('DB test:', data, error)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (!authReady) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loading-dot" />
    </div>
  )

  if (!session) return <AuthPage />

  const openAdd  = ()    => { setEditTxn(null); setShowAdd(true) }
  const openEdit = (txn) => { setEditTxn(txn);  setShowAdd(true) }
  const closeAdd = ()    => { setShowAdd(false); setEditTxn(null) }

  const pageProps = { setShowAdd: openAdd, onEdit: openEdit }

  return (
    <div className="app-shell">
      <div className="page-area">
        {activePage === 'dashboard' && <Dashboard  {...pageProps} />}
        {activePage === 'analytics' && <Analytics  />}
        {activePage === 'history'   && <History    {...pageProps} />}
        {activePage === 'budget'    && <Budget     />}
        {activePage === 'ai'        && <AIAssistant />}
      </div>

      {showAdd && (
        <div className="add-overlay">
          <AddTransaction onClose={closeAdd} editTxn={editTxn} />
        </div>
      )}

      <nav className="bottom-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activePage === item.id ? 'active' : ''}`}
            onClick={() => { setActivePage(item.id); setShowAdd(false) }}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}