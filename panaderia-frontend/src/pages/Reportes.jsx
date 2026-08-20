import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { reportesApi } from '../lib/api.js'
import { fmt, fmtFecha } from '../lib/utils.js'

export default function Reportes() {
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')

  const load = async () => {
    setLoading(true)
    try { setResumen(await reportesApi.resumen({ desde: desde || undefined, hasta: hasta || undefined })) }
    catch { toast.error('Error al cargar reportes') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltro = () => load()
  const limpiarFiltro = () => { setDesde(''); setHasta(''); setTimeout(load, 0) }

  const chartData = (resumen?.porFeria || [])
    .slice()
    .reverse()
    .map(f => ({ nombre: f.feriaNombre, Ventas: Math.round(f.totalVentas), Ganancia: Math.round(f.ganancia) }))

  if (loading && !resumen) return (
    <div className="page"><div className="empty"><span className="spinner" /></div></div>
  )

  return (
    <div className="page">
      <div className="toolbar">
        <div className="form-row" style={{ margin: 0 }}>
          <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 150 }} />
        </div>
        <span style={{ color: 'var(--muted)' }}>a</span>
        <div className="form-row" style={{ margin: 0 }}>
          <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 150 }} />
        </div>
        <button className="btn solid" onClick={aplicarFiltro}>Filtrar</button>
        <button className="btn" onClick={limpiarFiltro}>Limpiar</button>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="stat-label">Ventas totales</div><div className="stat-val">{fmt(resumen?.totalVentas)}</div></div>
        <div className="stat-card"><div className="stat-label">Costo de insumos vendidos</div><div className="stat-val">{fmt(resumen?.totalCostoVenta)}</div></div>
        <div className="stat-card"><div className="stat-label">Ganancia bruta</div><div className="stat-val green">{fmt(resumen?.gananciaBruta)}</div></div>
      </div>
      <div className="stats">
        <div className="stat-card"><div className="stat-label">Compras totales</div><div className="stat-val">{fmt(resumen?.totalCompras)}</div></div>
        <div className="stat-card"><div className="stat-label">Ganancia neta (ventas - compras)</div><div className={`stat-val${resumen?.gananciaNeta < 0 ? ' red' : ' green'}`}>{fmt(resumen?.gananciaNeta)}</div></div>
        <div className="stat-card"><div className="stat-label">Cantidad de ventas</div><div className="stat-val">{resumen?.cantidadVentas ?? 0}</div></div>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="section-label" style={{ margin: '0 0 12px' }}>Ventas y ganancia por feria</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => fmt(v)}
              />
              <Bar dataKey="Ventas" fill="var(--blue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ganancia" fill="var(--green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="section-label">Resumen por feria</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Feria</th><th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Ventas</th>
                <th style={{ textAlign: 'right' }}>Costo</th>
                <th style={{ textAlign: 'right' }}>Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {(resumen?.porFeria || []).length === 0 ? (
                <tr><td colSpan={5} className="empty">Sin datos en el período.</td></tr>
              ) : resumen.porFeria.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{f.feriaNombre}</td>
                  <td style={{ color: 'var(--muted)' }}>{f.fecha ? fmtFecha(f.fecha) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(f.totalVentas)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{fmt(f.totalCosto)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: f.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(f.ganancia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-label">Productos más vendidos</div>
      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(resumen?.productosMasVendidos || []).length === 0 ? (
                <tr><td colSpan={3} className="empty">Sin datos en el período.</td></tr>
              ) : resumen.productosMasVendidos.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{p.cantidad}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
