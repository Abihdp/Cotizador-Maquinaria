import { Router } from 'express'
import Feria from '../models/Feria.js'
import Venta from '../models/Venta.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    res.json(await Feria.find().sort({ fecha: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const feria = await Feria.findById(req.params.id)
    if (!feria) return res.status(404).json({ error: 'No encontrada' })
    res.json(feria)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await Feria.create(req.body))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const feria = await Feria.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!feria) return res.status(404).json({ error: 'No encontrada' })
    res.json(feria)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const enUso = await Venta.exists({ feria: req.params.id })
    if (enUso) return res.status(400).json({ error: 'No se puede borrar: hay ventas registradas en esta feria.' })
    await Feria.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
