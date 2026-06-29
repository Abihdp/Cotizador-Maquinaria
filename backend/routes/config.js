import { Router } from 'express'
import Config from '../models/Config.js'

const router = Router()

const DEFAULTS = {
  tarifas: [
    { nombre: 'Soldador',             tarifa: 0 },
    { nombre: 'Ayudante de soldador', tarifa: 0 },
    { nombre: 'Pintor / preparador',  tarifa: 0 },
    { nombre: 'Amoladora / corte',    tarifa: 0 },
    { nombre: 'Compresor',            tarifa: 0 },
  ],
  precioPlacaKg: 0,
  pagos: { efectivo: 0, transferencia: 0, tarjeta: 15 },
  empresa: { nombre: '', logo: '' },
}

router.get('/', async (req, res) => {
  try {
    let cfg = await Config.findById('global')
    if (!cfg) cfg = await Config.create({ _id: 'global', ...DEFAULTS })
    res.json(cfg)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/', async (req, res) => {
  try {
    const { tarifas, precioPlacaKg, pagos, empresa } = req.body
    const cfg = await Config.findByIdAndUpdate(
      'global',
      {
        tarifas,
        precioPlacaKg:  Number(precioPlacaKg) || 0,
        pagos:   { efectivo: Number(pagos?.efectivo)||0, transferencia: Number(pagos?.transferencia)||0, tarjeta: Number(pagos?.tarjeta)||0 },
        empresa: { nombre: empresa?.nombre || '', logo: empresa?.logo || '' },
      },
      { new: true, upsert: true }
    )
    res.json(cfg)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router