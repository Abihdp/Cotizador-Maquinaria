import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { feriasApi } from '../lib/api.js'
import { fmtFecha } from '../lib/utils.js'

const EMPTY = { nombre: '', lugar: '', fecha: '', notas: '' }

export default function Ferias() {
  const [ferias, setFerias]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { setFerias(await feriasApi.getAll()) }
    catch { toast.error('Error al cargar ferias') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const openNew  = () => { setEditId(null); setForm({ ...EMPTY, fecha: new Date().toISOString().slice(0, 10) }); setModal(true) }
  const openEdit = (f) => {
    setEditId(f._id)
    setForm({ nombre: f.nombre, lugar: f.lugar, fecha: f.fecha?.slice(0, 10) || '', notas: f.notas })
    setModal(true)
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.fecha) return toast.error('La fecha es obligatoria')
    setSaving(true)
    try {
      if (editId) await feriasApi.update(editId, form)
      else        await feriasApi.create(form)
      toast.success(editId ? 'Feria actualizada' : 'Feria creada')
      setModal(false)
      load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar esta feria?')) return
    try { await feriasApi.remove(id); toast.success('Feria borrada'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Error al borrar') }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nueva feria</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Nombre</th><th>Lugar</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="empty"><span className="spinner" /></td></tr>
              ) : ferias.length === 0 ? (
                <tr><td colSpan={4} className="empty">Sin ferias registradas.</td></tr>
              ) : ferias.map(f => (
                <tr key={f._id}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{fmtFecha(f.fecha)}</td>
                  <td style={{ fontWeight: 500 }}>{f.nombre}</td>
                  <td style={{ color: 'var(--muted)' }}>{f.lugar ? <><MapPin size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{f.lugar}</> : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm" onClick={() => openEdit(f)}><Pencil size={12} /> Editar</button>
                      <button className="btn sm danger" onClick={() => remove(f._id)}><Trash2 size={12} /></button>
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
              <span className="modal-title">{editId ? 'Editar feria' : 'Nueva feria'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-row">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Feria de Parque Rivadavia" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.fecha} onChange={field('fecha')} />
              </div>
              <div className="form-row">
                <label className="form-label">Lugar</label>
                <input className="input" value={form.lugar} onChange={field('lugar')} placeholder="Opcional" />
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
