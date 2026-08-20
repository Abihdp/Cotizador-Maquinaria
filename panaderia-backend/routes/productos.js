import { Router } from 'express'
import Producto from '../models/Producto.js'

const router = Router()

function calcCostoEstimado(producto) {
  if (producto.receta?.length) {
    return producto.receta.reduce((s, r) => s + (r.insumo?.costoUnitario || 0) * (r.cantidad || 0), 0)
  }
  return producto.costoManual || 0
}

router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const filter = q ? { nombre: { $regex: q, $options: 'i' } } : {}
    const productos = await Producto.find(filter).populate('receta.insumo').sort({ nombre: 1 })
    const conCosto = productos.map(p => ({ ...p.toObject(), costoEstimado: calcCostoEstimado(p) }))
    res.json(conCosto)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id).populate('receta.insumo')
    if (!producto) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ...producto.toObject(), costoEstimado: calcCostoEstimado(producto) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const producto = await Producto.create(req.body)
    const populated = await producto.populate('receta.insumo')
    res.status(201).json({ ...populated.toObject(), costoEstimado: calcCostoEstimado(populated) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('receta.insumo')
    if (!producto) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ...producto.toObject(), costoEstimado: calcCostoEstimado(producto) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
