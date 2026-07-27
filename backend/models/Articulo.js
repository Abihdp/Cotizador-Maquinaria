import mongoose from 'mongoose'

const articuloSchema = new mongoose.Schema({
  codigo:    { type: String, default: '' },
  nombre:    { type: String, required: true, trim: true },
  categoria: { type: String, default: '' },
  precio:    { type: Number, required: true, min: 0 },
  unidad:    { type: String, default: 'unidad' },
  notas:     { type: String, default: '' },
  imagen:    { type: String, default: '' }, // data URI (base64) de la foto del artículo
}, { timestamps: true })

export default mongoose.model('Articulo', articuloSchema)
