import { Router } from 'express'
import SnapshotCosto from '../models/SnapshotCosto.js'
import Maquina from '../models/Maquina.js'

const router = Router()

// Función que calcula el costo total de una máquina (igual que el frontend)
function calcCosto(maq) {
  const materiales  = (maq.componentes || []).reduce((s, c) => s + (c.articulo?.precio || 0) * (c.cantidad || 0), 0)
  const manoObra    = (maq.recursosHora || []).reduce((s, r) => s + (r.horas || 0) * (r.tarifa || 0), 0)
  const consumibles = maq.consumibles || 0
  const placas      = (maq.placaKg || 0) * (maq.placaKgPrice || 0)
  const costoBase   = materiales + manoObra + consumibles + placas
  const flete       = costoBase * ((maq.pctFlete || 0) / 100)
  const subtotal    = costoBase + flete
  const impuestos   = subtotal * ((maq.pctImpuestos || 0) / 100)
  const garantia    = subtotal * ((maq.pctGarantia  || 0) / 100)
  return { materiales, manoObra, consumibles, placas, flete, impuestos, garantia, total: subtotal + impuestos + garantia }
}

// POST — crear snapshots de todas las máquinas que usan un artículo específico
// Llamado automáticamente cuando se actualiza el precio de un artículo
router.post('/por-articulo/:articuloId', async (req, res) => {
  try {
    const { articuloId } = req.params
    const { motivo = 'Actualización de precio' } = req.body

    // Buscar todas las máquinas que usan este artículo
    const maquinas = await Maquina.find({
      'componentes.articulo': articuloId
    }).populate('componentes.articulo')

    const creados = []
    for (const maq of maquinas) {
      const c = calcCosto(maq)
      const snap = await SnapshotCosto.create({
        maquina:       maq._id,
        maquinaNombre: maq.nombre,
        motivo,
        costoTotal:    c.total,
        margen:        maq.margen || 0,
        detalle:       { materiales: c.materiales, manoObra: c.manoObra, consumibles: c.consumibles, placas: c.placas, flete: c.flete, impuestos: c.impuestos, garantia: c.garantia },
      })
      creados.push(snap)
    }

    res.json({ creados: creados.length, maquinas: maquinas.map(m => m.nombre) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST — snapshot manual de una máquina específica
router.post('/maquina/:id', async (req, res) => {
  try {
    const maq = await Maquina.findById(req.params.id).populate('componentes.articulo')
    if (!maq) return res.status(404).json({ error: 'Máquina no encontrada' })
    const c = calcCosto(maq)
    const snap = await SnapshotCosto.create({
      maquina:       maq._id,
      maquinaNombre: maq.nombre,
      motivo:        req.body.motivo || 'Snapshot manual',
      costoTotal:    c.total,
      margen:        maq.margen || 0,
      detalle:       { materiales: c.materiales, manoObra: c.manoObra, consumibles: c.consumibles, placas: c.placas, flete: c.flete, impuestos: c.impuestos, garantia: c.garantia },
    })
    res.json(snap)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET — últimos N snapshots de una máquina
router.get('/maquina/:id', async (req, res) => {
  try {
    const snaps = await SnapshotCosto.find({ maquina: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
    res.json(snaps)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET — variación: último snapshot vs anteúltimo de una máquina
router.get('/variacion/:id', async (req, res) => {
  try {
    const snaps = await SnapshotCosto.find({ maquina: req.params.id })
      .sort({ createdAt: -1 })
      .limit(2)
    res.json(snaps)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router