import mongoose from 'mongoose'

// Guarda el costo calculado de una máquina en un momento dado
const snapshotSchema = new mongoose.Schema({
  maquina:    { type: mongoose.Schema.Types.ObjectId, ref: 'Maquina', required: true },
  maquinaNombre: { type: String },        // desnormalizado por si se borra la máquina
  motivo:     { type: String, default: 'Actualización de precio' },
  costoTotal: { type: Number, required: true },
  margen:     { type: Number, default: 0 },  // % de ganancia vigente al momento del snapshot
  detalle: {
    materiales:  { type: Number, default: 0 },
    manoObra:    { type: Number, default: 0 },
    consumibles: { type: Number, default: 0 },
    placas:      { type: Number, default: 0 },
    pintura:     { type: Number, default: 0 },
    flete:       { type: Number, default: 0 },
    impuestos:   { type: Number, default: 0 },
    garantia:    { type: Number, default: 0 },
  },
}, { timestamps: true })

export default mongoose.model('SnapshotCosto', snapshotSchema)