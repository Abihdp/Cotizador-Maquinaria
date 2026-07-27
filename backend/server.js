import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import articulosRouter from './routes/articulos.js'
import maquinasRouter from './routes/maquinas.js'
import configRouter from './routes/config.js'
import snapshotsRouter from './routes/snapshots.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' })) // las máquinas pueden incluir foto en base64

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => { console.error('❌ Error MongoDB:', err); process.exit(1) })

app.use('/api/articulos', articulosRouter)
app.use('/api/maquinas', maquinasRouter)
app.use('/api/config', configRouter)
app.use('/api/snapshots', snapshotsRouter)

app.get('/api/health', (_, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`🚀 Backend corriendo en http://localhost:${PORT}`))