import mongoose from 'mongoose'

const feriaSchema = new mongoose.Schema({
  nombre:  { type: String, required: true, trim: true },
  lugar:   { type: String, default: '' },
  fecha:   { type: Date, required: true },
  notas:   { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Feria', feriaSchema)
