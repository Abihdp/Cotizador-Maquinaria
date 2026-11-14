import { Router } from 'express'
import Config from '../models/Config.js'
import { PINTURA_DEFAULTS } from '../lib/costos.js'

const POPULATE_PINTURA = 'pintura.pu.articulo pintura.endurecedor.articulo pintura.diluyente.articulo pintura.primer.articulo'

const limpiarPintura = (p = {}) => {
  const out = {}
  for (const k of Object.keys(PINTURA_DEFAULTS)) {
    const v = Number(p[k])
    out[k] = Number.isFinite(v) && v >= 0 ? v : PINTURA_DEFAULTS[k]
  }
  for (const k of ['pu', 'endurecedor', 'diluyente', 'primer']) {
    const art = p[k]?.articulo
    out[k] = {
      articulo: (art && (art._id || art)) || null,
      litros:   Number(p[k]?.litros) > 0 ? Number(p[k].litros) : 1,
    }
  }
  return out
}

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
  pintura: PINTURA_DEFAULTS,
}

router.get('/', async (req, res) => {
  try {
    let cfg = await Config.findById('global').populate(POPULATE_PINTURA)
    if (!cfg) {
      await Config.create({ _id: 'global', ...DEFAULTS })
      cfg = await Config.findById('global').populate(POPULATE_PINTURA)
    }
    res.json(cfg)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/', async (req, res) => {
  try {
    const { tarifas, precioPlacaKg, pagos, empresa, pintura } = req.body
    const cfg = await Config.findByIdAndUpdate(
      'global',
      {
        tarifas,
        precioPlacaKg:  Number(precioPlacaKg) || 0,
        pagos:   { efectivo: Number(pagos?.efectivo)||0, transferencia: Number(pagos?.transferencia)||0, tarjeta: Number(pagos?.tarjeta)||0 },
        empresa: { nombre: empresa?.nombre || '', logo: empresa?.logo || '' },
        ...(pintura ? { pintura: limpiarPintura(pintura) } : {}),
      },
      { new: true, upsert: true }
    ).populate(POPULATE_PINTURA)
    res.json(cfg)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router