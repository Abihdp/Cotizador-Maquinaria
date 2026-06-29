import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { maquinasApi } from '../lib/api.js'
import { fmt, calcCostoTotal, calcVenta } from '../lib/utils.js'

export default function ModalRecotizacion({ onClose }) {
  const [maquinas, setMaquinas] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    maquinasApi.getAll('').then(d => {
      setMaquinas(Array.isArray(d) ? d : [])
    }).finally(() => setLoading(false))
  }, [])

  const rows = maquinas.map(m => {
    const costoActual = calcCostoTotal(m).total
    const ventaActual = calcVenta(costoActual, m.margen)
    return { m, costoActual, ventaActual }
  }).sort((a, b) => b.costoActual - a.costoActual)

  const totalMateriales = maquinas.reduce((s, m) => s + calcCostoTotal(m).materiales, 0)

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <span className="modal-title">Recotización — precios actuales</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Costo y precio de venta de todas las máquinas calculados con los precios vigentes de artículos.
        </p>

        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div> : (
          <>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                    {['Máquina', 'Categoría', 'Materiales', 'M. de obra', 'Costo total', 'Margen', 'Precio venta'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: i > 1 ? 'right' : 'left', fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ m, costoActual, ventaActual }, i) => {
                    const c = calcCostoTotal(m)
                    return (
                      <tr key={m._id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.nombre}</td>
                        <td style={{ padding: '8px 12px' }}>{m.categoria ? <span className="badge badge-cat">{m.categoria}</span> : '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(c.materiales)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(c.manoObra)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(costoActual)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.margen}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>{fmt(ventaActual)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
              <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>TOTAL MATERIALES (todas las máquinas)</div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>{fmt(totalMateriales)}</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>MÁQUINAS</div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>{maquinas.length}</div>
              </div>
            </div>
          </>
        )}

        <div className="form-actions">
          <button className="btn solid" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
