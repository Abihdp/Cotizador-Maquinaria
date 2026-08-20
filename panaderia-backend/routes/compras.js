import { Router } from 'express'
import Compra from '../models/Compra.js'
import Insumo from '../models/Insumo.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const filter = {}
    if (desde || hasta) {
      filter.fecha = {}
      if (desde) filter.fecha.$gte = new Date(desde)
      if (hasta) filter.fecha.$lte = new Date(hasta)
    }
    res.json(await Compra.find(filter).sort({ fecha: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { tipo, insumo: insumoId, cantidad, costoTotal, concepto, proveedor, fecha, notas } = req.body

    if (tipo === 'insumo') {
      if (!insumoId || !(cantidad > 0)) return res.status(400).json({ error: 'Falta insumo o cantidad inválida.' })
      const insumo = await Insumo.findById(insumoId)
      if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado.' })

      const stockAnterior = insumo.stock || 0
      const costoAnterior = insumo.costoUnitario || 0
      const nuevoStock = stockAnterior + Number(cantidad)
      const nuevoCosto = nuevoStock > 0
        ? (stockAnterior * costoAnterior + Number(costoTotal)) / nuevoStock
        : costoAnterior

      insumo.stock = nuevoStock
      insumo.costoUnitario = nuevoCosto
      await insumo.save()

      const compra = await Compra.create({
        tipo: 'insumo', insumo: insumo._id, insumoNombre: insumo.nombre,
        cantidad, costoTotal, proveedor, fecha, notas,
      })
      return res.status(201).json(compra)
    }

    if (tipo === 'gasto') {
      if (!concepto?.trim()) return res.status(400).json({ error: 'Falta el concepto del gasto.' })
      const compra = await Compra.create({ tipo: 'gasto', concepto, costoTotal, proveedor, fecha, notas })
      return res.status(201).json(compra)
    }

    res.status(400).json({ error: 'Tipo de compra inválido.' })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const compra = await Compra.findById(req.params.id)
    if (!compra) return res.status(404).json({ error: 'No encontrada' })

    if (compra.tipo === 'insumo' && compra.insumo) {
      const insumo = await Insumo.findById(compra.insumo)
      if (insumo) {
        insumo.stock = Math.max(0, (insumo.stock || 0) - compra.cantidad)
        await insumo.save()
      }
    }

    await compra.deleteOne()
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
