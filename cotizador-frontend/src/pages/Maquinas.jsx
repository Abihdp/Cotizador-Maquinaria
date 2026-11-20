import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Eye, Search, X, ChevronDown, Package, Upload, RefreshCw, ShoppingCart, BarChart2, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { articulosApi, maquinasApi, configApi } from '../lib/api.js'
import { fmt, calcCostoTotal, calcVenta, resizeImageToDataUrl, setPinturaConfig } from '../lib/utils.js'

const litros = (n) => `${(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`
import ModalRecotizacion from '../components/ModalRecotizacion.jsx'
import ModalListaMateriales from '../components/ModalListaMateriales.jsx'
import ModalVariacion from '../components/ModalVariacion.jsx'
import ModalCotizacion from '../components/ModalCotizacion.jsx'

const DRAFT_KEY        = 'maquina_nueva_draft'
const CATEGORIAS_MAQ   = ['Lingotera', 'Fuerza', 'Bancos']
const POR_PAGINA       = 10
const RECURSOS_NOMBRES = ['Soldador','Ayudante de soldador','Pintor / preparador','Amoladora / corte','Compresor']

const mkRecursos = (tarifasConfig = []) =>
  RECURSOS_NOMBRES.map(nombre => {
    const cfg = tarifasConfig.find(t => t.nombre === nombre)
    return { nombre, horas: 0, tarifa: cfg?.tarifa || 0 }
  })

const EMPTY_MAQ = (cfg = {}) => ({
  nombre: '', categoria: '', margen: 30, notas: '', imagen: '',
  componentes: [],
  recursosHora:      mkRecursos(cfg.tarifas || []),
  consumibles:       0,
  placaKg:           0,
  placaKgPrice:      cfg.precioPlacaKg     || 0,
  pctFlete: 0, pctImpuestos: 0, pctGarantia: 0,
  pintar: true,
})

/* ── Modal selector de artículos ── */
function ModalArticulos({ articulos, onSelect, onClose }) {
  const [q,       setQ]       = useState('')
  const [qty,     setQty]     = useState(1)
  const [sel,     setSel]     = useState(null)
  const [added,   setAdded]   = useState([])
  const qtyRef  = React.useRef()
  const fileRef = React.useRef()

  const filtrados = articulos.filter(a =>
    !q || a.nombre.toLowerCase().includes(q.toLowerCase()) || (a.codigo||'').toLowerCase().includes(q.toLowerCase()) || (a.codigoSistema||'').toLowerCase().includes(q.toLowerCase())
  )

  const doAdd = (art, cantidad) => {
    onSelect(art, Number(cantidad))
    setAdded(prev => {
      const idx = prev.findIndex(x => x._id === art._id)
      if (idx >= 0) { const next=[...prev]; next[idx]={...next[idx], qty: next[idx].qty + Number(cantidad)}; return next }
      return [...prev, { ...art, qty: Number(cantidad) }]
    })
  }

  const confirm = () => {
    if (!sel) return toast.error('Seleccioná un artículo')
    if (!qty || qty <= 0) return toast.error('La cantidad debe ser mayor a 0')
    doAdd(sel, qty)
    setSel(null); setQty(1)
    toast.success(`${sel.nombre} agregado`, { duration: 1500 })
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') confirm() }

  const selectRow = (a) => {
    setSel(a)
    setTimeout(() => qtyRef.current?.focus(), 50)
  }

  // Importar Excel: Código | Nombre | Categoría | Precio | Unidad | Notas | Cantidad
  const importExcel = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        let ok = 0, skip = 0, noart = 0
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.every(c => c === undefined || c === null || c === '')) continue
          const [codigo, nombre, , , , , cantRaw] = row
          const cant = parseFloat(String(cantRaw ?? '').replace(',', '.'))
          if (cantRaw === undefined || cantRaw === null || cantRaw === '') { skip++; continue }
          if (isNaN(cant) || cant <= 0) { skip++; continue }
          const art = articulos.find(a =>
            (codigo && a.codigo && a.codigo.trim().toLowerCase() === String(codigo).trim().toLowerCase()) ||
            (codigo && a.codigoSistema && a.codigoSistema.trim().toLowerCase() === String(codigo).trim().toLowerCase()) ||
            (nombre && a.nombre.trim().toLowerCase() === String(nombre).trim().toLowerCase())
          )
          if (!art) { noart++; continue }
          doAdd(art, cant); ok++
        }
        toast.success(`${ok} artículo${ok!==1?'s':''} importado${ok!==1?'s':''}`, { duration: 3000 })
        if (skip  > 0) toast(`${skip} fila${skip!==1?'s':''} sin cantidad omitida${skip!==1?'s':''}`, { duration: 4000 })
        if (noart > 0) toast.error(`${noart} artículo${noart!==1?'s':''} no encontrado${noart!==1?'s':''} en la base`, { duration: 4000 })
      } catch { toast.error('Error al leer el archivo') }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <span className="modal-title">Agregar artículos</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div className="file-input-wrap">
              <button className="btn sm" title="Importar desde Excel (col. Cantidad al final)">
                <Upload size={13}/> Importar Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel}/>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Buscador */}
        <div className="input" style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
          <Search size={13} style={{ color:'var(--muted)', flexShrink:0 }} />
          <input autoFocus
            style={{ border:'none', outline:'none', background:'transparent', width:'100%', fontFamily:'var(--font)', fontSize:13, color:'var(--text)' }}
            placeholder="Buscar por nombre o código..." value={q} onChange={e => { setQ(e.target.value); setSel(null) }} />
          {q && <button onClick={() => setQ('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex' }}><X size={13}/></button>}
        </div>

        {/* Tabla de artículos */}
        <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', maxHeight:260, overflowY:'auto', marginBottom:10 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg)', position:'sticky', top:0, zIndex:1 }}>
                <th style={{ padding:'7px 12px', borderBottom:'1px solid var(--border)' }}></th>
                {['Nombre','Categoría','Precio','Unidad'].map((h,i) => (
                  <th key={h} style={{ padding:'7px 12px', textAlign:i>=2?'right':'left', fontWeight:500, fontSize:11, color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:13 }}>Sin resultados.</td></tr>
                : filtrados.map(a => (
                  <tr key={a._id} onClick={() => selectRow(a)}
                    style={{ cursor:'pointer', borderBottom:'1px solid var(--border)', background: sel?._id===a._id ? 'var(--blue-bg,#eef4fd)' : 'transparent', transition:'background .1s' }}>
                    <td style={{ padding:'6px 12px', width:36 }}>
                      {a.imagen
                        ? <img src={a.imagen} alt="" style={{ width:28, height:28, objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}/>
                        : <div style={{ width:28, height:28, borderRadius:'var(--radius-sm)', background:'var(--bg)', border:'1px solid var(--border)' }}/>}
                    </td>
                    <td style={{ padding:'8px 12px', fontWeight: sel?._id===a._id?600:400 }}>{a.nombre}</td>
                    <td style={{ padding:'8px 12px', color:'var(--muted)' }}>{a.categoria||'—'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:'var(--mono)', fontSize:12 }}>{fmt(a.precio)}</td>
                    <td style={{ padding:'8px 12px', color:'var(--muted)' }}>{a.unidad}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Cantidad + botón agregar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: sel ? 'var(--blue-bg,#eef4fd)' : 'var(--bg)', borderRadius:'var(--radius-sm)', marginBottom:10, minHeight:48, border:'1px solid var(--border)', transition:'background .15s' }}>
          {sel ? <>
            <span style={{ flex:1, fontWeight:500, fontSize:13, color:'var(--text)' }}>{sel.nombre}</span>
            <label style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>Cantidad</label>
            <input ref={qtyRef} type="number" min="0.01" step="any" value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ width:80, padding:'5px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--mono)', fontSize:13, textAlign:'right' }} />
            <span style={{ fontSize:12, color:'var(--muted)' }}>{sel.unidad}</span>
            <button className="btn solid" style={{ padding:'5px 14px', fontSize:12 }} onClick={confirm}>+ Agregar</button>
          </> : (
            <span style={{ color:'var(--muted)', fontSize:13 }}>Seleccioná un artículo de la tabla para agregar</span>
          )}
        </div>

        {/* Lista de lo ya agregado en esta sesión */}
        {added.length > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>Agregados en esta sesión</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {added.map(a => (
                <span key={a._id} style={{ padding:'3px 10px', background:'var(--green-bg,#eaf5ee)', color:'var(--green,#1a6640)', borderRadius:99, fontSize:12, fontWeight:500 }}>
                  {a.nombre} × {a.qty} {a.unidad}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button className="btn solid" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers de UI ── */
const SectionLabel = ({ children, mt = 16 }) => (
  <div className="section-label" style={{ marginTop: mt }}>{children}</div>
)

const ResumenFila = ({ label, val, bold, green, big }) => (
  <div style={{ display:'flex', justifyContent:'space-between', padding: bold?'8px 14px':'6px 14px', fontSize:13, borderBottom:'1px solid var(--border)', fontWeight: bold?600:400 }}>
    <span style={{ color: bold?'inherit':'var(--muted)' }}>{label}</span>
    <span style={{ fontFamily:'var(--mono)', color: green?'var(--green)':'inherit', fontSize: big?16:13 }}>{fmt(val)}</span>
  </div>
)

/* ── Página principal ── */
export default function Maquinas() {
  const [maquinas,  setMaquinas]  = useState([])
  const [articulos, setArticulos] = useState([])
  const [cfg,       setCfg]       = useState({})
  const [loading,   setLoading]   = useState(true)
  const [q,         setQ]         = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [pagina,    setPagina]    = useState(1)
  const [modal,       setModal]       = useState(false)
  const [modalArt,    setModalArt]    = useState(false)
  const [modalReco,   setModalReco]   = useState(false)
  const [modalLista,  setModalLista]  = useState(false)
  const [modalVar,    setModalVar]    = useState(null)
  const [modalCotiz,  setModalCotiz]  = useState(null)  // maquina object
  const [form,        setForm]        = useState(EMPTY_MAQ())
  const [editId,      setEditId]      = useState(null)
  const [detail,      setDetail]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(false)
  const [draftData,   setDraftData]   = useState(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [maqData, artData, cfgData] = await Promise.all([maquinasApi.getAll(''), articulosApi.getAll(''), configApi.get()])
      setMaquinas(Array.isArray(maqData) ? maqData : [])
      setArticulos(Array.isArray(artData) ? artData : [])
      setCfg(cfgData || {})
      setPinturaConfig(cfgData?.pintura)
    } catch { toast.error('Error al cargar datos') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll() }, [])

  // Si se guarda la configuración (precios o rendimiento de pintura), recalcular todo
  useEffect(() => {
    const onCfg = () => loadAll()
    window.addEventListener('config-actualizada', onCfg)
    return () => window.removeEventListener('config-actualizada', onCfg)
  }, [])

  const filtrados = maquinas.filter(m => {
    const matchQ   = !q || m.nombre.toLowerCase().includes(q.toLowerCase())
    const matchCat = !catFiltro || m.categoria === catFiltro
    return matchQ && matchCat
  })
  const totalPags = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagActual = Math.min(pagina, totalPags)
  const visibles  = filtrados.slice((pagActual-1)*POR_PAGINA, pagActual*POR_PAGINA)

  const saveDraft  = (f) => { if (!f.nombre?.trim()) return; try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)) } catch { /* localStorage no disponible */ } }
  const clearDraft = ()  => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* localStorage no disponible */ } }
  const loadDraft  = ()  => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) } catch { return null } }

  const openNew = () => {
    const draft = loadDraft()
    if (draft) { setDraftData(draft); setDraftPrompt(true) }
    else { setEditId(null); setForm(EMPTY_MAQ(cfg)); setModal('edit') }
  }

  const continueDraft = () => {
    setDraftPrompt(false); setEditId(null); setForm(draftData); setDraftData(null); setModal('edit')
  }

  const discardDraft = () => {
    clearDraft(); setDraftPrompt(false); setDraftData(null); setEditId(null); setForm(EMPTY_MAQ(cfg)); setModal('edit')
  }

  // Cierre de modal nueva máquina: guarda draft automáticamente
  const closeNewModal = () => {
    if (!editId) { saveDraft(form); if (form.nombre?.trim()) toast('Borrador guardado', { icon: '📝', duration: 2000 }) }
    setModal(false)
  }

  const openEdit = (m) => {
    setEditId(m._id)
    const saved  = m.recursosHora || []
    const merged = RECURSOS_NOMBRES.map(nombre => {
      const s = saved.find(r => r.nombre === nombre)
      const c = (cfg.tarifas||[]).find(t => t.nombre === nombre)
      return { nombre, horas: s?.horas||0, tarifa: c?.tarifa || s?.tarifa || 0 }
    })
    const componentesValidos = m.componentes.filter(c => c.articulo)
    const huerfanos = m.componentes.length - componentesValidos.length
    if (huerfanos > 0) toast.error(`${huerfanos} material${huerfanos !== 1 ? 'es' : ''} se quitaron de esta máquina porque el artículo ya no existe`, { duration: 4000 })
    setForm({
      nombre: m.nombre, categoria: m.categoria, margen: m.margen, notas: m.notas, imagen: m.imagen || '',
      componentes: componentesValidos.map(c => ({ articulo: c.articulo, cantidad: c.cantidad })),
      recursosHora:      merged,
      consumibles:       m.consumibles       || 0,
      placaKg:           m.placaKg           || 0,
      placaKgPrice:      cfg.precioPlacaKg   || m.placaKgPrice    || 0,
      pctFlete: m.pctFlete||0, pctImpuestos: m.pctImpuestos||0, pctGarantia: m.pctGarantia||0,
      pintar: m.pintar !== false,
    })
    setModal('edit')
  }

  const openDetail = (m) => { setDetail(m); setModal('detail') }

  const handleSelectArt = (art, qty) => setForm(f => {
    const idx = f.componentes.findIndex(c => c.articulo._id === art._id)
    if (idx >= 0) {
      const comps = [...f.componentes]
      comps[idx] = { ...comps[idx], cantidad: comps[idx].cantidad + qty }
      return { ...f, componentes: comps }
    }
    return { ...f, componentes: [...f.componentes, { articulo: art, cantidad: qty }] }
  })

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

  const removeComp     = (i) => setForm(f => ({ ...f, componentes: f.componentes.filter((_,j) => j!==i) }))
  const updateCantidad = (i, val) => setForm(f => { const c=[...f.componentes]; c[i]={...c[i],cantidad:val===''?'':Number(val)}; return {...f,componentes:c} })
  const updateHoras  = (i, val) => setForm(f => { const r=[...f.recursosHora]; r[i]={...r[i],horas:val===''?'':Number(val)}; return {...f,recursosHora:r} })
  const field        = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const costs = calcCostoTotal(form)
  const venta = calcVenta(costs.total, form.margen)

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre, categoria: form.categoria, margen: Number(form.margen), notas: form.notas, imagen: form.imagen || '',
        componentes:  form.componentes.map(c => ({ articulo: c.articulo._id, cantidad: c.cantidad })),
        recursosHora: form.recursosHora.map(r => ({ nombre:r.nombre, horas:Number(r.horas)||0, tarifa:Number(r.tarifa)||0 })),
        consumibles:       Number(form.consumibles)       || 0,
        placaKg:           Number(form.placaKg)           || 0,
        placaKgPrice:      Number(form.placaKgPrice)      || 0,
        pctFlete:          Number(form.pctFlete)          || 0,
        pctImpuestos:      Number(form.pctImpuestos)      || 0,
        pctGarantia:       Number(form.pctGarantia)       || 0,
        pintar:            form.pintar !== false,
      }
      if (editId) await maquinasApi.update(editId, payload)
      else        await maquinasApi.create(payload)
      toast.success(editId ? 'Máquina actualizada' : 'Máquina creada')
      if (!editId) clearDraft()
      setModal(false); loadAll()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('¿Borrar esta máquina?')) return
    try { await maquinasApi.remove(id); toast.success('Máquina borrada'); loadAll() }
    catch { toast.error('Error al borrar') }
  }

  const numInput = (val, onChange, { w=90, step=1 } = {}) => (
    <input type="number" min="0" step={step} value={val} onChange={onChange}
      style={{ width:w, padding:'5px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--mono)', fontSize:13, textAlign:'right' }} />
  )

  return (
    <div className="page">
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Total máquinas</div><div className="stat-val">{maquinas.length}</div></div>
        <div className="stat-card"><div className="stat-label">Filtradas</div><div className="stat-val">{filtrados.length}</div></div>
        <div className="stat-card"><div className="stat-label">Categorías</div><div className="stat-val">{new Set(maquinas.map(m=>m.categoria).filter(Boolean)).size}</div></div>
      </div>

      <div className="toolbar">
        <button className="btn solid" onClick={openNew}><Plus size={14}/> Nueva máquina</button>
        <button className="btn" onClick={() => setModalReco(true)}><RefreshCw size={14}/> Recotizar</button>
        <button className="btn" onClick={() => setModalLista(true)}><ShoppingCart size={14}/> Lista de materiales</button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <div className="input" style={{ display:'flex', alignItems:'center', gap:6, width:220 }}>
            <Search size={13} style={{ color:'var(--muted)', flexShrink:0 }}/>
            <input style={{ border:'none', outline:'none', background:'transparent', width:'100%', fontFamily:'var(--font)', fontSize:13, color:'var(--text)' }}
              placeholder="Buscar máquina..." value={q} onChange={e=>{ setQ(e.target.value); setPagina(1) }}/>
          </div>
          <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
            <select className="input" style={{ paddingRight:28, appearance:'none', width:160, cursor:'pointer' }}
              value={catFiltro} onChange={e=>{ setCatFiltro(e.target.value); setPagina(1) }}>
              <option value="">Todas las categorías</option>
              {CATEGORIAS_MAQ.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:8, pointerEvents:'none', color:'var(--muted)' }}/>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
        <table>
          <thead><tr>
            <th></th>
            <th>Nombre</th><th>Categoría</th>
            <th style={{textAlign:'right'}}>Materiales</th>
            <th style={{textAlign:'right'}}>M. de obra</th>
            <th style={{textAlign:'right'}}>Costo total</th>
            <th>Margen</th>
            <th style={{textAlign:'right'}}>Precio venta</th>
            <th></th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="empty"><span className="spinner"/></td></tr>
            : visibles.length===0 ? <tr><td colSpan={9} className="empty">Sin resultados.</td></tr>
            : visibles.map(m => {
              const c = calcCostoTotal(m); const v = calcVenta(c.total, m.margen)
              return <tr key={m._id}>
                <td style={{width:40}}>
                  {m.imagen
                    ? <img src={m.imagen} alt="" style={{width:32,height:32,objectFit:'cover',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}/>
                    : <div style={{width:32,height:32,borderRadius:'var(--radius-sm)',background:'var(--bg)',border:'1px solid var(--border)'}}/>}
                </td>
                <td style={{fontWeight:500}}>{m.nombre}</td>
                <td>{m.categoria?<span className="badge badge-cat">{m.categoria}</span>:'—'}</td>
                <td style={{textAlign:'right',fontFamily:'var(--mono)',fontSize:12}}>{fmt(c.materiales)}</td>
                <td style={{textAlign:'right',fontFamily:'var(--mono)',fontSize:12}}>{fmt(c.manoObra)}</td>
                <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600}}>{fmt(c.total)}</td>
                <td style={{color:'var(--muted)'}}>{m.margen}%</td>
                <td style={{textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--green)'}}>{fmt(v)}</td>
                <td><div className="row-actions">
                  <button className="btn sm" onClick={()=>openDetail(m)}><Eye size={12}/> Ver</button>
                  <button className="btn sm" onClick={()=>openEdit(m)}><Pencil size={12}/> Editar</button>
                  <button className="btn sm" onClick={()=>setModalCotiz(m)} title="Exportar cotización PDF"><FileText size={12}/></button>
                  <button className="btn sm" onClick={()=>setModalVar(m._id)} title="Análisis de variación"><BarChart2 size={12}/></button>
                  <button className="btn sm danger" onClick={()=>remove(m._id)}><Trash2 size={12}/></button>
                </div></td>
              </tr>
            })}
          </tbody>
        </table>
        </div>
        {totalPags>1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderTop:'1px solid var(--border)', fontSize:13 }}>
            <span style={{color:'var(--muted)'}}>Mostrando {(pagActual-1)*POR_PAGINA+1}–{Math.min(pagActual*POR_PAGINA,filtrados.length)} de {filtrados.length}</span>
            <div style={{display:'flex',gap:4}}>
              <button className="btn sm" disabled={pagActual===1} onClick={()=>setPagina(p=>p-1)}>← Anterior</button>
              {Array.from({length:totalPags},(_,i)=>i+1).map(p=>(
                <button key={p} className="btn sm" style={p===pagActual?{background:'var(--accent)',color:'var(--accent-fg)',borderColor:'var(--accent)'}:{}} onClick={()=>setPagina(p)}>{p}</button>
              ))}
              <button className="btn sm" disabled={pagActual===totalPags} onClick={()=>setPagina(p=>p+1)}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── PROMPT BORRADOR ── */}
      {draftPrompt && draftData && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Borrador sin guardar</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
              Hay un borrador guardado de una máquina nueva:
            </p>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>{draftData.nombre || '(sin nombre)'}</span>
              {draftData.categoria && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{draftData.categoria}</span>}
              {draftData.componentes?.length > 0 && (
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>· {draftData.componentes.length} artículo{draftData.componentes.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={discardDraft}>Nueva máquina</button>
              <button className="btn solid" onClick={continueDraft}>Continuar borrador</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDICIÓN ── */}
      {modal==='edit' && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&(editId?setModal(false):closeNewModal())}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <span className="modal-title">{editId?'Editar máquina':'Nueva máquina'}</span>
              <button className="modal-close" onClick={()=>editId?setModal(false):closeNewModal()}>×</button>
            </div>

            {/* Datos generales */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-row" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Nombre *</label>
                <input className="input" value={form.nombre} onChange={field('nombre')} placeholder="Ej: Banco de musculación BM-200"/>
              </div>
              <div className="form-row">
                <label className="form-label">Categoría</label>
                <select className="input" value={form.categoria} onChange={field('categoria')}>
                  <option value="">— Seleccionar —</option>
                  {CATEGORIAS_MAQ.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Margen de ganancia (%)</label>
                <input className="input" type="number" min="0" step="1" value={form.margen} onChange={field('margen')}/>
              </div>
              <div className="form-row" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Notas</label>
                <textarea className="input" value={form.notas} onChange={field('notas')} placeholder="Opcional"/>
              </div>
              <div className="form-row" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Foto</label>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {form.imagen && (
                    <img src={form.imagen} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}/>
                  )}
                  <div className="file-input-wrap">
                    <button type="button" className="btn sm">
                      <Upload size={13}/> {form.imagen ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    <input type="file" accept="image/*" onChange={handleImagen}/>
                  </div>
                  {form.imagen && (
                    <button type="button" className="btn sm danger" onClick={removeImagen}><Trash2 size={12}/> Quitar</button>
                  )}
                </div>
              </div>
            </div>

            {/* Materiales */}
            <SectionLabel>Materiales</SectionLabel>
            {form.componentes.length > 0 && (
              <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', maxHeight:200, overflowY:'auto', marginBottom:8 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg)', position:'sticky', top:0, zIndex:1 }}>
                      {['Artículo','Cantidad','Precio unit.','Subtotal',''].map((h,i) => (
                        <th key={i} style={{ padding:'6px 10px', textAlign: i===0?'left':'right', fontWeight:500, fontSize:11, color:'var(--muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.componentes.map((c,i) => (
                      <tr key={i} style={{ borderBottom: i<form.componentes.length-1?'1px solid var(--border)':'none' }}>
                        <td style={{ padding:'6px 10px', fontWeight:500 }}>{c.articulo.nombre}</td>
                        <td style={{ padding:'4px 6px', textAlign:'right' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                            <input type="number" min="0.01" step="any" value={c.cantidad}
                              onChange={e => updateCantidad(i, e.target.value)}
                              style={{ width:65, padding:'3px 6px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--mono)', fontSize:12, textAlign:'right' }} />
                            <span style={{ fontSize:11, color:'var(--muted)' }}>{c.articulo.unidad}</span>
                          </div>
                        </td>
                        <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>{fmt(c.articulo.precio)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, fontWeight:500 }}>{fmt(c.articulo.precio*(c.cantidad||0))}</td>
                        <td style={{ padding:'4px 8px', textAlign:'right' }}>
                          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex' }} onClick={() => removeComp(i)}><X size={13}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn" style={{width:'100%',justifyContent:'center'}} onClick={()=>setModalArt(true)}>
              <Package size={14}/> Buscar y agregar artículo
            </button>

            {/* Mano de obra */}
            <SectionLabel>Mano de obra y herramientas</SectionLabel>
            <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden',marginBottom:8}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'var(--bg)'}}>
                  {['Recurso','Horas','Tarifa $/hr','Subtotal'].map((h,i)=>(
                    <th key={h} style={{padding:'7px 12px',textAlign:i===0?'left':'right',fontWeight:500,fontSize:11,color:'var(--muted)',borderBottom:'1px solid var(--border)'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {form.recursosHora.map((r,i)=>(
                    <tr key={r.nombre} style={{borderBottom:i<form.recursosHora.length-1?'1px solid var(--border)':'none'}}>
                      <td style={{padding:'7px 12px',fontWeight:500}}>{r.nombre}</td>
                      <td style={{padding:'4px 8px',textAlign:'right'}}>
                        {numInput(r.horas, e=>updateHoras(i,e.target.value), {w:70,step:0.5})}
                      </td>
                      <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,color:'var(--muted)'}}>{fmt(r.tarifa)}</td>
                      <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,fontWeight:500}}>{fmt((r.horas||0)*(r.tarifa||0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Consumibles, pintura, placas */}
            <SectionLabel>Materiales de proceso</SectionLabel>
            <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden',marginBottom:8}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'var(--bg)'}}>
                  {['Ítem','Cantidad','Precio unit.','Subtotal'].map((h,i)=>(
                    <th key={h} style={{padding:'7px 12px',textAlign:i===0?'left':'right',fontWeight:500,fontSize:11,color:'var(--muted)',borderBottom:'1px solid var(--border)'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {/* Consumibles — monto fijo */}
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'7px 12px',fontWeight:500}}>Consumibles<br/><span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>discos, varillas, calcos…</span></td>
                    <td colSpan={2} style={{padding:'4px 8px',textAlign:'right'}}>
                      {numInput(form.consumibles, field('consumibles'), {w:110,step:100})}
                    </td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,fontWeight:500}}>{fmt(Number(form.consumibles)||0)}</td>
                  </tr>
                  {/* Placas */}
                  <tr>
                    <td style={{padding:'7px 12px',fontWeight:500}}>Placas de corte</td>
                    <td style={{padding:'4px 8px',textAlign:'right'}}>
                      <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                        {numInput(form.placaKg, field('placaKg'), {w:70,step:0.5})}
                        <span style={{fontSize:11,color:'var(--muted)'}}>kg</span>
                      </div>
                    </td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,color:'var(--muted)'}}>{fmt(form.placaKgPrice)}/kg</td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,fontWeight:500}}>{fmt((Number(form.placaKg)||0)*(Number(form.placaKgPrice)||0))}</td>
                  </tr>
                  {/* Pintura — se calcula con los perfiles de los materiales */}
                  <tr style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'7px 12px',fontWeight:500}}>
                      <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                        <input type="checkbox" checked={form.pintar !== false} onChange={e=>setForm(f=>({...f,pintar:e.target.checked}))}/>
                        Pintura
                      </label>
                      <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>se calcula con los caños de la máquina</span>
                    </td>
                    <td colSpan={2} style={{padding:'7px 12px',textAlign:'right',fontSize:12,color:'var(--muted)'}}>
                      {form.pintar === false ? 'No se pinta' : costs.pinturaDetalle.m2 > 0
                        ? <>{costs.pinturaDetalle.m2.toLocaleString('es-AR',{maximumFractionDigits:2})} m² · PU {litros(costs.pinturaDetalle.puMezcla)} · primer {litros(costs.pinturaDetalle.primer)}</>
                        : 'Sin caños con perfil cargado'}
                    </td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontFamily:'var(--mono)',fontSize:12,fontWeight:500}}>{fmt(costs.pintura)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Otros costos */}
            <SectionLabel>Otros costos</SectionLabel>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <div className="form-row">
                <label className="form-label">Flete (%)</label>
                <input className="input" type="number" min="0" max="100" step="0.5" value={form.pctFlete} onChange={field('pctFlete')} placeholder="0"/>
              </div>
              <div className="form-row">
                <label className="form-label">Impuestos (%)</label>
                <input className="input" type="number" min="0" max="100" step="0.5" value={form.pctImpuestos} onChange={field('pctImpuestos')} placeholder="0"/>
              </div>
              <div className="form-row">
                <label className="form-label">Garantía (%)</label>
                <input className="input" type="number" min="0" max="100" step="0.5" value={form.pctGarantia} onChange={field('pctGarantia')} placeholder="0"/>
              </div>
            </div>

            {/* Resumen */}
            <div style={{background:'var(--bg)',borderRadius:'var(--radius-sm)',overflow:'hidden',marginTop:12}}>
              <ResumenFila label="Materiales"                                val={costs.materiales}/>
              <ResumenFila label="Mano de obra"                              val={costs.manoObra}/>
              <ResumenFila label="Consumibles"                               val={costs.consumibles}/>
              <ResumenFila label="Placas de corte"                           val={costs.placas}/>
              <ResumenFila label="Pintura"                                   val={costs.pintura}/>
              <ResumenFila label={`Flete (${form.pctFlete}%)`}               val={costs.flete}/>
              <ResumenFila label={`Impuestos (${form.pctImpuestos}%)`}       val={costs.impuestos}/>
              <ResumenFila label={`Garantía / postventa (${form.pctGarantia}%)`} val={costs.garantia}/>
              <ResumenFila label="Costo total"   val={costs.total} bold/>
              <ResumenFila label={`Precio de venta (${form.margen}% margen)`} val={venta} bold green big/>
            </div>

            <div className="form-actions">
              <button className="btn" onClick={()=>editId?setModal(false):closeNewModal()}>Cancelar</button>
              <button className="btn solid" onClick={save} disabled={saving}>
                {saving?<span className="spinner"/>:'Guardar máquina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalArt && <ModalArticulos articulos={articulos} onSelect={handleSelectArt} onClose={()=>setModalArt(false)}/>}
      {modalReco  && <ModalRecotizacion onClose={() => setModalReco(false)} />}
      {modalLista && <ModalListaMateriales onClose={() => setModalLista(false)} />}
      {modalVar   && <ModalVariacion maquinaId={modalVar} onClose={() => setModalVar(null)} />}
      {modalCotiz && <ModalCotizacion maquina={modalCotiz} onClose={() => setModalCotiz(null)} />}

      {/* ── MODAL DETALLE ── */}
      {modal==='detail' && detail && (()=>{
        const c=calcCostoTotal(detail); const v=calcVenta(c.total,detail.margen)
        return (
          <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <div className="modal" style={{maxWidth:560}}>
              <div className="modal-header">
                <span className="modal-title">{detail.nombre}</span>
                <button className="modal-close" onClick={()=>setModal(false)}>×</button>
              </div>
              {detail.imagen && (
                <img src={detail.imagen} alt={detail.nombre} style={{ width:'100%', maxHeight:260, objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', marginBottom:12 }}/>
              )}
              <div className="detail-grid">
                <div className="detail-card"><div className="detail-label">Categoría</div><div className="detail-val">{detail.categoria||'—'}</div></div>
                <div className="detail-card"><div className="detail-label">Margen</div><div className="detail-val">{detail.margen}%</div></div>
                <div className="detail-card"><div className="detail-label">Costo total</div><div className="detail-val">{fmt(c.total)}</div></div>
                <div className="detail-card"><div className="detail-label">Precio de venta</div><div className="detail-val green">{fmt(v)}</div></div>
              </div>

              {detail.componentes?.length>0 && <>
                <div className="section-label">Materiales</div>
                <div className="comp-list" style={{marginBottom:12}}>
                  {detail.componentes.map((comp,i)=>(
                    <div className="comp-row" key={i}>
                      <span className="comp-name">{comp.articulo?.nombre||'(eliminado)'}</span>
                      <span className="comp-qty">× {comp.cantidad} {comp.articulo?.unidad}</span>
                      <span className="comp-price">{comp.articulo?fmt(comp.articulo.precio):'—'}</span>
                      <span className="comp-sub">{comp.articulo?fmt(comp.articulo.precio*comp.cantidad):'—'}</span>
                    </div>
                  ))}
                </div>
              </>}

              {detail.recursosHora?.some(r=>r.horas>0) && <>
                <div className="section-label">Mano de obra</div>
                <div className="comp-list" style={{marginBottom:12}}>
                  {detail.recursosHora.filter(r=>r.horas>0).map((r,i)=>(
                    <div className="comp-row" key={i}>
                      <span className="comp-name">{r.nombre}</span>
                      <span className="comp-qty">{r.horas} hs × {fmt(r.tarifa)}</span>
                      <span className="comp-sub" style={{marginLeft:'auto'}}>{fmt(r.horas*r.tarifa)}</span>
                    </div>
                  ))}
                </div>
              </>}

              {c.pinturaDetalle.m2>0 && <>
                <div className="section-label">Pintura — para el pintor</div>
                <div className="comp-list" style={{marginBottom:12}}>
                  <div className="comp-row"><span className="comp-name">Superficie a pintar</span><span className="comp-sub" style={{marginLeft:'auto'}}>{c.pinturaDetalle.m2.toLocaleString('es-AR',{maximumFractionDigits:2})} m²</span></div>
                  <div className="comp-row"><span className="comp-name">Primer</span><span className="comp-qty">{litros(c.pinturaDetalle.primer)}</span><span className="comp-sub" style={{marginLeft:'auto'}}>{fmt(c.pinturaDetalle.costoPrimer)}</span></div>
                  <div className="comp-row"><span className="comp-name">PU mezclado: {litros(c.pinturaDetalle.pu)} pintura + {litros(c.pinturaDetalle.endurecedor)} endurecedor + {litros(c.pinturaDetalle.diluyente)} diluyente</span><span className="comp-qty">{litros(c.pinturaDetalle.puMezcla)}</span><span className="comp-sub" style={{marginLeft:'auto'}}>{fmt(c.pinturaDetalle.costoPU)}</span></div>
                </div>
              </>}

              <div className="section-label">Resumen de costos</div>
              <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden'}}>
                <ResumenFila label="Materiales"      val={c.materiales}/>
                <ResumenFila label="Mano de obra"    val={c.manoObra}/>
                {c.consumibles>0 && <ResumenFila label="Consumibles"    val={c.consumibles}/>}
                {c.placas>0      && <ResumenFila label="Placas de corte" val={c.placas}/>}
                {c.pintura>0     && <ResumenFila label="Pintura"         val={c.pintura}/>}
                {c.flete>0       && <ResumenFila label={`Flete (${detail.pctFlete}%)`} val={c.flete}/>}
                <ResumenFila label={`Impuestos (${detail.pctImpuestos}%)`}       val={c.impuestos}/>
                <ResumenFila label={`Garantía (${detail.pctGarantia}%)`}         val={c.garantia}/>
                <ResumenFila label="Costo total"    val={c.total} bold/>
                <ResumenFila label={`Precio de venta (${detail.margen}% margen)`} val={v} bold green big/>
              </div>

              {detail.notas && <p style={{marginTop:12,fontSize:13,color:'var(--muted)'}}>Notas: {detail.notas}</p>}
              <div className="form-actions">
                <button className="btn" onClick={()=>{setModal(false);openEdit(detail)}}><Pencil size={13}/> Editar</button>
                <button className="btn solid" onClick={()=>setModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
