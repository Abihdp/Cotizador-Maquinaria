import mongoose from 'mongoose'

const recetaItemSchema = new mongoose.Schema({
  insumo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true },
  cantidad: { type: Number, required: true, min: 0 },
}, { _id: false })

const productoSchema = new mongoose.Schema({
  nombre:       { type: String, required: true, trim: true },
  categoria:    { type: String, default: '' },
  precioVenta:  { type: Number, required: true, min: 0 },
  unidad:       { type: String, default: 'unidad' },
  receta:       { type: [recetaItemSchema], default: [] },
  costoManual:  { type: Number, default: 0, min: 0 },
  notas:        { type: String, default: '' },
  activo:       { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Producto', productoSchema)
