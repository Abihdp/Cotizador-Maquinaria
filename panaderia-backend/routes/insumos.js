import { Router } from 'express'
import Insumo from '../models/Insumo.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const filter = q ? { nombre: { $regex: q, $options: 'i' } } : {}
    res.json(await Insumo.find(filter).sort({ nombre: 1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const insumo = await Insumo.findById(req.params.id)
    if (!insumo) return res.status(404).json({ error: 'No encontrado' })
    res.json(insumo)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await Insumo.create(req.body))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const insumo = await Insumo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!insumo) return res.status(404).json({ error: 'No encontrado' })
    res.json(insumo)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await Insumo.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
