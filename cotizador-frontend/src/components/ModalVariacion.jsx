import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { snapshotsApi, maquinasApi } from '../lib/api.js'
import { fmt, calcCostoTotal, calcVenta } from '../lib/utils.js'

function Delta({ actual, anterior }) {
  if (anterior === undefined || anterior === null) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>Sin historial</span>
  const diff  = actual - anterior
  const pct   = anterior > 0 ? (diff / anterior) * 100 : 0
  const subio = diff > 0
  const igual = diff === 0
  const color = igual ? 'var(--muted)' : subio ? '#a0291e' : '#1a6640'
  const Icon  = igual ? Minus : subio ? TrendingUp : TrendingDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>
      <Icon size={13}/>
      {subio ? '+' : ''}{fmt(diff)} ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
    </span>
  )
}

const formatFecha = (d) => new Date(d).toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
})

const formatFechaCorta = (d) => new Date(d).toLocaleDateString('es-AR', {
  day: '2-digit', month: '2-digit', year: '2-digit'
})

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e0d8', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
      <div style={{ color: '#6b6860', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#1a1917', fontWeight: 600 }}>{p.name}:</span>
          <span style={{ fontFamily: 'monospace' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ModalVariacion({ maquinaId, onClose }) {
  const [maquina, setMaquina] = useState(null)
  const [snaps,   setSnaps]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selSnap, setSelSnap] = useState(null)
  const [tab,     setTab]     = useState('grafico')  // 'grafico' | 'detalle'

  useEffect(() => {
    Promise.all([
      maquinasApi.getAll(''),
      snapshotsApi.deMaquina(maquinaId),
    ]).then(([maqList, snapList]) => {
      const maq  = (Array.isArray(maqList) ? maqList : []).find(m => m._id === maquinaId)
      const snps = Array.isArray(snapList) ? [...snapList].reverse() : []  // cronológico para el gráfico
      setMaquina(maq || null)
      setSnaps(snps)
      if (snps.length > 0) setSelSnap(snps[snps.length - 1])  // más reciente para comparar
    }).finally(() => setLoading(false))
  }, [maquinaId])

  const costoActual = maquina ? calcCostoTotal(maquina).total : 0
  const ventaActual = maquina ? calcVenta(costoActual, maquina.margen) : 0

  // Datos para el gráfico: todos los snapshots + punto actual
  const datosGrafico = [
    ...snaps.map(s => ({
      fecha:  formatFechaCorta(s.createdAt),
      fechaFull: formatFecha(s.createdAt),
      Costo:  Math.round(s.costoTotal),
      Venta:  Math.round(s.costoTotal * (1 + (s.margen || 0) / 100)),
      motivo: s.motivo,
    })),
    ...(maquina ? [{
      fecha:  'Hoy',
      fechaFull: 'Precio actual',
      Costo:  Math.round(costoActual),
      Venta:  Math.round(ventaActual),
      motivo: 'Precio vigente',
    }] : [])
  ]

  const minVal = datosGrafico.length ? Math.min(...datosGrafico.map(d => d.Costo)) * 0.92 : 0
  const maxVal = datosGrafico.length ? Math.max(...datosGrafico.map(d => d.Venta)) * 1.08 : 0

  const tabStyle = (t) => ({
    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
    background: tab === t ? '#1a1917' : 'transparent',
    color:      tab === t ? '#fff'    : '#6b6860',
    fontFamily: 'var(--font)',
    transition: 'all .15s',
  })

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <span className="modal-title">Variación de costos — {maquina?.nombre || '...'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div> : (
          <>
            {/* KPIs superiores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Costo actual</div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>{fmt(costoActual)}</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Precio de venta</div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: '#1a6640' }}>{fmt(ventaActual)}</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Variación total</div>
                <div style={{ paddingTop: 2 }}>
                  <Delta actual={costoActual} anterior={snaps[0]?.costoTotal} />
                </div>
              </div>
            </div>

            {snaps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                Todavía no hay historial. Se genera automáticamente cuando actualizás el precio de un artículo usado en esta máquina.
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--bg)', padding: 4, borderRadius: 8, width: 'fit-content' }}>
                  <button style={tabStyle('grafico')} onClick={() => setTab('grafico')}>Gráfico</button>
                  <button style={tabStyle('detalle')} onClick={() => setTab('detalle')}>Detalle</button>
                </div>

                {/* ── GRÁFICO ── */}
                {tab === 'grafico' && (
                  <div style={{ marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={datosGrafico} margin={{ top: 8, right: 12, left: 12, bottom: 4 }}>
                        <defs>
                          <linearGradient id="gradCosto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#1a1917" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#1a1917" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradVenta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#1a6640" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#1a6640" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e0d8" vertical={false} />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#6b6860' }} axisLine={false} tickLine={false} />
                        <YAxis
                          domain={[minVal, maxVal]}
                          tickFormatter={v => '$' + (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v)}
                          tick={{ fontSize: 11, fill: '#6b6860' }} axisLine={false} tickLine={false} width={60}
                        />
                        <Tooltip content={<TooltipGrafico />} />
                        <Area type="monotone" dataKey="Costo" stroke="#1a1917" strokeWidth={2} fill="url(#gradCosto)" dot={{ r: 4, fill: '#1a1917', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        <Area type="monotone" dataKey="Venta" stroke="#1a6640" strokeWidth={2} fill="url(#gradVenta)" dot={{ r: 4, fill: '#1a6640', strokeWidth: 0 }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
                      {[{ color: '#1a1917', label: 'Costo total' }, { color: '#1a6640', label: 'Precio de venta', dash: true }].map(({ color, label, dash }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b6860' }}>
                          <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth={2} strokeDasharray={dash ? '4 2' : 'none'}/></svg>
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Timeline de motivos */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Historial de cambios</div>
                      <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {[...datosGrafico].reverse().map((d, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < datosGrafico.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#1a1917' : '#c8c5bb', marginTop: 4, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 400 }}>{d.motivo}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.fechaFull} — Costo: {fmt(d.Costo)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DETALLE ── */}
                {tab === 'detalle' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Comparar con:</label>
                      <select className="input" value={selSnap?._id || ''} onChange={e => setSelSnap(snaps.find(s => s._id === e.target.value))}>
                        {[...snaps].reverse().map(s => (
                          <option key={s._id} value={s._id}>
                            {formatFecha(s.createdAt)} — {fmt(s.costoTotal)} — {s.motivo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selSnap && maquina && (() => {
                      const cA = calcCostoTotal(maquina)
                      const rubros = [
                        { label: 'Materiales',   actual: cA.materiales,  anterior: selSnap.detalle?.materiales  },
                        { label: 'Mano de obra', actual: cA.manoObra,    anterior: selSnap.detalle?.manoObra    },
                        { label: 'Consumibles',  actual: cA.consumibles, anterior: selSnap.detalle?.consumibles },
                        { label: 'Placas',       actual: cA.placas,      anterior: selSnap.detalle?.placas      },
                        { label: 'Flete',        actual: cA.flete,       anterior: selSnap.detalle?.flete       },
                        { label: 'Impuestos',    actual: cA.impuestos,   anterior: selSnap.detalle?.impuestos   },
                        { label: 'Garantía',     actual: cA.garantia,    anterior: selSnap.detalle?.garantia    },
                      ].filter(r => r.actual > 0 || r.anterior > 0)
                      return (
                        <>
                          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 14 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead><tr style={{ background: 'var(--bg)' }}>
                                {['Rubro', 'Anterior', 'Actual', 'Variación'].map((h, i) => (
                                  <th key={h} style={{ padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 500, fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {rubros.map((r, i) => (
                                  <tr key={r.label} style={{ borderBottom: i < rubros.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <td style={{ padding: '7px 12px', fontWeight: 500 }}>{r.label}</td>
                                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{fmt(r.anterior)}</td>
                                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{fmt(r.actual)}</td>
                                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><Delta actual={r.actual} anterior={r.anterior}/></td>
                                  </tr>
                                ))}
                                <tr style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>Total</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(selSnap.costoTotal)}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(costoActual)}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right' }}><Delta actual={costoActual} anterior={selSnap.costoTotal}/></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </>
        )}

        <div className="form-actions">
          <button className="btn solid" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
