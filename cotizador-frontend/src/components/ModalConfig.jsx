import { useState, useEffect, useRef } from 'react'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { configApi, articulosApi } from '../lib/api.js'
import { fmt, PINTURA_DEFAULTS, precioLitroPintura, setPinturaConfig } from '../lib/utils.js'

const PRODUCTOS_PINTURA = [
  { key: 'pu',          label: 'Pintura PU' },
  { key: 'endurecedor', label: 'Endurecedor' },
  { key: 'diluyente',   label: 'Diluyente' },
  { key: 'primer',      label: 'Primer' },
]
const PARAMS_PINTURA = [
  { key: 'manosPU',           label: 'Manos de PU',                         unidad: 'manos', step: 1 },
  { key: 'rendPU',            label: 'Rendimiento PU mezclado',             unidad: 'm²/L por mano', step: 0.5 },
  { key: 'manosPrimer',       label: 'Manos de primer',                     unidad: 'manos', step: 1 },
  { key: 'rendPrimer',        label: 'Rendimiento primer',                  unidad: 'm²/L por mano', step: 0.5 },
  { key: 'perdida',           label: 'Pérdida con soplete',                 unidad: '%', step: 1 },
  { key: 'partesPintura',     label: 'Mezcla: partes de pintura',           unidad: 'partes', step: 0.5 },
  { key: 'partesEndurecedor', label: 'Mezcla: partes de endurecedor',       unidad: 'partes', step: 0.5 },
  { key: 'pctDiluyente',      label: 'Mezcla: diluyente',                   unidad: '%', step: 1 },
]
const PINTURA_VACIA = {
  ...PINTURA_DEFAULTS,
  pu: { articulo: null, litros: 1 }, endurecedor: { articulo: null, litros: 1 },
  diluyente: { articulo: null, litros: 1 }, primer: { articulo: null, litros: 1 },
}

export default function ModalConfig({ onClose }) {
  const [tarifas,  setTarifas]  = useState([])
  const [placa,    setPlaca]    = useState(0)
  const [pagos,    setPagos]    = useState({ efectivo: 0, transferencia: 0, tarjeta: 15 })
  const [empresa,  setEmpresa]  = useState({ nombre: '', logo: '' })
  const [pintura,  setPintura]  = useState(PINTURA_VACIA)
  const [articulos, setArticulos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('tarifas')
  const logoRef = useRef()

  useEffect(() => {
    articulosApi.getAll('').then(a => setArticulos(Array.isArray(a) ? a : [])).catch(() => {})
    configApi.get()
      .then(cfg => {
        setPintura({ ...PINTURA_VACIA, ...(cfg.pintura || {}) })
        setTarifas(cfg.tarifas || [])
        setPlaca(cfg.precioPlacaKg || 0)
        setPagos(cfg.pagos || { efectivo: 0, transferencia: 0, tarjeta: 15 })
        setEmpresa(cfg.empresa || { nombre: '', logo: '' })
      })
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [])

  const updateTarifa = (i, val) => {
    const next = [...tarifas]
    next[i] = { ...next[i], tarifa: val === '' ? '' : Number(val) }
    setTarifas(next)
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setEmpresa(emp => ({ ...emp, logo: ev.target.result }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const save = async () => {
    setSaving(true)
    try {
      await configApi.update(
        tarifas.map(t => ({ ...t, tarifa: Number(t.tarifa) || 0 })),
        Number(placa) || 0,
        { efectivo: Number(pagos.efectivo)||0, transferencia: Number(pagos.transferencia)||0, tarjeta: Number(pagos.tarjeta)||0 },
        empresa,
        {
          ...Object.fromEntries(PARAMS_PINTURA.map(({ key }) => [key, Number(pintura[key]) || 0])),
          ...Object.fromEntries(PRODUCTOS_PINTURA.map(({ key }) => [key, {
            articulo: pintura[key]?.articulo?._id || null,
            litros:   Number(pintura[key]?.litros) > 0 ? Number(pintura[key].litros) : 1,
          }])),
        },
      ).then(cfg => {
        setPinturaConfig(cfg?.pintura)
        window.dispatchEvent(new Event('config-actualizada'))
      })
      toast.success('Configuración guardada')
      onClose()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const inputStyle = { width: 110, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right' }
  const thL = { padding: '8px 14px', textAlign: 'left',  fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }
  const thR = { padding: '8px 14px', textAlign: 'right', fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }
  const tdL = { padding: '8px 14px', fontWeight: 500 }
  const tdR = { padding: '6px 10px', textAlign: 'right' }
  const tdS = { padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }

  const tabStyle = (t) => ({
    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
    background: tab === t ? '#1a1917' : 'transparent',
    color: tab === t ? '#fff' : '#6b6860',
    fontFamily: 'var(--font)', transition: 'all .15s',
  })

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: tab === 'pintura' ? 640 : 460 }}>
        <div className="modal-header">
          <span className="modal-title">Configuración</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg)', padding: 4, borderRadius: 8, width: 'fit-content' }}>
          <button style={tabStyle('tarifas')} onClick={() => setTab('tarifas')}>Tarifas</button>
          <button style={tabStyle('pintura')} onClick={() => setTab('pintura')}>Pintura</button>
          <button style={tabStyle('pagos')}   onClick={() => setTab('pagos')}>Opciones de pago</button>
          <button style={tabStyle('empresa')} onClick={() => setTab('empresa')}>Empresa</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div> : <>

          {/* ── TARIFAS ── */}
          {tab === 'tarifas' && <>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Mano de obra y herramientas</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg)' }}>
                  <th style={thL}>Recurso</th><th style={thR}>Tarifa ($/hr)</th>
                </tr></thead>
                <tbody>
                  {tarifas.map((t, i) => (
                    <tr key={t.nombre} style={{ borderBottom: i < tarifas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={tdL}>{t.nombre}</td>
                      <td style={tdR}><input type="number" min="0" step="100" value={t.tarifa} onChange={e => updateTarifa(i, e.target.value)} style={inputStyle}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Precio global de materiales</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg)' }}>
                  <th style={thL}>Material</th><th style={thR}>Precio unitario</th><th style={thR}>Unidad</th>
                </tr></thead>
                <tbody>
                  <tr>
                    <td style={tdL}>Placas de corte</td>
                    <td style={tdR}><input type="number" min="0" step="100" value={placa} onChange={e => setPlaca(e.target.value)} style={inputStyle}/></td>
                    <td style={tdS}>$/kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>En cada máquina ingresás los kg y se multiplica por este precio.</p>
          </>}

          {/* ── PINTURA ── */}
          {tab === 'pintura' && (() => {
            const opciones = [...articulos].sort((a, b) =>
              (a.categoria === 'Pintura' ? 0 : 1) - (b.categoria === 'Pintura' ? 0 : 1) || a.nombre.localeCompare(b.nombre))
            const setProducto = (key, cambios) => setPintura(p => ({ ...p, [key]: { ...p[key], ...cambios } }))
            const pp = Number(pintura.partesPintura) || 0, pe = Number(pintura.partesEndurecedor) || 0
            const d  = (Number(pintura.pctDiluyente) || 0) / 100
            const litroMezcla = ((pp * precioLitroPintura(pintura.pu)) + (pe * precioLitroPintura(pintura.endurecedor)) +
              ((pp + pe) * d * precioLitroPintura(pintura.diluyente))) / (((pp + pe) * (1 + d)) || 1)
            return <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Los precios salen de los artículos: cuando cambia un precio, lo actualizás en <b>Artículos</b> y todas las máquinas se recalculan.
                Acá elegís qué artículo es cada producto y cuántos litros trae una unidad.
              </p>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Productos</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--bg)' }}>
                    <th style={thL}>Producto</th><th style={thL}>Artículo</th><th style={thR}>Litros por unidad</th><th style={thR}>$ / litro</th>
                  </tr></thead>
                  <tbody>
                    {PRODUCTOS_PINTURA.map(({ key, label }, i) => {
                      const item = pintura[key] || {}
                      return (
                        <tr key={key} style={{ borderBottom: i < PRODUCTOS_PINTURA.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={tdL}>{label}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <select className="input" style={{ fontSize: 12, padding: '5px 6px' }} value={item.articulo?._id || ''}
                              onChange={e => {
                                const art = articulos.find(a => a._id === e.target.value) || null
                                const litros = art?.unidad === 'lt' ? 1 : art?.unidad === 'ml' ? 0.001 : (item.litros || 1)
                                setProducto(key, { articulo: art, litros })
                              }}>
                              <option value="">— Elegir artículo —</option>
                              {opciones.map(a => <option key={a._id} value={a._id}>{a.nombre} ({fmt(a.precio)} / {a.unidad})</option>)}
                            </select>
                          </td>
                          <td style={tdR}>
                            <input type="number" min="0.001" step="0.05" value={item.litros ?? 1}
                              onChange={e => setProducto(key, { litros: e.target.value })} style={{ ...inputStyle, width: 80 }} />
                          </td>
                          <td style={tdS}>{item.articulo ? fmt(precioLitroPintura(item)) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginBottom: 14 }}>
                Ej.: si el endurecedor está cargado por lata de 0,45 L, poné 0,45. Si el artículo está en litros, poné 1.
                PU mezclado listo para pintar: <b>{fmt(litroMezcla)} / litro</b>.
              </p>

              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Rendimiento y mezcla</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {PARAMS_PINTURA.map(({ key, label, unidad, step }, i) => (
                      <tr key={key} style={{ borderBottom: i < PARAMS_PINTURA.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={tdL}>{label}</td>
                        <td style={tdR}>
                          <input type="number" min="0" step={step} value={pintura[key] ?? ''}
                            onChange={e => setPintura(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                        </td>
                        <td style={tdS}>{unidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                La pérdida y el rendimiento del primer están calibrados con el rack. Ajustalos cuando compares con lo que gasta el taller.
              </p>
            </>
          })()}

          {/* ── OPCIONES DE PAGO ── */}
          {tab === 'pagos' && <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              Recargos globales sobre el precio de venta. Podés sobreescribirlos por máquina al exportar el PDF.
            </p>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg)' }}>
                  <th style={thL}>Medio de pago</th><th style={thR}>Recargo (%)</th><th style={thR}>Ejemplo sobre $100k</th>
                </tr></thead>
                <tbody>
                  {[
                    { key: 'efectivo',      label: 'Efectivo',      icon: '💵' },
                    { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
                    { key: 'tarjeta',       label: 'Tarjeta',       icon: '💳' },
                  ].map(({ key, label, icon }, i) => (
                    <tr key={key} style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                      <td style={tdL}>{icon} {label}</td>
                      <td style={tdR}>
                        <input type="number" min="0" max="200" step="0.5" value={pagos[key]}
                          onChange={e => setPagos(p => ({ ...p, [key]: e.target.value }))}
                          style={inputStyle}/>
                      </td>
                      <td style={tdS}>${(100000 * (1 + (Number(pagos[key])||0)/100)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Si el recargo es 0% significa que ese medio de pago no tiene recargo (precio base).
            </p>
          </>}

          {/* ── EMPRESA ── */}
          {tab === 'empresa' && <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              Estos datos aparecen en el encabezado del PDF de cotización.
            </p>
            <div className="form-row">
              <label className="form-label">Nombre de la empresa</label>
              <input className="input" value={empresa.nombre} onChange={e => setEmpresa(emp => ({ ...emp, nombre: e.target.value }))} placeholder="Ej: UFL Sports" />
            </div>
            <div className="form-row">
              <label className="form-label">Logo</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {empresa.logo && (
                  <img src={empresa.logo} alt="Logo" style={{ height: 48, maxWidth: 120, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4 }} />
                )}
                <div className="file-input-wrap">
                  <button className="btn"><Upload size={13}/> {empresa.logo ? 'Cambiar logo' : 'Subir logo'}</button>
                  <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo}/>
                </div>
                {empresa.logo && (
                  <button className="btn danger" style={{ padding: '6px 10px' }} onClick={() => setEmpresa(e => ({ ...e, logo: '' }))}>Quitar</button>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>PNG o JPG, recomendado fondo transparente.</p>
            </div>
          </>}

        </>}

        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn solid" onClick={save} disabled={saving || loading}>
            {saving ? <span className="spinner" /> : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
