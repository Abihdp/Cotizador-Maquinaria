import mongoose from 'mongoose'

const compraSchema = new mongoose.Schema({
  tipo:          { type: String, enum: ['insumo', 'gasto'], required: true },
  insumo:        { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo' },
  insumoNombre:  { type: String, default: '' },
  cantidad:      { type: Number, min: 0 },
  concepto:      { type: String, default: '' },
  costoTotal:    { type: Number, required: true, min: 0 },
  proveedor:     { type: String, default: '' },
  fecha:         { type: Date, default: Date.now },
  notas:         { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Compra', compraSchema)
