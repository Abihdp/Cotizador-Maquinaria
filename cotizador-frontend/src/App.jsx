import { useState } from 'react'
import { Dumbbell, Settings } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import Articulos from './pages/Articulos.jsx'
import Maquinas from './pages/Maquinas.jsx'
import ModalConfig from './components/ModalConfig.jsx'

export default function App() {
  const [tab, setTab]       = useState('articulos')
  const [config, setConfig] = useState(false)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <Dumbbell size={18} />
          Cotizador de máquinas
        </div>
        <nav className="nav">
          <button className={`nav-btn${tab === 'articulos' ? ' active' : ''}`} onClick={() => setTab('articulos')}>
            Artículos
          </button>
          <button className={`nav-btn${tab === 'maquinas' ? ' active' : ''}`} onClick={() => setTab('maquinas')}>
            Máquinas
          </button>
        </nav>
        <button
          className="btn"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setConfig(true)}
          title="Configuración de tarifas"
        >
          <Settings size={14} /> Tarifas
        </button>
      </header>

      <main>
        {tab === 'articulos' && <Articulos />}
        {tab === 'maquinas'  && <Maquinas />}
      </main>

      {config && <ModalConfig onClose={() => setConfig(false)} />}
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }} />
    </div>
  )
}
