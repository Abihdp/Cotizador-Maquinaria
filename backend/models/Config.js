import mongoose from 'mongoose'

const configSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  tarifas: [{
    nombre: { type: String, required: true },
    tarifa: { type: Number, default: 0, min: 0 },
  }],
  precioPlacaKg: { type: Number, default: 0, min: 0 },

  // Pintura: los precios salen de los artículos elegidos (se editan en Artículos).
  // litros = cuántos litros trae una unidad del artículo (precio por litro = precio / litros).
  pintura: {
    manosPU:           { type: Number, default: 2 },
    rendPU:            { type: Number, default: 10 },   // m²/L por mano (PU mezclado)
    manosPrimer:       { type: Number, default: 1 },
    rendPrimer:        { type: Number, default: 13.7 }, // m²/L por mano
    perdida:           { type: Number, default: 52 },   // % que se pierde con soplete
    partesPintura:     { type: Number, default: 2 },
    partesEndurecedor: { type: Number, default: 1 },
    pctDiluyente:      { type: Number, default: 10 },
    pu:          { articulo: { type: mongoose.Schema.Types.ObjectId, ref: 'Articulo', default: null }, litros: { type: Number, default: 1 } },
    endurecedor: { articulo: { type: mongoose.Schema.Types.ObjectId, ref: 'Articulo', default: null }, litros: { type: Number, default: 1 } },
    diluyente:   { articulo: { type: mongoose.Schema.Types.ObjectId, ref: 'Articulo', default: null }, litros: { type: Number, default: 1 } },
    primer:      { articulo: { type: mongoose.Schema.Types.ObjectId, ref: 'Articulo', default: null }, litros: { type: Number, default: 1 } },
  },

  // Opciones de pago globales
  pagos: {
    efectivo:      { type: Number, default: 0  },  // % recargo
    transferencia: { type: Number, default: 0  },
    tarjeta:       { type: Number, default: 15 },
  },

  // Empresa (para PDF)
  empresa: {
    nombre: { type: String, default: '' },
    logo:   { type: String, default: '' },  // base64 o URL
  },
}, { timestamps: true })

export default mongoose.model('Config', configSchema)