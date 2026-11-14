export const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n || 0)
 
export const calcMateriales = (componentes = []) =>
  componentes.reduce((s, c) => s + (c.articulo?.precio || 0) * (c.cantidad || 0), 0)
 
export const calcManoObra = (recursosHora = []) =>
  recursosHora.reduce((s, r) => s + (Number(r.horas) || 0) * (Number(r.tarifa) || 0), 0)
 
// ─── Pintura ────────────────────────────────────────────────────────────────
// Misma lógica que backend/lib/costos.js: si cambiás una, cambiá la otra.
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


// Config de pintura vigente (la carga la página de Máquinas y la actualiza Configuración)
let PINTURA_CFG = null
export const setPinturaConfig = (p) => { PINTURA_CFG = p || null }
export const getPinturaConfigActual = () => PINTURA_CFG
export const precioLitroPintura = precioLitro

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

export const calcCostoTotal = (maq, pintura = PINTURA_CFG) => {
  const materiales  = calcMateriales(maq.componentes)
  const manoObra    = calcManoObra(maq.recursosHora)
  const consumibles = Number(maq.consumibles)       || 0
  const placas      = (Number(maq.placaKg)          || 0) * (Number(maq.placaKgPrice) || 0)
  const pint        = calcPintura(maq, pintura)
  const pintura_    = pint.costo
  const pctFlete    = Number(maq.pctFlete)          || 0
  const pctImp      = Number(maq.pctImpuestos)      || 0
  const pctGar      = Number(maq.pctGarantia)       || 0

  const costoBase = materiales + manoObra + consumibles + placas + pintura_
  const flete     = costoBase * (pctFlete / 100)
  const subtotal  = costoBase + flete
  const impuestos = subtotal * (pctImp / 100)
  const garantia  = subtotal * (pctGar  / 100)
  const total     = subtotal + impuestos + garantia
 
  return { materiales, manoObra, consumibles, placas, pintura: pintura_, pinturaDetalle: pint, flete, subtotal, impuestos, garantia, total }
}
 
export const calcVenta = (total, margen) => total * (1 + (Number(margen) || 0) / 100)
 
export const calcCosto = (componentes = []) => calcMateriales(componentes)

// Redimensiona una imagen en el navegador y la devuelve como data URI (JPEG),
// para no guardar fotos de varios MB en la base de datos.
export const resizeImageToDataUrl = (file, maxDim = 900, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })