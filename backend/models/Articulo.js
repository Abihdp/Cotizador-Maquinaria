import mongoose from 'mongoose'

const articuloSchema = new mongoose.Schema({
  codigo:    { type: String, default: '' },
  nombre:    { type: String, required: true, trim: true },
  categoria: { type: String, default: '' },
  precio:    { type: Number, required: true, min: 0 },
  unidad:    { type: String, default: 'unidad' },
  // Caños y perfiles: se carga el precio de la barra completa y el sistema
  // calcula el precio por metro (precio = precioBarra / largoBarra).
  precioBarra: { type: Number, default: null, min: 0 },
  largoBarra:  { type: Number, default: 6, min: 0.01 },
  notas:     { type: String, default: '' },
  imagen:    { type: String, default: '' }, // data URI (base64) de la foto del artículo
}, { timestamps: true })

export default mongoose.model('Articulo', articuloSchema)
