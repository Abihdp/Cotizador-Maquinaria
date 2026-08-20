import { useState, useEffect } from 'react'
import { Plus, Trash2, X, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { ventasApi, productosApi, feriasApi } from '../lib/api.js'
import { fmt, fmtFechaHora, calcCostoProducto } from '../lib/utils.js'

export default function Ventas() {
  const [ventas, setVentas]       = useState([])
  const [productos, setProductos] = useState([])
  const [ferias, setFerias]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)

  const [feriaId, setFeriaId]     = useState('')
  const [items, setItems]         = useState([])
  const [addProd, setAddProd]     = useState('')
  const [addCant, setAddCant]     = useState('1')
  const [notas, setNotas]         = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [v, p, f] = await Promise.all([ventasApi.getAll(), productosApi.getAll(), feriasApi.getAll()])
      setVentas(v); setProductos(p); setFerias(f)
    } catch { toast.error('Error al cargar ventas') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const openNew = () => {
    setFeriaId(''); setItems([]); setAddProd(''); setAddCant('1'); setNotas('')
    setModal(true)
  }

  const agregarItem = () => {
    if (!addProd) return toast.error('Seleccioná un producto')
    const cant = parseFloat(addCant)
    if (isNaN(cant) || cant <= 0) return toast.error('Cantidad inválida')
    const producto = productos.find(p => p._id === addProd)
    setItems(it => [...it, { producto: producto._id, nombre: producto.nombre, cantidad: cant, precioUnitario: producto.precioVenta, costoUnitario: calcCostoProducto(producto) }])
    setAddProd(''); setAddCant('1')
  }

  const quitarItem = (idx) => setItems(it => it.filter((_, i) => i !== idx))

  const total      = items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const costoTotal = items.reduce((s, i) => s + i.costoUnitario * i.cantidad, 0)
  const ganancia   = total - costoTotal

  const save = async () => {
    if (items.length === 0) return toast.error('Agregá al menos un producto')
    setSaving(true)
    try {
      await ventasApi.create({
        feria: feriaId || null,
        items: items.map(i => ({ producto: i.producto, cantidad: i.cantidad })),
        notas,
      })
      toast.success('Venta registrada')
      setModal(false)
      load()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar esta venta? Se repondrá el stock de insumos usados.')) return
    try { await ventasApi.remove(id); toast.success('Venta borrada'); load() }
    catch { toast.error('Error al borrar') }
  }

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalGanancia = ventas.reduce((s, v) => s + v.ganancia, 0)

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Ventas registradas</div><div className="stat-val">{ventas.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total vendido</div><div className="stat-val">{fmt(totalVentas)}</div></div>
        <div className="stat-card"><div className="stat-label">Ganancia</div><div className="stat-val green">{fmt(totalGanancia)}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nueva venta</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Feria</th><th>Productos</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Ganancia</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty"><span className="spinner" /></td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={6} className="empty">Sin ventas registradas.</td></tr>
              ) : ventas.map(v => (
                <tr key={v._id}>
                  <td style={{ color: 'var(--muted)' }}>{fmtFechaHora(v.fecha)}</td>
                  <td>{v.feria ? <span className="badge badge-cat">{v.feria.nombre}</span> : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{v.items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmt(v.total)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: v.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(v.ganancia)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm danger" onClick={() => remove(v._id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title"><ShoppingBag size={15} style={{ marginRight: 6, verticalAlign: -2 }} />Nueva venta</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="form-row">
              <label className="form-label">Feria (opcional)</label>
              <select className="input" value={feriaId} onChange={e => setFeriaId(e.target.value)}>
                <option value="">— Sin feria —</option>
                {ferias.map(f => <option key={f._id} value={f._id}>{f.nombre}</option>)}
              </select>
            </div>

            <div className="section-label">Productos vendidos</div>
            <div className="comp-add">
              <select className="input" value={addProd} onChange={e => setAddProd(e.target.value)}>
                <option value="">— Seleccionar producto —</option>
                {productos.map(p => <option key={p._id} value={p._id}>{p.nombre} — {fmt(p.precioVenta)}</option>)}
              </select>
              <input className="input" type="number" min="1" step="1" value={addCant} onChange={e => setAddCant(e.target.value)} placeholder="Cant." />
              <button className="btn sm" onClick={agregarItem}><Plus size={12} /></button>
            </div>

            {items.length > 0 && (
              <div className="comp-list">
                {items.map((i, idx) => (
                  <div className="comp-row" key={idx}>
                    <span className="comp-name">{i.nombre}</span>
                    <span className="comp-qty">×{i.cantidad}</span>
                    <span className="comp-price">{fmt(i.precioUnitario)}</span>
                    <span className="comp-sub">{fmt(i.precioUnitario * i.cantidad)}</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => quitarItem(idx)}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="cost-bar">
              <div className="cost-item"><span className="cost-label">Total</span><span className="cost-val">{fmt(total)}</span></div>
              <div className="cost-item"><span className="cost-label">Costo</span><span className="cost-val">{fmt(costoTotal)}</span></div>
              <div className="cost-item"><span className="cost-label">Ganancia</span><span className="cost-val green">{fmt(ganancia)}</span></div>
            </div>

            <div className="form-row" style={{ marginTop: 14 }}>
              <label className="form-label">Notas</label>
              <textarea className="input" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" />
            </div>

            <div className="form-actions">
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn solid" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Registrar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
