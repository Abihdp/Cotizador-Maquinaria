import { useState, useEffect, useRef } from 'react'
import { Plus, Upload, Download, Pencil, Trash2, Search, ChevronDown, History, ChevronRight, AlertTriangle, CheckCircle2, RefreshCw, X, AlertOctagon } from 'lucide-react'
import toast from 'react-hot-toast'
import { articulosApi } from '../lib/api.js'
import { fmt, resizeImageToDataUrl } from '../lib/utils.js'

const EMPTY = { codigo: '', nombre: '', categoria: '', precio: '', unidad: 'unidad', notas: '', imagen: '' }
const CATEGORIAS_ART = ['Repuestos', 'Estructuras', 'Tapizados', 'Pintura']
const UNIDADES = ['mt', 'kg', 'unidad', 'm2', 'cm','lt','ml']
const POR_PAGINA = 12

const CAMPO_LABEL = { codigo: 'Código', nombre: 'Nombre', categoria: 'Categoría', precio: 'Precio', unidad: 'Unidad', notas: 'Notas' }

function fmtFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function Articulos() {
  const [articulos, setArticulos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [qNombre, setQNombre]       = useState('')
  const [qCodigo, setQCodigo]       = useState('')
  const [catFiltro, setCatFiltro]   = useState('')
  const [pagina, setPagina]         = useState(1)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)
  const fileRef                     = useRef()

  // Borrar todos
  const [deleteAllModal, setDeleteAllModal]     = useState(false)
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('')
  const [deletingAll, setDeletingAll]           = useState(false)

  // Importación en pasos
  const [importFile, setImportFile]     = useState(null)
  const [importMeta, setImportMeta]     = useState(null)   // { sheets: [{name,index,rowCount}] }
  const [importConfig, setImportConfig] = useState({ sheetIndex: 0, startRow: 2, endRow: '' })
  const [importStep, setImportStep]     = useState(null)   // null | 'config' | 'preview'
  const [previewData, setPreviewData]   = useState(null)
  const [previewing, setPreviewing]     = useState(false)
  const [importing, setImporting]       = useState(false)

  // Historial
  const [histModal, setHistModal]       = useState(false)
  const [historial, setHistorial]       = useState([])
  const [histLoading, setHistLoading]   = useState(false)
  const [expandedSessions, setExpandedSessions] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await articulosApi.getAll('')
      setArticulos(Array.isArray(data) ? data : [])
    } catch { toast.error('Error al cargar artículos') }
    finally { setLoading(false) }
  }

  const loadHistorial = async () => {
    setHistLoading(true)
    try {
      const data = await articulosApi.historial()
      setHistorial(Array.isArray(data) ? data : [])
    } catch { toast.error('Error al cargar historial') }
    finally { setHistLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  // Filtrado local
  const filtrados = articulos.filter(a => {
    const matchNombre = !qNombre || a.nombre.toLowerCase().includes(qNombre.toLowerCase())
    const matchCodigo = !qCodigo || (a.codigo||'').toLowerCase().includes(qCodigo.toLowerCase())
    const matchCat    = !catFiltro || a.categoria === catFiltro
    return matchNombre && matchCodigo && matchCat
  })

  const totalPags = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagActual = Math.min(pagina, totalPags)
  const visibles  = filtrados.slice((pagActual - 1) * POR_PAGINA, pagActual * POR_PAGINA)
  const resetPagina = () => setPagina(1)

  const openNew  = () => { setEditId(null); setForm(EMPTY); setModal(true) }
  const openEdit = (a) => {
    setEditId(a._id)
    setForm({ codigo: a.codigo, nombre: a.nombre, categoria: a.categoria, precio: a.precio, unidad: a.unidad, notas: a.notas, imagen: a.imagen || '' })
    setModal(true)
  }

  const handleImagen = async (e) => {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('El archivo debe ser una imagen')
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setForm(f => ({ ...f, imagen: dataUrl }))
    } catch { toast.error('No se pudo procesar la imagen') }
  }
  const removeImagen = () => setForm(f => ({ ...f, imagen: '' }))

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    const precio = parseFloat(form.precio)
    if (isNaN(precio) || precio < 0) return toast.error('Precio inválido')
    setSaving(true)
    try {
      if (editId) await articulosApi.update(editId, { ...form, precio })
      else        await articulosApi.create({ ...form, precio })
      toast.success(editId ? 'Artículo actualizado' : 'Artículo creado')
      setModal(false)
      load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar este artículo?')) return
    try { await articulosApi.remove(id); toast.success('Artículo borrado'); load() }
    catch { toast.error('Error al borrar') }
  }

  const closeDeleteAllModal = () => { setDeleteAllModal(false); setDeleteAllConfirm('') }

  const removeAll = async () => {
    if (deleteAllConfirm !== 'BORRAR') return
    setDeletingAll(true)
    try {
      const { deleted } = await articulosApi.removeAll()
      toast.success(`${deleted} artículo${deleted !== 1 ? 's' : ''} borrado${deleted !== 1 ? 's' : ''}`)
      setDeleteAllModal(false)
      setDeleteAllConfirm('')
      load()
    } catch { toast.error('Error al borrar los artículos') }
    finally { setDeletingAll(false) }
  }

  // ── Importación en pasos ──────────────────────────────────────────────
  const resetImport = () => {
    setImportFile(null); setImportMeta(null); setImportStep(null); setPreviewData(null)
    setImportConfig({ sheetIndex: 0, startRow: 2, endRow: '' })
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const t = toast.loading('Leyendo archivo...')
    try {
      const meta = await articulosApi.importMeta(file)
      toast.dismiss(t)
      setImportFile(file)
      setImportMeta(meta)
      setImportConfig({ sheetIndex: 0, startRow: 2, endRow: '' })
      setPreviewData(null)
      setImportStep('config')
    } catch {
      toast.dismiss(t)
      toast.error('Error al leer el archivo')
    }
  }

  const verPreview = async () => {
    setPreviewing(true)
    const t = toast.loading('Generando vista previa...')
    try {
      const data = await articulosApi.importPreview(importFile, importConfig)
      toast.dismiss(t)
      setPreviewData(data)
      setImportStep('preview')
    } catch {
      toast.dismiss(t)
      toast.error('Error al generar la vista previa')
    } finally { setPreviewing(false) }
  }

  const confirmarImport = async () => {
    if (!importFile) return
    setImporting(true)
    const t = toast.loading('Importando...')
    try {
      const { added, updated, errors } = await articulosApi.import(importFile, importConfig)
      toast.dismiss(t)
      toast.success(`${added} nuevos, ${updated} actualizados`)
      if (errors?.length) toast.error(errors.join('\n'), { duration: 5000 })
      resetImport()
      load()
    } catch {
      toast.dismiss(t)
      toast.error('Error al importar')
    } finally { setImporting(false) }
  }

  // ── Historial ───────────────────────────────────────────────────────────
  const openHistorial = () => { setHistModal(true); loadHistorial() }

  const deleteHistEntry = async (id) => {
    if (!confirm('¿Eliminar esta entrada del historial?')) return
    try {
      await articulosApi.deleteHistorial(id)
      setHistorial(h => h.filter(e => e._id !== id))
      toast.success('Entrada eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  const deleteSession = async (sid, count) => {
    if (!confirm(`¿Eliminar toda esta importación (${count} entradas)?`)) return
    try {
      await articulosApi.deleteSession(sid)
      setHistorial(h => h.filter(e => e.importSessionId !== sid))
      toast.success('Importación eliminada del historial')
    } catch { toast.error('Error al eliminar') }
  }

  const toggleSession = (sid) => setExpandedSessions(s => ({ ...s, [sid]: !s[sid] }))

  // Agrupar historial: imports como grupo, individuales sueltos
  const histAgrupado = []
  const sessionsSeen = {}
  for (const entry of historial) {
    if (entry.tipo === 'importado' && entry.importSessionId) {
      const sid = entry.importSessionId
      if (!sessionsSeen[sid]) {
        sessionsSeen[sid] = { sid, fecha: entry.createdAt, entries: [] }
        histAgrupado.push({ tipo: 'session', ...sessionsSeen[sid] })
      }
      sessionsSeen[sid].entries.push(entry)
    } else {
      histAgrupado.push({ tipo: 'entry', entry })
    }
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Total artículos</div><div className="stat-val">{articulos.length}</div></div>
        <div className="stat-card"><div className="stat-label">Filtrados</div><div className="stat-val">{filtrados.length}</div></div>
        <div className="stat-card"><div className="stat-label">Categorías</div><div className="stat-val">{new Set(articulos.map(a => a.categoria).filter(Boolean)).size}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14} /> Nuevo artículo</button>
        <div className="file-input-wrap">
          <button className="btn" disabled={previewing}><Upload size={14} /> Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
        </div>
        <a className="btn" href={articulosApi.exportUrl()} download="articulos.xlsx">
          <Download size={14} /> Exportar
        </a>
        <button className="btn" onClick={openHistorial}>
          <History size={14} /> Historial
        </button>
        <button className="btn danger" onClick={() => setDeleteAllModal(true)} disabled={articulos.length === 0}>
          <Trash2 size={14} /> Borrar todos
        </button>

        {/* Buscadores + filtro categoría */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 160 }}>
            <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' }}
              placeholder="Buscar código..." value={qCodigo}
              onChange={e => { setQCodigo(e.target.value); resetPagina() }}
            />
          </div>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 200 }}>
            <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' }}
              placeholder="Buscar nombre..." value={qNombre}
              onChange={e => { setQNombre(e.target.value); resetPagina() }}
            />
          </div>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              className="input"
              style={{ paddingRight: 28, appearance: 'none', width: 150, cursor: 'pointer' }}
              value={catFiltro}
              onChange={e => { setCatFiltro(e.target.value); resetPagina() }}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS_ART.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--muted)' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Código</th><th>Nombre</th><th>Categoría</th>
              <th style={{ textAlign: 'right' }}>Precio unitario</th>
              <th>Unidad</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="empty"><span className="spinner" /></td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={7} className="empty">Sin resultados.</td></tr>
            ) : visibles.map(a => (
              <tr key={a._id}>
                <td style={{ width: 40 }}>
                  {a.imagen
                    ? <img src={a.imagen} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                    : <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1px solid var(--border)' }} />}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{a.codigo || '—'}</td>
                <td style={{ fontWeight: 500 }}>{a.nombre}</td>
                <td>{a.categoria ? <span className="badge badge-cat">{a.categoria}</span> : '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmt(a.precio)}</td>
                <td style={{ color: 'var(--muted)' }}>{a.unidad || '—'}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => openEdit(a)}><Pencil size={12} /> Editar</button>
                    <button className="btn sm danger" onClick={() => remove(a._id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {totalPags > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>
              Mostrando {(pagActual - 1) * POR_PAGINA + 1}–{Math.min(pagActual * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn sm" disabled={pagActual === 1} onClick={() => setPagina(p => p - 1)}>← Anterior</button>
              {Array.from({ length: totalPags }, (_, i) => i + 1).map(p => (
                <button
                  key={p} className="btn sm"
                  style={p === pagActual ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' } : {}}
                  onClick={() => setPagina(p)}
                >{p}</button>
              ))}
              <button className="btn sm" disabled={pagActual === totalPags} onClick={() => setPagina(p => p + 1)}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal editar/crear artículo ─────────────────────────────────── */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar artículo' : 'Nuevo artículo'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Código</label>
                <input className="input" value={form.codigo} onChange={field('codigo')} placeholder="TUBO-001" />
              </div>
              <div className="form-row">
                <label className="form-label">Categoría</label>
                <select className="input" value={form.categoria} onChange={field('categoria')}>
                  <option value="">— Seleccionar —</option>
                  {CATEGORIAS_ART.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Tubo de acero 1 pulgada" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label className="form-label">Precio unitario *</label>
                <input className="input" type="number" min="0" step="0.01" value={form.precio} onChange={field('precio')} placeholder="0.00" />
              </div>
              <div className="form-row">
                <label className="form-label">Unidad</label>
                <select className="input" value={form.unidad} onChange={field('unidad')}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notas</label>
              <textarea className="input" value={form.notas} onChange={field('notas')} placeholder="Opcional" />
            </div>
            <div className="form-row">
              <label className="form-label">Foto</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.imagen && (
                  <img src={form.imagen} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                )}
                <div className="file-input-wrap">
                  <button type="button" className="btn sm">
                    <Upload size={13} /> {form.imagen ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <input type="file" accept="image/*" onChange={handleImagen} />
                </div>
                {form.imagen && (
                  <button type="button" className="btn sm danger" onClick={removeImagen}><Trash2 size={12} /> Quitar</button>
                )}
              </div>
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

      {/* ── Modal importación (config + preview) ───────────────────────── */}
      {importStep && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && resetImport()}>
          <div className="modal" style={{ maxWidth: 680, width: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <span className="modal-title">
                {importStep === 'config' ? 'Configurar importación' : 'Vista previa de importación'}
              </span>
              <button className="modal-close" onClick={resetImport}>×</button>
            </div>

            {/* ── Paso 1: Configuración ── */}
            {importStep === 'config' && importMeta && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 6, padding: '8px 12px' }}>
                  Archivo: <strong style={{ color: 'var(--text)' }}>{importFile?.name}</strong>
                </div>

                <div className="form-row">
                  <label className="form-label">Hoja</label>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                    <select
                      className="input"
                      style={{ paddingRight: 28, appearance: 'none', width: '100%', cursor: 'pointer' }}
                      value={importConfig.sheetIndex}
                      onChange={e => setImportConfig(c => ({ ...c, sheetIndex: +e.target.value }))}
                    >
                      {importMeta.sheets.map(s => (
                        <option key={s.index} value={s.index}>
                          {s.name} — {s.rowCount} fila{s.rowCount !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--muted)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-row">
                    <label className="form-label">Desde fila</label>
                    <input
                      className="input"
                      type="number" min="1"
                      value={importConfig.startRow}
                      onChange={e => setImportConfig(c => ({ ...c, startRow: e.target.value }))}
                      placeholder="2"
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                      Fila donde empiezan los datos (la fila de encabezados queda excluida)
                    </span>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Hasta fila</label>
                    <input
                      className="input"
                      type="number" min="1"
                      value={importConfig.endRow}
                      onChange={e => setImportConfig(c => ({ ...c, endRow: e.target.value }))}
                      placeholder={`${importMeta.sheets[importConfig.sheetIndex]?.rowCount ?? ''} (última)`}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                      Dejar vacío para importar hasta el final
                    </span>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn" onClick={resetImport}>Cancelar</button>
                  <button className="btn solid" onClick={verPreview} disabled={previewing}>
                    {previewing ? <span className="spinner" /> : 'Ver vista previa →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Paso 2: Preview ── */}
            {importStep === 'preview' && previewData && (
              <>
                {/* Resumen */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  {previewData.errores?.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px' }}>
                      <AlertTriangle size={13} /> {previewData.errores.length} error{previewData.errores.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {previewData.advertencias?.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 10px' }}>
                      <AlertTriangle size={13} /> {previewData.advertencias.length} advertencia{previewData.advertencias.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px' }}>
                    <CheckCircle2 size={13} /> {previewData.nuevos?.length ?? 0} nuevo{previewData.nuevos?.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px' }}>
                    <RefreshCw size={13} /> {previewData.actualizados?.length ?? 0} a actualizar
                  </span>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {previewData.errores?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Errores — estas filas NO se importarán</div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        {previewData.errores.map((e, i) => <div key={i} style={{ color: '#dc2626', padding: '2px 0' }}>• {e}</div>)}
                      </div>
                    </div>
                  )}
                  {previewData.advertencias?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginBottom: 6 }}>Advertencias</div>
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        {previewData.advertencias.map((w, i) => <div key={i} style={{ color: '#92400e', padding: '2px 0' }}>• {w}</div>)}
                      </div>
                    </div>
                  )}
                  {previewData.nuevos?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>Artículos nuevos ({previewData.nuevos.length})</div>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface)' }}>
                            <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Código</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Nombre</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Categoría</th>
                            <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.nuevos.map((a, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '5px 8px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{a.codigo || '—'}</td>
                              <td style={{ padding: '5px 8px' }}>{a.nombre}</td>
                              <td style={{ padding: '5px 8px', color: 'var(--muted)' }}>{a.categoria || '—'}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(a.precio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {previewData.actualizados?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 6 }}>Artículos a actualizar ({previewData.actualizados.length})</div>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface)' }}>
                            <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Nombre</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Cambios</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.actualizados.map((a, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 500, verticalAlign: 'top' }}>{a.nombre}</td>
                              <td style={{ padding: '5px 8px' }}>
                                {a.cambios?.length === 0
                                  ? <span style={{ color: 'var(--muted)' }}>Sin cambios</span>
                                  : a.cambios?.map((c, j) => (
                                    <div key={j} style={{ color: 'var(--muted)', padding: '1px 0' }}>
                                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{CAMPO_LABEL[c.campo] || c.campo}:</span>{' '}
                                      <span style={{ textDecoration: 'line-through', color: '#dc2626' }}>{c.campo === 'precio' ? fmt(c.antes) : String(c.antes ?? '—')}</span>
                                      {' → '}
                                      <span style={{ color: '#16a34a' }}>{c.campo === 'precio' ? fmt(c.despues) : String(c.despues ?? '—')}</span>
                                    </div>
                                  ))
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {previewData.nuevos?.length === 0 && previewData.actualizados?.length === 0 && previewData.errores?.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 }}>El archivo no contiene artículos válidos para importar con la configuración actual.</div>
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: 14 }}>
                  <button className="btn" onClick={() => setImportStep('config')}>← Volver</button>
                  <button className="btn" onClick={resetImport}>Cancelar</button>
                  <button
                    className="btn solid"
                    onClick={confirmarImport}
                    disabled={importing || (previewData.nuevos?.length === 0 && previewData.actualizados?.length === 0)}
                  >
                    {importing
                      ? <span className="spinner" />
                      : `Confirmar (${(previewData.nuevos?.length ?? 0) + (previewData.actualizados?.length ?? 0)} artículos)`
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal borrar todos ──────────────────────────────────────────── */}
      {deleteAllModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && !deletingAll && closeDeleteAllModal()}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertOctagon size={16} /> Borrar todos los artículos
              </span>
              <button className="modal-close" onClick={closeDeleteAllModal}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              Esto borrará permanentemente <strong>{articulos.length}</strong> artículo{articulos.length !== 1 ? 's' : ''} del catálogo. No se puede deshacer.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Las máquinas que usen estos artículos como componentes quedarán con materiales "(eliminado)" hasta que vuelvas a importar el catálogo.
            </p>
            <div className="form-row">
              <label className="form-label">Escribí <strong>BORRAR</strong> para confirmar</label>
              <input
                className="input" autoFocus value={deleteAllConfirm}
                onChange={e => setDeleteAllConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && removeAll()}
                placeholder="BORRAR"
              />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={closeDeleteAllModal}>Cancelar</button>
              <button
                className="btn"
                style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }}
                onClick={removeAll}
                disabled={deleteAllConfirm !== 'BORRAR' || deletingAll}
              >
                {deletingAll ? <span className="spinner" /> : <><Trash2 size={14} /> Borrar todo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal historial ─────────────────────────────────────────────── */}
      {histModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setHistModal(false)}>
          <div className="modal" style={{ maxWidth: 660, width: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <span className="modal-title">Historial de actualizaciones</span>
              <button className="modal-close" onClick={() => setHistModal(false)}>×</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {histLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
              ) : histAgrupado.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: 13 }}>Sin registros en el historial.</div>
              ) : histAgrupado.map((item) => {
                if (item.tipo === 'session') {
                  const { sid, fecha, entries } = item
                  const expanded = expandedSessions[sid]
                  const nNuevos = entries.filter(e => e.esNuevo).length
                  const nActualizados = entries.filter(e => !e.esNuevo).length
                  return (
                    <div key={sid} style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => toggleSession(sid)}
                        >
                          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>
                        <Upload size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, fontSize: 13 }}>Importación</span>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtFecha(fecha)}</span>
                        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                          {nNuevos > 0 && <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px' }}>{nNuevos} nuevos</span>}
                          {nActualizados > 0 && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 6px' }}>{nActualizados} actualizados</span>}
                        </div>
                        <button
                          className="btn sm danger"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => deleteSession(sid, entries.length)}
                        ><Trash2 size={12} /></button>
                      </div>

                      {expanded && (
                        <div style={{ marginTop: 8, marginLeft: 22, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {entries.map(e => (
                            <div key={e._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, padding: '3px 0' }}>
                              <span style={{ color: e.esNuevo ? '#16a34a' : '#2563eb', flexShrink: 0, marginTop: 1 }}>
                                {e.esNuevo ? '+' : '~'}
                              </span>
                              <span style={{ fontWeight: 500, flex: 1 }}>
                                {e.articuloCodigo && <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', marginRight: 6 }}>{e.articuloCodigo}</span>}
                                {e.articuloNombre}
                              </span>
                              {!e.esNuevo && e.cambios?.length > 0 && (
                                <span style={{ color: 'var(--muted)' }}>
                                  {e.cambios.map((c, j) => (
                                    <span key={j}>
                                      {CAMPO_LABEL[c.campo] || c.campo}: {c.campo === 'precio' ? fmt(c.antes) : String(c.antes ?? '')} → {c.campo === 'precio' ? fmt(c.despues) : String(c.despues ?? '')}
                                    </span>
                                  )).reduce((a, b) => [a, ', ', b])}
                                </span>
                              )}
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--muted)', flexShrink: 0 }}
                                onClick={() => deleteHistEntry(e._id)}
                                title="Eliminar esta entrada"
                              ><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                // Entrada individual (creado / actualizado / borrado_masivo)
                const { entry } = item
                const tipoEstilo = {
                  creado:          { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Creado',        icon: <Plus size={13} style={{ color: '#16a34a' }} /> },
                  actualizado:     { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Actualizado',   icon: <Pencil size={13} style={{ color: '#d97706' }} /> },
                  borrado_masivo:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Borrado masivo', icon: <Trash2 size={13} style={{ color: '#dc2626' }} /> },
                }[entry.tipo] || { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Actualizado', icon: <Pencil size={13} style={{ color: '#d97706' }} /> }
                return (
                  <div key={entry._id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      {tipoEstilo.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: tipoEstilo.color, background: tipoEstilo.bg, border: `1px solid ${tipoEstilo.border}`, borderRadius: 4, padding: '1px 6px' }}>
                          {tipoEstilo.label}
                        </span>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>
                          {entry.articuloCodigo && <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 12, marginRight: 5 }}>{entry.articuloCodigo}</span>}
                          {entry.articuloNombre}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto' }}>{fmtFecha(entry.createdAt)}</span>
                      </div>
                      {entry.cambios?.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {entry.cambios.map((c, j) => (
                            <div key={j} style={{ fontSize: 12, color: 'var(--muted)' }}>
                              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{CAMPO_LABEL[c.campo] || c.campo}:</span>{' '}
                              <span style={{ textDecoration: 'line-through', color: '#dc2626' }}>{c.campo === 'precio' ? fmt(c.antes) : String(c.antes ?? '—')}</span>
                              {' → '}
                              <span style={{ color: '#16a34a' }}>{c.campo === 'precio' ? fmt(c.despues) : String(c.despues ?? '—')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn sm danger"
                      style={{ flexShrink: 0 }}
                      onClick={() => deleteHistEntry(entry._id)}
                    ><Trash2 size={12} /></button>
                  </div>
                )
              })}
            </div>

            <div className="form-actions" style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => setHistModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
