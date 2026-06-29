import { Router } from 'express'
import Maquina from '../models/Maquina.js'

const router = Router()

// GET all
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const filter = q
      ? { $or: [
          { nombre:    { $regex: q, $options: 'i' } },
          { categoria: { $regex: q, $options: 'i' } },
        ]}
      : {}
    const maquinas = await Maquina.find(filter)
      .populate('componentes.articulo')
      .sort({ nombre: 1 })
    res.json(maquinas)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET one
router.get('/:id', async (req, res) => {
  try {
    const maq = await Maquina.findById(req.params.id).populate('componentes.articulo')
    if (!maq) return res.status(404).json({ error: 'No encontrada' })
    res.json(maq)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const maq = await Maquina.create(req.body)
    const populated = await maq.populate('componentes.articulo')
    res.status(201).json(populated)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const maq = await Maquina.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('componentes.articulo')
    if (!maq) return res.status(404).json({ error: 'No encontrada' })
    res.json(maq)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Maquina.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
