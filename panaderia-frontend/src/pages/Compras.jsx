import { useState, useEffect } from 'react'
import { Plus, Trash2, Package, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { comprasApi, insumosApi } from '../lib/api.js'
import { fmt, fmtFechaHora } from '../lib/utils.js'

const EMPTY = { tipo: 'insumo', insumo: '', cantidad: '', costoTotal: '', concepto: '', proveedor: '', notas: '' }

export default function Compras() {
  const [compras, setCompras] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [c, i] = await Promise.all([comprasApi.getAll(), insumosApi.getAll()])
      setCompras(c); setInsumos(i)
    } catch { toast.error('Error al cargar compras') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(EMPTY); setModal(true) }
  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    const costoTotal = parseFloat(form.costoTotal)
    if (isNaN(costoTotal) || costoTotal < 0) return toast.error('Monto inválido')

    if (form.tipo === 'insumo') {
      if (!form.insumo) return toast.error('Seleccioná un insumo')
      const cantidad = parseFloat(form.cantidad)
      if (isNaN(cantidad) || cantidad <= 0) return toast.error('Cantidad inválida')
    } else if (!form.concepto.trim()) {
      return toast.error('Indicá el concepto del gasto')
    }

    setSaving(true)
    try {
      await comprasApi.create({
        tipo: form.tipo,
        insumo: form.tipo === 'insumo' ? form.insumo : undefined,
        cantidad: form.tipo === 'insumo' ? parseFloat(form.cantidad) : undefined,
        concepto: form.tipo === 'gasto' ? form.concepto : undefined,
        costoTotal, proveedor: form.proveedor, notas: form.notas,
      })
      toast.success('Compra registrada')
      setModal(false)
      load()
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar esta compra? Si era un insumo, se descontará del stock.')) return
    try { await comprasApi.remove(id); toast.success('Compra borrada'); load() }
    catch { toast.error('Error al borrar') }
  }

  const totalGastado = compras.reduce((s, c) => s + c.costoTotal, 0)

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Total compras</div><div className="stat-val">{compras.length}</div></div>
        <div className="stat-card"><div className="stat-label">Gastado</div><div className="stat-val">{fmt(totalGastado)}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nueva compra</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Proveedor</th>
                <th style={{ textAlign: 'right' }}>Monto</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty"><span className="spinner" /></td></tr>
              ) : compras.length === 0 ? (
                <tr><td colSpan={6} className="empty">Sin compras registradas.</td></tr>
              ) : compras.map(c => (
                <tr key={c._id}>
                  <td style={{ color: 'var(--muted)' }}>{fmtFechaHora(c.fecha)}</td>
                  <td>
                    {c.tipo === 'insumo'
                      ? <span className="badge badge-cat"><Package size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Insumo</span>
                      : <span className="badge badge-amber"><Receipt size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Gasto</span>}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {c.tipo === 'insumo' ? `${c.insumoNombre} — ${c.cantidad}` : c.concepto}
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{c.proveedor || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmt(c.costoTotal)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm danger" onClick={() => remove(c._id)}><Trash2 size={12} /></button>
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
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nueva compra</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="form-row">
              <label className="form-label">Tipo de compra</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn" style={form.tipo === 'insumo' ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' } : {}}
                  onClick={() => setForm(f => ({ ...EMPTY, tipo: 'insumo', proveedor: f.proveedor }))}
                ><Package size={13} /> Insumo (con stock)</button>
                <button
                  className="btn" style={form.tipo === 'gasto' ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' } : {}}
                  onClick={() => setForm(f => ({ ...EMPTY, tipo: 'gasto', proveedor: f.proveedor }))}
                ><Receipt size={13} /> Gasto simple</button>
              </div>
            </div>

            {form.tipo === 'insumo' ? (
              <>
                <div className="form-row">
                  <label className="form-label">Insumo *</label>
                  <select className="input" value={form.insumo} onChange={field('insumo')}>
                    <option value="">— Seleccionar —</option>
                    {insumos.map(i => <option key={i._id} value={i._id}>{i.nombre} ({i.unidad})</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Cantidad comprada *</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.cantidad} onChange={field('cantidad')} placeholder="0" />
                </div>
              </>
            ) : (
              <div className="form-row">
                <label className="form-label">Concepto *</label>
                <input className="input" value={form.concepto} onChange={field('concepto')} placeholder="Ej: Bolsas, gas, alquiler de puesto" />
              </div>
            )}

            <div className="form-row">
              <label className="form-label">Monto total pagado *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.costoTotal} onChange={field('costoTotal')} placeholder="0.00" />
            </div>
            <div className="form-row">
              <label className="form-label">Proveedor</label>
              <input className="input" value={form.proveedor} onChange={field('proveedor')} placeholder="Opcional" />
            </div>
            <div className="form-row">
              <label className="form-label">Notas</label>
              <textarea className="input" value={form.notas} onChange={field('notas')} placeholder="Opcional" />
            </div>

            <div className="form-actions">
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn solid" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
