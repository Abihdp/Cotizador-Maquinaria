// Cálculo de costos de una máquina, compartido por las rutas del backend.
// La misma lógica está en cotizador-frontend/src/lib/utils.js: si cambiás una, cambiá la otra.
import Config from '../models/Config.js'

export const PINTURA_DEFAULTS = {
  manosPU: 2,
  rendPU: 10,          // m² por litro de PU mezclado, por mano
  manosPrimer: 1,
  rendPrimer: 13.7,    // m² por litro de primer, por mano
  perdida: 52,         // % que se pierde con el soplete (calibrado con el rack)
  partesPintura: 2,
  partesEndurecedor: 1,
  pctDiluyente: 10,
}

// m² de superficie por metro lineal de perfil (perímetro en metros)
export function m2PorMetro(art = {}) {
  const a = Number(art.ancho) || 0
  const b = Number(art.alto)  || 0
  if (art.perfil === 'redondo') return Math.PI * a / 1000
  if (art.perfil === 'rectangular' || art.perfil === 'planchuela') return 2 * (a + b) / 1000
  return 0
}

// Cantidad del componente pasada a metros (los perfiles se cargan en mt / ml; cm por las dudas)
const aMetros = (cantidad, unidad) => (Number(cantidad) || 0) * (unidad === 'cm' ? 0.01 : 1)

const precioLitro = (item) => {
  const precio = Number(item?.articulo?.precio) || 0
  const litros = Number(item?.litros) || 1
  return precio / litros
}

export function calcPintura(maq = {}, pintura = null) {
  const vacio = { m2: 0, puMezcla: 0, pu: 0, endurecedor: 0, diluyente: 0, primer: 0, costoPU: 0, costoPrimer: 0, costo: 0 }
  if (!pintura || maq.pintar === false) return vacio
  const p = { ...PINTURA_DEFAULTS, ...pintura }

  const m2 = (maq.componentes || []).reduce(
    (s, c) => s + m2PorMetro(c.articulo) * aMetros(c.cantidad, c.articulo?.unidad), 0)
  if (!m2) return vacio

  const efic = Math.max(0.01, 1 - (Number(p.perdida) || 0) / 100)
  const pp = Number(p.partesPintura) || 0
  const pe = Number(p.partesEndurecedor) || 0
  const d  = (Number(p.pctDiluyente) || 0) / 100
  const totalPartes = (pp + pe) * (1 + d) || 1

  const puMezcla    = m2 * (Number(p.manosPU) || 0) / (Number(p.rendPU) || 1) / efic
  const pu          = puMezcla * pp / totalPartes
  const endurecedor = puMezcla * pe / totalPartes
  const diluyente   = puMezcla - pu - endurecedor
  const primer      = m2 * (Number(p.manosPrimer) || 0) / (Number(p.rendPrimer) || 1) / efic

  const costoPU     = pu * precioLitro(p.pu) + endurecedor * precioLitro(p.endurecedor) + diluyente * precioLitro(p.diluyente)
  const costoPrimer = primer * precioLitro(p.primer)

  return { m2, puMezcla, pu, endurecedor, diluyente, primer, costoPU, costoPrimer, costo: costoPU + costoPrimer }
}

export function calcCosto(maq, pintura = null) {
  const materiales  = (maq.componentes || []).reduce((s, c) => s + (c.articulo?.precio || 0) * (c.cantidad || 0), 0)
  const manoObra    = (maq.recursosHora || []).reduce((s, r) => s + (r.horas || 0) * (r.tarifa || 0), 0)
  const consumibles = maq.consumibles || 0
  const placas      = (maq.placaKg || 0) * (maq.placaKgPrice || 0)
  const pint        = calcPintura(maq, pintura).costo
  const costoBase   = materiales + manoObra + consumibles + placas + pint
  const flete       = costoBase * ((maq.pctFlete || 0) / 100)
  const subtotal    = costoBase + flete
  const impuestos   = subtotal * ((maq.pctImpuestos || 0) / 100)
  const garantia    = subtotal * ((maq.pctGarantia  || 0) / 100)
  return { materiales, manoObra, consumibles, placas, pintura: pint, flete, impuestos, garantia, total: subtotal + impuestos + garantia }
}

export const detalleSnapshot = (c) => ({
  materiales: c.materiales, manoObra: c.manoObra, consumibles: c.consumibles, placas: c.placas,
  pintura: c.pintura, flete: c.flete, impuestos: c.impuestos, garantia: c.garantia,
})

// Config de pintura con los artículos de pintura cargados (para tener sus precios)
export async function getPinturaConfig() {
  const cfg = await Config.findById('global')
    .populate('pintura.pu.articulo pintura.endurecedor.articulo pintura.diluyente.articulo pintura.primer.articulo')
  return cfg ? (cfg.toObject().pintura || null) : null
}

// Detecta el perfil a partir del nombre del artículo.
// "CAÑO 80X40X1,6" → rectangular 80 x 40 · "CAÑO 1 1/4 (31.75 X 1.59 MM)" → redondo Ø31,75
// "PLANCHUELA 38.1 x 3.2 mm" → planchuela 38,1 x 3,2
const N = '(\\d+(?:[.,]\\d+)?)'
const num = (s) => parseFloat(String(s).replace(',', '.'))
export function detectarPerfil(nombre = '') {
  const n = String(nombre).toUpperCase()
  let m
  if (/PLANCHUELA/.test(n)) {
    m = n.match(new RegExp(`${N}\\s*X\\s*${N}`))
    return m ? { perfil: 'planchuela', ancho: num(m[1]), alto: num(m[2]) } : null
  }
  if (!/CA[ÑN]O|TUBO|PERFIL/.test(n)) return null
  m = n.match(new RegExp(`${N}\\s*X\\s*${N}\\s*X\\s*\\d`))
  if (m) return { perfil: 'rectangular', ancho: num(m[1]), alto: num(m[2]) }
  m = n.match(new RegExp(`\\(\\s*${N}\\s*X\\s*\\d`))
  if (m) return { perfil: 'redondo', ancho: num(m[1]), alto: 0 }
  m = n.match(new RegExp(`${N}\\s*X\\s*${N}`))
  if (m) {
    const a = num(m[1]), b = num(m[2])
    return b <= 5 ? { perfil: 'redondo', ancho: a, alto: 0 } : { perfil: 'rectangular', ancho: a, alto: b }
  }
  return null
}
