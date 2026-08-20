import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { insumosApi } from '../lib/api.js'
import { fmt } from '../lib/utils.js'

const EMPTY = { nombre: '', unidad: 'kg', stock: '', stockMinimo: '', costoUnitario: '', notas: '' }
const UNIDADES = ['kg', 'g', 'lt', 'ml', 'unidad', 'docena']

export default function Insumos() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { setInsumos(await insumosApi.getAll()) }
    catch { toast.error('Error al cargar insumos') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtrados = insumos.filter(i => !q || i.nombre.toLowerCase().includes(q.toLowerCase()))

  const openNew  = () => { setEditId(null); setForm(EMPTY); setModal(true) }
  const openEdit = (i) => {
    setEditId(i._id)
    setForm({ nombre: i.nombre, unidad: i.unidad, stock: i.stock, stockMinimo: i.stockMinimo, costoUnitario: i.costoUnitario, notas: i.notas })
    setModal(true)
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const data = {
        ...form,
        stock: parseFloat(form.stock) || 0,
        stockMinimo: parseFloat(form.stockMinimo) || 0,
        costoUnitario: parseFloat(form.costoUnitario) || 0,
      }
      if (editId) await insumosApi.update(editId, data)
      else        await insumosApi.create(data)
      toast.success(editId ? 'Insumo actualizado' : 'Insumo creado')
      setModal(false)
      load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar este insumo?')) return
    try { await insumosApi.remove(id); toast.success('Insumo borrado'); load() }
    catch { toast.error('Error al borrar') }
  }

  const bajoStock = insumos.filter(i => i.stock <= i.stockMinimo && i.stockMinimo > 0).length

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Total insumos</div><div className="stat-val">{insumos.length}</div></div>
        <div className="stat-card"><div className="stat-label">Stock bajo</div><div className={`stat-val${bajoStock > 0 ? ' red' : ''}`}>{bajoStock}</div></div>
        <div className="stat-card"><div className="stat-label">Valor de stock</div><div className="stat-val">{fmt(insumos.reduce((s, i) => s + i.stock * i.costoUnitario, 0))}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nuevo insumo</button>
        <div className="input search" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' }}
            placeholder="Buscar insumo..." value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Costo unitario</th>
                <th></th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty"><span className="spinner" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="empty">Sin resultados.</td></tr>
              ) : filtrados.map(i => {
                const stockBajo = i.stockMinimo > 0 && i.stock <= i.stockMinimo
                return (
                  <tr key={i._id}>
                    <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                    <td style={{ color: 'var(--muted)' }}>{i.unidad}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{i.stock}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(i.costoUnitario)}</td>
                    <td>{stockBajo && <span className="badge badge-red"><AlertTriangle size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Stock bajo</span>}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn sm" onClick={() => openEdit(i)}><Pencil size={12} /> Editar</button>
                        <button className="btn sm danger" onClick={() => remove(i._id)}><Trash2 size={12} /></button>
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
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar insumo' : 'Nuevo insumo'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-row">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Harina 0000" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Unidad</label>
                <select className="input" value={form.unidad} onChange={field('unidad')}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Stock actual</label>
                <input className="input" type="number" min="0" step="0.01" value={form.stock} onChange={field('stock')} placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Stock mínimo</label>
                <input className="input" type="number" min="0" step="0.01" value={form.stockMinimo} onChange={field('stockMinimo')} placeholder="0" />
              </div>
              <div className="form-row">
                <label className="form-label">Costo unitario</label>
                <input className="input" type="number" min="0" step="0.01" value={form.costoUnitario} onChange={field('costoUnitario')} placeholder="0.00" />
              </div>
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
