import mongoose from 'mongoose'

const insumoSchema = new mongoose.Schema({
  nombre:        { type: String, required: true, trim: true },
  unidad:        { type: String, default: 'kg' },
  stock:         { type: Number, default: 0, min: 0 },
  stockMinimo:   { type: Number, default: 0, min: 0 },
  costoUnitario: { type: Number, default: 0, min: 0 },
  notas:         { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Insumo', insumoSchema)
