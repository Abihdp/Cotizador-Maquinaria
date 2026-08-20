import mongoose from 'mongoose'

const ventaItemSchema = new mongoose.Schema({
  producto:      { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre:        { type: String, required: true },
  cantidad:      { type: Number, required: true, min: 0 },
  precioUnitario: { type: Number, required: true, min: 0 },
  costoUnitario:  { type: Number, default: 0, min: 0 },
}, { _id: false })

const ventaSchema = new mongoose.Schema({
  feria:      { type: mongoose.Schema.Types.ObjectId, ref: 'Feria', default: null },
  fecha:      { type: Date, default: Date.now },
  items:      { type: [ventaItemSchema], default: [] },
  total:      { type: Number, default: 0, min: 0 },
  costoTotal: { type: Number, default: 0, min: 0 },
  ganancia:   { type: Number, default: 0 },
  notas:      { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Venta', ventaSchema)
