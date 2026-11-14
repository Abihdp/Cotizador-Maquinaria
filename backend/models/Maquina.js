import mongoose from 'mongoose'

const componenteSchema = new mongoose.Schema({
  articulo: { type: mongoose.Schema.Types.ObjectId, ref: 'Articulo', required: true },
  cantidad: { type: Number, required: true, min: 0.01 },
}, { _id: false })

const recursoHoraSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  horas:  { type: Number, default: 0, min: 0 },
  tarifa: { type: Number, default: 0, min: 0 },
}, { _id: false })

const maquinaSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  categoria:   { type: String, default: '' },
  margen:      { type: Number, default: 30, min: 0 },
  notas:       { type: String, default: '' },
  imagen:      { type: String, default: '' }, // data URI (base64) de la foto de la máquina
  componentes: [componenteSchema],
  recursosHora: { type: [recursoHoraSchema], default: [] },

  pintar: { type: Boolean, default: true }, // si se pinta, la pintura se calcula con los perfiles

  // Costos varios
  consumibles:       { type: Number, default: 0, min: 0 }, // monto fijo estimado
  pinturaLitros:     { type: Number, default: 0, min: 0 }, // litros usados
  pinturaLitroPrice: { type: Number, default: 0, min: 0 }, // precio/litro al momento de guardar
  placaKg:           { type: Number, default: 0, min: 0 }, // kg de placa
  placaKgPrice:      { type: Number, default: 0, min: 0 }, // precio/kg al momento de guardar

  pctFlete:     { type: Number, default: 0, min: 0 },
  pctImpuestos: { type: Number, default: 0, min: 0 },
  pctGarantia:  { type: Number, default: 0, min: 0 },

  // Opciones de pago — null = usar global, número = sobreescribir
  pagos: {
    efectivo:      { type: Number, default: null },
    transferencia: { type: Number, default: null },
    tarjeta:       { type: Number, default: null },
  },
}, { timestamps: true })

export default mongoose.model('Maquina', maquinaSchema)