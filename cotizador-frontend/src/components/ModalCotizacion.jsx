import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { configApi } from '../lib/api.js'
import { fmt, calcCostoTotal, calcVenta } from '../lib/utils.js'

export default function ModalCotizacion({ maquina, onClose }) {
  const [cfg,       setCfg]       = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [pagos,     setPagos]     = useState({ efectivo: null, transferencia: null, tarjeta: null })
  const [redondeo,  setRedondeo]  = useState(0)

  useEffect(() => {
    configApi.get().then(c => {
      setCfg(c)
      // Inicializar con valores de la máquina si existen, sino con global
      setPagos({
        efectivo:      maquina.pagos?.efectivo      ?? c.pagos?.efectivo      ?? 0,
        transferencia: maquina.pagos?.transferencia ?? c.pagos?.transferencia ?? 0,
        tarjeta:       maquina.pagos?.tarjeta       ?? c.pagos?.tarjeta       ?? 15,
      })
    }).catch(() => toast.error('Error al cargar config')).finally(() => setLoading(false))
    // Carga única al montar: usa los valores de pago de la máquina solo como inicialización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const costoTotal = calcCostoTotal(maquina).total
  const ventaBase  = calcVenta(costoTotal, maquina.margen)

  const roundPrice = (n) => redondeo > 0 ? Math.round(n / redondeo) * redondeo : n
  const precioConRecargo = (pct) => roundPrice(ventaBase * (1 + (Number(pct) || 0) / 100))

  const opcionesPago = [
    { key: 'efectivo',      label: 'Efectivo',      icon: '💵', color: '#1a6640', bg: '#eaf5ee' },
    { key: 'transferencia', label: 'Transferencia', icon: '🏦', color: '#1b4f8a', bg: '#eef4fd' },
    { key: 'tarjeta',       label: 'Tarjeta',       icon: '💳', color: '#7a4a06', bg: '#fdf5e6' },
  ]

  const exportPDF = () => {
    const empresa = cfg?.empresa || {}
    const fecha   = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const filasPago = opcionesPago.map(({ key, label, icon, color, bg }) => {
      const pct    = Number(pagos[key]) || 0
      const precio = precioConRecargo(pct)
      return `
        <tr>
          <td style="padding:14px 20px;font-size:15px;">${icon} ${label}</td>
          <td style="padding:14px 20px;text-align:center;color:${pct > 0 ? '#a0291e' : '#6b6860'};font-size:13px;">
            ${pct > 0 ? `+${pct}%` : 'Sin recargo'}
          </td>
          <td style="padding:14px 20px;text-align:right;">
            <span style="background:${bg};color:${color};padding:6px 14px;border-radius:8px;font-size:17px;font-weight:700;font-family:monospace;">
              ${fmt(precio)}
            </span>
          </td>
        </tr>`
    }).join('')

    const logoHTML = empresa.logo
      ? `<img src="${empresa.logo}" style="height:52px;max-width:140px;object-fit:contain;" />`
      : ''

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; color: #1a1917; background: #fff; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 2px solid #1a1917; }
    .empresa { display: flex; align-items: center; gap: 14px; }
    .empresa-nombre { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .fecha { font-size: 12px; color: #6b6860; margin-top: 4px; }
    .doc-title { font-size: 13px; font-weight: 600; color: #6b6860; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
    .maquina-nombre { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
    .maquina-cat { display: inline-block; padding: 3px 12px; background: #eef4fd; color: #1b4f8a; border-radius: 99px; font-size: 12px; font-weight: 500; }
    .seccion { margin-bottom: 32px; }
    .seccion-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6b6860; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e0d8; border-radius: 10px; overflow: hidden; }
    thead tr { background: #f5f4f0; }
    thead th { padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 600; color: #6b6860; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #e2e0d8; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody tr { border-bottom: 1px solid #e2e0d8; }
    tbody tr:last-child { border-bottom: none; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e0d8; font-size: 11px; color: #6b6860; display: flex; justify-content: space-between; }
    .nota { background: #f5f4f0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #6b6860; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="empresa">
      ${logoHTML}
      <div>
        <div class="empresa-nombre">${empresa.nombre || 'Cotización'}</div>
        <div class="fecha">${fecha}</div>
      </div>
    </div>
    <div class="doc-title">Cotización de precio</div>
  </div>

  <div class="seccion">
    ${maquina.imagen ? `<img src="${maquina.imagen}" style="width:100%;max-height:280px;object-fit:cover;border-radius:10px;margin-bottom:16px;" />` : ''}
    <div class="maquina-nombre">${maquina.nombre}</div>
    ${maquina.categoria ? `<span class="maquina-cat">${maquina.categoria}</span>` : ''}
    ${maquina.notas ? `<p style="margin-top:10px;font-size:13px;color:#6b6860;">${maquina.notas}</p>` : ''}
  </div>

  <div class="seccion">
    <div class="seccion-title">Opciones de pago</div>
    <table>
      <thead>
        <tr>
          <th>Medio de pago</th>
          <th style="text-align:center;">Recargo</th>
          <th style="text-align:right;">Precio final</th>
        </tr>
      </thead>
      <tbody>${filasPago}</tbody>
    </table>
    <div class="nota">Los precios incluyen IVA y están expresados en pesos argentinos. Válido al ${fecha}.</div>
  </div>

  <div class="footer">
    <span>${empresa.nombre || ''}</span>
    <span>Generado con Cotizador de Máquinas</span>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print(); }, 500)
  }

  if (loading) return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 480, textAlign: 'center', padding: 48 }}>
        <span className="spinner" />
      </div>
    </div>
  )

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title"><FileText size={15} style={{ marginRight: 6 }}/> Cotización — {maquina.nombre}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Ajustá los recargos para esta cotización. Los valores vienen de la configuración global pero podés modificarlos acá.
        </p>

        {/* Redondeo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 13 }}>
          <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Redondear precios:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ label: 'Sin redondeo', val: 0 }, { label: '$1', val: 1 }, { label: '$10', val: 10 }, { label: '$100', val: 100 }, { label: '$1000', val: 1000 }].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => setRedondeo(val)}
                style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: '1px solid var(--border)',
                  background: redondeo === val ? 'var(--accent)' : 'var(--surface)',
                  color: redondeo === val ? 'var(--accent-fg)' : 'var(--text)',
                  fontWeight: redondeo === val ? 600 : 400,
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Vista previa de precios */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Precio base de venta: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>{fmt(ventaBase)}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Medio de pago', 'Recargo (%)', 'Precio final'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: i === 2 ? 'right' : i === 1 ? 'center' : 'left', fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opcionesPago.map(({ key, label, icon, color, bg }, i) => (
                <tr key={key} style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{icon} {label}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <input type="number" min="0" max="200" step="0.5"
                      value={pagos[key]}
                      onChange={e => setPagos(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: 80, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>%</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ background: bg, color, padding: '4px 12px', borderRadius: 99, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14 }}>
                      {fmt(precioConRecargo(pagos[key]))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info empresa */}
        {!cfg?.empresa?.nombre && (
          <div style={{ padding: '10px 14px', background: 'var(--amber-bg,#fdf5e6)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--amber,#7a4a06)', marginBottom: 12 }}>
            ⚠️ No hay nombre de empresa configurado. Andá a <strong>Configuración → Empresa</strong> para completarlo.
          </div>
        )}

        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn solid" onClick={exportPDF}>
            <Download size={14}/> Exportar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
