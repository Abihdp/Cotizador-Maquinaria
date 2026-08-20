export const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n || 0)

export const fmtFecha = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtFechaHora = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export const calcCostoProducto = (producto) => {
  if (producto.receta?.length) {
    return producto.receta.reduce((s, r) => s + (r.insumo?.costoUnitario || 0) * (r.cantidad || 0), 0)
  }
  return producto.costoManual || 0
}
