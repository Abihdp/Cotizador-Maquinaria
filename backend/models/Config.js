import mongoose from 'mongoose'

const configSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  tarifas: [{
    nombre: { type: String, required: true },
    tarifa: { type: Number, default: 0, min: 0 },
  }],
  precioPlacaKg: { type: Number, default: 0, min: 0 },

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