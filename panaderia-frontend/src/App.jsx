import { useState } from 'react'
import { Croissant, ShoppingBag, Package, Wheat, CalendarDays, BarChart3 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import Ventas from './pages/Ventas.jsx'
import Productos from './pages/Productos.jsx'
import Insumos from './pages/Insumos.jsx'
import Compras from './pages/Compras.jsx'
import Ferias from './pages/Ferias.jsx'
import Reportes from './pages/Reportes.jsx'

const TABS = [
  { key: 'ventas',    label: 'Ventas',    icon: ShoppingBag, Comp: Ventas },
  { key: 'productos', label: 'Productos', icon: Package,     Comp: Productos },
  { key: 'insumos',   label: 'Insumos',   icon: Wheat,       Comp: Insumos },
  { key: 'compras',   label: 'Compras',   icon: ShoppingBag, Comp: Compras },
  { key: 'ferias',    label: 'Ferias',    icon: CalendarDays, Comp: Ferias },
  { key: 'reportes',  label: 'Reportes',  icon: BarChart3,   Comp: Reportes },
]

export default function App() {
  const [tab, setTab] = useState('ventas')
  const Activo = TABS.find(t => t.key === tab)?.Comp

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <Croissant size={18} />
          Panadería
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.key} className={`nav-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {Activo && <Activo />}
      </main>

      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }} />
    </div>
  )
}
