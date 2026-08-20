import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import insumosRouter from './routes/insumos.js'
import comprasRouter from './routes/compras.js'
import productosRouter from './routes/productos.js'
import feriasRouter from './routes/ferias.js'
import ventasRouter from './routes/ventas.js'
import reportesRouter from './routes/reportes.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => { console.error('❌ Error MongoDB:', err); process.exit(1) })

app.use('/api/insumos', insumosRouter)
app.use('/api/compras', comprasRouter)
app.use('/api/productos', productosRouter)
app.use('/api/ferias', feriasRouter)
app.use('/api/ventas', ventasRouter)
app.use('/api/reportes', reportesRouter)

app.get('/api/health', (_, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4001
app.listen(PORT, () => console.log(`🥖 Backend panadería corriendo en http://localhost:${PORT}`))
