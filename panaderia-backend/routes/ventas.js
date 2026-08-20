import { Router } from 'express'
import Venta from '../models/Venta.js'
import Producto from '../models/Producto.js'
import Insumo from '../models/Insumo.js'

const router = Router()

function costoDeProducto(producto) {
  if (producto.receta?.length) {
    return producto.receta.reduce((s, r) => s + (r.insumo?.costoUnitario || 0) * (r.cantidad || 0), 0)
  }
  return producto.costoManual || 0
}

async function descontarStock(producto, cantidadVendida, signo = -1) {
  if (!producto.receta?.length) return
  for (const r of producto.receta) {
    const insumo = await Insumo.findById(r.insumo?._id || r.insumo)
    if (!insumo) continue
    insumo.stock = Math.max(0, (insumo.stock || 0) + signo * (r.cantidad * cantidadVendida))
    await insumo.save()
  }
}

router.get('/', async (req, res) => {
  try {
    const { feria, desde, hasta } = req.query
    const filter = {}
    if (feria) filter.feria = feria
    if (desde || hasta) {
      filter.fecha = {}
      if (desde) filter.fecha.$gte = new Date(desde)
      if (hasta) filter.fecha.$lte = new Date(hasta)
    }
    res.json(await Venta.find(filter).populate('feria').sort({ fecha: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { feria, fecha, items, notas } = req.body
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'La venta debe tener al menos un producto.' })

    const itemsFinal = []
    for (const it of items) {
      if (!(it.cantidad > 0)) return res.status(400).json({ error: 'Cantidad inválida en un producto.' })
      const producto = await Producto.findById(it.producto).populate('receta.insumo')
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' })

      itemsFinal.push({
        producto: producto._id,
        nombre: producto.nombre,
        cantidad: it.cantidad,
        precioUnitario: producto.precioVenta,
        costoUnitario: costoDeProducto(producto),
      })
      await descontarStock(producto, it.cantidad, -1)
    }

    const total = itemsFinal.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
    const costoTotal = itemsFinal.reduce((s, i) => s + i.costoUnitario * i.cantidad, 0)

    const venta = await Venta.create({
      feria: feria || null, fecha, items: itemsFinal, total, costoTotal,
      ganancia: total - costoTotal, notas,
    })
    const populated = await venta.populate('feria')
    res.status(201).json(populated)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
    if (!venta) return res.status(404).json({ error: 'No encontrada' })

    for (const item of venta.items) {
      const producto = await Producto.findById(item.producto).populate('receta.insumo')
      if (producto) await descontarStock(producto, item.cantidad, 1)
    }

    await venta.deleteOne()
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
