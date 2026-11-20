import mongoose from 'mongoose'

const articuloSchema = new mongoose.Schema({
  codigo:    { type: String, default: '' },          // código interno
  codigoSistema: { type: String, default: '' },      // código del sistema de la empresa
  nombre:    { type: String, required: true, trim: true },
  categoria: { type: String, default: '' },
  precio:    { type: Number, required: true, min: 0 },
  unidad:    { type: String, default: 'unidad' },
  // Caños y perfiles: se carga el precio de la barra completa y el sistema
  // calcula el precio por metro (precio = precioBarra / largoBarra).
  precioBarra: { type: Number, default: null, min: 0 },
  largoBarra:  { type: Number, default: 6, min: 0.01 },
  // Perfil para calcular la superficie a pintar ('' = no se pinta).
  // ancho = lado mayor o diámetro (mm); alto = lado menor o espesor de la planchuela (mm).
  perfil: { type: String, enum: ['', 'rectangular', 'redondo', 'planchuela'], default: '' },
  ancho:  { type: Number, default: 0, min: 0 },
  alto:   { type: Number, default: 0, min: 0 },
  notas:     { type: String, default: '' },
  imagen:    { type: String, default: '' }, // data URI (base64) de la foto del artículo
}, { timestamps: true })

export default mongoose.model('Articulo', articuloSchema)
