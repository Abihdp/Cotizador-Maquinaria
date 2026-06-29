import { useState, useEffect } from 'react'
import { Plus, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { maquinasApi } from '../lib/api.js'
import { fmt } from '../lib/utils.js'

export default function ModalListaMateriales({ onClose }) {
  const [maquinas,  setMaquinas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [pedido,    setPedido]    = useState([])   // [{ maquina, cantidad }]
  const [selId,     setSelId]     = useState('')
  const [selQty,    setSelQty]    = useState(1)

  useEffect(() => {
    maquinasApi.getAll('').then(d => setMaquinas(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])

  const agregar = () => {
    if (!selId) return
    const maq = maquinas.find(m => m._id === selId)
    if (!maq) return
    setPedido(prev => {
      const idx = prev.findIndex(p => p.maquina._id === selId)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], cantidad: next[idx].cantidad + Number(selQty) }; return next }
      return [...prev, { maquina: maq, cantidad: Number(selQty) }]
    })
    setSelId(''); setSelQty(1)
  }

  const quitar = (id) => setPedido(prev => prev.filter(p => p.maquina._id !== id))

  // Consolidar materiales de todas las máquinas × cantidad pedida
  const consolidado = (() => {
    const mapa = {}
    for (const { maquina, cantidad } of pedido) {
      for (const comp of (maquina.componentes || [])) {
        const art = comp.articulo
        if (!art) continue
        const key = art._id
        if (!mapa[key]) mapa[key] = { nombre: art.nombre, codigo: art.codigo || '', categoria: art.categoria || '', unidad: art.unidad || '', precio: art.precio || 0, cantidadTotal: 0 }
        mapa[key].cantidadTotal += comp.cantidad * cantidad
      }
    }
    return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre))
  })()

  const totalCompra = consolidado.reduce((s, r) => s + r.precio * r.cantidadTotal, 0)

  const exportar = () => {
    const data = [
      ['Código', 'Nombre', 'Categoría', 'Unidad', 'Cantidad Total', 'Precio Unit.', 'Subtotal'],
      ...consolidado.map(r => [r.codigo, r.nombre, r.categoria, r.unidad, r.cantidadTotal, r.precio, r.precio * r.cantidadTotal])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de materiales')
    XLSX.writeFile(wb, 'lista_materiales.xlsx')
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <span className="modal-title">Lista de materiales consolidada</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Seleccioná las máquinas del pedido y la cantidad de cada una. Se consolidan todos los materiales necesarios.
        </p>

        {/* Selector de máquinas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <select className="input" style={{ flex: 1 }} value={selId} onChange={e => setSelId(e.target.value)} disabled={loading}>
            <option value="">— Seleccionar máquina —</option>
            {maquinas.map(m => <option key={m._id} value={m._id}>{m.nombre}{m.categoria ? ` (${m.categoria})` : ''}</option>)}
          </select>
          <input className="input" type="number" min="1" step="1" value={selQty} onChange={e => setSelQty(e.target.value)}
            style={{ width: 70, textAlign: 'right', fontFamily: 'var(--mono)' }} />
          <button className="btn solid" onClick={agregar} disabled={!selId}><Plus size={13}/> Agregar</button>
        </div>

        {/* Pedido actual */}
        {pedido.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {pedido.map(p => (
              <span key={p.maquina._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--blue-bg,#eef4fd)', color: 'var(--blue,#1b4f8a)', borderRadius: 99, fontSize: 12, fontWeight: 500 }}>
                {p.maquina.nombre} × {p.cantidad}
                <button onClick={() => quitar(p.maquina._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={11}/></button>
              </span>
            ))}
          </div>
        )}

        {/* Tabla consolidada */}
        {consolidado.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Materiales necesarios ({consolidado.length} ítems)
              </div>
              <button className="btn sm" onClick={exportar}><Download size={12}/> Exportar Excel</button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: 340, overflowY: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                    {['Código', 'Nombre', 'Categoría', 'Cantidad', 'Unidad', 'Precio unit.', 'Subtotal'].map((h, i) => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consolidado.map((r, i) => (
                    <tr key={r.nombre} style={{ borderBottom: i < consolidado.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r.codigo || '—'}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 500 }}>{r.nombre}</td>
                      <td style={{ padding: '7px 10px' }}>{r.categoria ? <span className="badge badge-cat">{r.categoria}</span> : '—'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.cantidadTotal}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--muted)' }}>{r.unidad}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(r.precio)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{fmt(r.precio * r.cantidadTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: 600 }}>Total estimado de compra</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{fmt(totalCompra)}</span>
            </div>
          </>
        ) : pedido.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>Agregá al menos una máquina para ver los materiales necesarios.</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>Las máquinas seleccionadas no tienen artículos cargados.</div>
        )}

        <div className="form-actions">
          <button className="btn solid" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
