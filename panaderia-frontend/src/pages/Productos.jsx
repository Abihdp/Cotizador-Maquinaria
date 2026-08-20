import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { productosApi, insumosApi } from '../lib/api.js'
import { fmt } from '../lib/utils.js'

const EMPTY = { nombre: '', categoria: '', precioVenta: '', unidad: 'unidad', receta: [], costoManual: '', notas: '' }
const UNIDADES = ['unidad', 'docena', 'kg', 'porción']

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [insumos, setInsumos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)
  const [addInsumo, setAddInsumo] = useState('')
  const [addCant, setAddCant]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [p, i] = await Promise.all([productosApi.getAll(), insumosApi.getAll()])
      setProductos(p); setInsumos(i)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtrados = productos.filter(p => !q || p.nombre.toLowerCase().includes(q.toLowerCase()))

  const openNew  = () => { setEditId(null); setForm(EMPTY); setModal(true) }
  const openEdit = (p) => {
    setEditId(p._id)
    setForm({
      nombre: p.nombre, categoria: p.categoria, precioVenta: p.precioVenta, unidad: p.unidad,
      receta: (p.receta || []).map(r => ({ insumo: r.insumo?._id || r.insumo, nombre: r.insumo?.nombre, cantidad: r.cantidad })),
      costoManual: p.costoManual, notas: p.notas,
    })
    setModal(true)
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const agregarInsumo = () => {
    if (!addInsumo) return toast.error('Seleccioná un insumo')
    const cant = parseFloat(addCant)
    if (isNaN(cant) || cant <= 0) return toast.error('Cantidad inválida')
    const insumo = insumos.find(i => i._id === addInsumo)
    setForm(f => ({ ...f, receta: [...f.receta, { insumo: insumo._id, nombre: insumo.nombre, unidad: insumo.unidad, cantidad: cant }] }))
    setAddInsumo(''); setAddCant('')
  }

  const quitarInsumo = (idx) => setForm(f => ({ ...f, receta: f.receta.filter((_, i) => i !== idx) }))

  const costoRecetaPreview = form.receta.reduce((s, r) => {
    const insumo = insumos.find(i => i._id === r.insumo)
    return s + (insumo?.costoUnitario || 0) * r.cantidad
  }, 0)

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    const precioVenta = parseFloat(form.precioVenta)
    if (isNaN(precioVenta) || precioVenta < 0) return toast.error('Precio inválido')
    setSaving(true)
    try {
      const data = {
        nombre: form.nombre, categoria: form.categoria, unidad: form.unidad, notas: form.notas,
        precioVenta,
        costoManual: parseFloat(form.costoManual) || 0,
        receta: form.receta.map(r => ({ insumo: r.insumo, cantidad: r.cantidad })),
      }
      if (editId) await productosApi.update(editId, data)
      else        await productosApi.create(data)
      toast.success(editId ? 'Producto actualizado' : 'Producto creado')
      setModal(false)
      load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar este producto?')) return
    try { await productosApi.remove(id); toast.success('Producto borrado'); load() }
    catch { toast.error('Error al borrar') }
  }

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Total productos</div><div className="stat-val">{productos.length}</div></div>
        <div className="stat-card"><div className="stat-label">Categorías</div><div className="stat-val">{new Set(productos.map(p => p.categoria).filter(Boolean)).size}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nuevo producto</button>
        <div className="input search" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' }}
            placeholder="Buscar producto..." value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Precio venta</th>
                <th style={{ textAlign: 'right' }}>Costo estimado</th>
                <th style={{ textAlign: 'right' }}>Margen</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty"><span className="spinner" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="empty">Sin resultados.</td></tr>
              ) : filtrados.map(p => {
                const margen = p.precioVenta - p.costoEstimado
                return (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td>{p.categoria ? <span className="badge badge-cat">{p.categoria}</span> : '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmt(p.precioVenta)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{fmt(p.costoEstimado)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: margen >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(margen)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn sm" onClick={() => openEdit(p)}><Pencil size={12} /> Editar</button>
                        <button className="btn sm danger" onClick={() => remove(p._id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar producto' : 'Nuevo producto'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="form-row">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Medialuna de manteca" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Categoría</label>
                <input className="input" value={form.categoria} onChange={field('categoria')} placeholder="Ej: Pan dulce" />
              </div>
              <div className="form-row">
                <label className="form-label">Precio de venta *</label>
                <input className="input" type="number" min="0" step="0.01" value={form.precioVenta} onChange={field('precioVenta')} placeholder="0.00" />
              </div>
              <div className="form-row">
                <label className="form-label">Unidad</label>
                <select className="input" value={form.unidad} onChange={field('unidad')}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="section-label">Receta (insumos que usa)</div>
            <div className="comp-add">
              <select className="input" value={addInsumo} onChange={e => setAddInsumo(e.target.value)}>
                <option value="">— Seleccionar insumo —</option>
                {insumos.map(i => <option key={i._id} value={i._id}>{i.nombre} ({i.unidad})</option>)}
              </select>
              <input className="input" type="number" min="0" step="0.001" value={addCant} onChange={e => setAddCant(e.target.value)} placeholder="Cant." />
              <button className="btn sm" onClick={agregarInsumo}><Plus size={12} /></button>
            </div>

            {form.receta.length > 0 && (
              <div className="comp-list">
                {form.receta.map((r, idx) => {
                  const insumo = insumos.find(i => i._id === r.insumo)
                  return (
                    <div className="comp-row" key={idx}>
                      <span className="comp-name">{r.nombre || insumo?.nombre}</span>
                      <span className="comp-qty">{r.cantidad} {insumo?.unidad}</span>
                      <span className="comp-price">{fmt(insumo?.costoUnitario || 0)}</span>
                      <span className="comp-sub">{fmt((insumo?.costoUnitario || 0) * r.cantidad)}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => quitarInsumo(idx)}>
                        <X size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {form.receta.length === 0 && (
              <div className="form-row">
                <label className="form-label">Costo estimado manual (si no tiene receta)</label>
                <input className="input" type="number" min="0" step="0.01" value={form.costoManual} onChange={field('costoManual')} placeholder="0.00" />
              </div>
            )}

            <div className="cost-bar">
              <div className="cost-item">
                <span className="cost-label">Costo estimado</span>
                <span className="cost-val">{fmt(form.receta.length ? costoRecetaPreview : (parseFloat(form.costoManual) || 0))}</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">Margen</span>
                <span className="cost-val green">
                  {fmt((parseFloat(form.precioVenta) || 0) - (form.receta.length ? costoRecetaPreview : (parseFloat(form.costoManual) || 0)))}
                </span>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 14 }}>
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
