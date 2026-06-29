export const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n || 0)
 
export const calcMateriales = (componentes = []) =>
  componentes.reduce((s, c) => s + (c.articulo?.precio || 0) * (c.cantidad || 0), 0)
 
export const calcManoObra = (recursosHora = []) =>
  recursosHora.reduce((s, r) => s + (Number(r.horas) || 0) * (Number(r.tarifa) || 0), 0)
 
export const calcCostoTotal = (maq) => {
  const materiales  = calcMateriales(maq.componentes)
  const manoObra    = calcManoObra(maq.recursosHora)
  const consumibles = Number(maq.consumibles)       || 0
  const placas      = (Number(maq.placaKg)          || 0) * (Number(maq.placaKgPrice) || 0)
  const flete       = Number(maq.flete)             || 0
  const pctImp      = Number(maq.pctImpuestos)      || 0
  const pctGar      = Number(maq.pctGarantia)       || 0
 
  const subtotal  = materiales + manoObra + consumibles + placas + flete
  const impuestos = subtotal * (pctImp / 100)
  const garantia  = subtotal * (pctGar  / 100)
  const total     = subtotal + impuestos + garantia
 
  return { materiales, manoObra, consumibles, placas, flete, subtotal, impuestos, garantia, total }
}
 
export const calcVenta = (total, margen) => total * (1 + (Number(margen) || 0) / 100)
 
export const calcCosto = (componentes = []) => calcMateriales(componentes)