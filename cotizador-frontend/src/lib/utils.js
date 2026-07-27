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