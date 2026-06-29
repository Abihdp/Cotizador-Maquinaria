import mongoose from 'mongoose'

const historialSchema = new mongoose.Schema({
  tipo:            { type: String, enum: ['creado', 'actualizado', 'importado', 'borrado_masivo'], required: true },
  importSessionId: { type: String, default: null },
  esNuevo:         { type: Boolean, default: null },   // solo para tipo 'importado'
  articuloNombre:  { type: String, default: '' },
  articuloCodigo:  { type: String, default: '' },
  cambios:         [{ campo: String, antes: mongoose.Schema.Types.Mixed, despues: mongoose.Schema.Types.Mixed }],
}, { timestamps: true })

export default mongoose.model('ArticuloHistorial', historialSchema)
