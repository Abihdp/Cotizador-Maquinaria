import { Router } from 'express'
import multer from 'multer'
import XLSX from 'xlsx'
import Articulo from '../models/Articulo.js'
import Maquina from '../models/Maquina.js'
import SnapshotCosto from '../models/SnapshotCosto.js'
import ArticuloHistorial from '../models/ArticuloHistorial.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const CAMPOS_DIFF = ['codigo', 'nombre', 'categoria', 'precio', 'unidad', 'notas']

function calcDiff(anterior, siguiente) {
  return CAMPOS_DIFF
    .filter(c => siguiente[c] !== undefined && String(anterior[c] ?? '') !== String(siguiente[c] ?? ''))
    .map(c => ({ campo: c, antes: anterior[c], despues: siguiente[c] }))
}

function genSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Cálculo de costo de máquina ────────────────────────────────────────────
function calcCosto(maq) {
  const materiales  = (maq.componentes || []).reduce((s, c) => s + (c.articulo?.precio || 0) * (c.cantidad || 0), 0)
  const manoObra    = (maq.recursosHora || []).reduce((s, r) => s + (r.horas || 0) * (r.tarifa || 0), 0)
  const consumibles = maq.consumibles || 0
  const placas      = (maq.placaKg || 0) * (maq.placaKgPrice || 0)
  const flete       = maq.flete || 0
  const subtotal    = materiales + manoObra + consumibles + placas + flete
  const impuestos   = subtotal * ((maq.pctImpuestos || 0) / 100)
  const garantia    = subtotal * ((maq.pctGarantia  || 0) / 100)
  return { materiales, manoObra, consumibles, placas, flete, impuestos, garantia, total: subtotal + impuestos + garantia }
}

async function snapshotMaquinasDeArticulo(articuloId, motivo) {
  try {
    const maquinas = await Maquina.find({ 'componentes.articulo': articuloId }).populate('componentes.articulo')
    for (const maq of maquinas) {
      const c = calcCosto(maq)
      await SnapshotCosto.create({
        maquina: maq._id, maquinaNombre: maq.nombre, motivo,
        costoTotal: c.total,
        margen: maq.margen || 0,
        detalle: { materiales: c.materiales, manoObra: c.manoObra, consumibles: c.consumibles, placas: c.placas, flete: c.flete, impuestos: c.impuestos, garantia: c.garantia },
      })
    }
  } catch (e) {
    console.error('Error al crear snapshots:', e.message)
  }
}

// ─── Leer metadatos del Excel (hojas y cantidad de filas) ───────────────────
function readExcelMeta(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheets = wb.SheetNames.map((name, index) => {
    const ws  = wb.Sheets[name]
    const ref = ws['!ref']
    const rowCount = ref ? XLSX.utils.decode_range(ref).e.r + 1 : 0
    return { name, index, rowCount }
  })
  return { sheets }
}

// ─── Parsear Excel → filas validadas (sin tocar DB) ─────────────────────────
// opts: { sheetIndex=0, startRow=2, endRow=null }  (filas en base 1)
function parseExcelBuffer(buffer, opts = {}) {
  const sheetIndex = Number.isFinite(+opts.sheetIndex) && +opts.sheetIndex >= 0 ? +opts.sheetIndex : 0
  const startRow   = +opts.startRow > 0 ? +opts.startRow : 2   // 1-based, default: fila 2
  const endRow     = +opts.endRow   > 0 ? +opts.endRow   : null // 1-based, inclusivo

  const wb        = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[sheetIndex] ?? wb.SheetNames[0]
  const ws        = wb.Sheets[sheetName]
  if (!ws) return { filas: [], errores: [`La hoja índice ${sheetIndex} no existe.`], advertencias: [], total: 0 }

  const rows     = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const startIdx = startRow - 1                                      // convertir a 0-based
  const endIdx   = endRow ? Math.min(endRow, rows.length) : rows.length

  if (startIdx >= rows.length)
    return { filas: [], errores: [], advertencias: [`La fila de inicio (${startRow}) supera el total de filas del archivo (${rows.length}).`], total: 0 }

  const filas = [], errores = [], advertencias = []

  for (let i = startIdx; i < endIdx; i++) {
    const excelRow = i + 1   // número de fila real en el Excel (1-based)
    const row = rows[i]
    if (!row || row.every(c => c === undefined || c === null || c === '')) continue

    const [codigo, nombre, categoria, precioRaw, unidad, notas] = row

    if (!nombre || String(nombre).trim() === '') {
      errores.push(`Fila ${excelRow}: falta el nombre del artículo.`)
      continue
    }
    if (precioRaw === undefined || precioRaw === null || precioRaw === '') {
      errores.push(`Fila ${excelRow} ("${nombre}"): falta el precio.`)
      continue
    }
    const precio = parseFloat(String(precioRaw).replace(',', '.'))
    if (isNaN(precio) || precio < 0) {
      errores.push(`Fila ${excelRow} ("${nombre}"): precio inválido — "${precioRaw}".`)
      continue
    }
    if (!categoria || String(categoria).trim() === '')
      advertencias.push(`Fila ${excelRow} ("${nombre}"): sin categoría, se dejará en blanco.`)
    if (!unidad || String(unidad).trim() === '')
      advertencias.push(`Fila ${excelRow} ("${nombre}"): sin unidad, se usará "unidad" por defecto.`)

    filas.push({
      codigo:    codigo    ? String(codigo).trim()    : '',
      nombre:    String(nombre).trim(),
      categoria: categoria ? String(categoria).trim() : '',
      precio,
      unidad:    unidad    ? String(unidad).trim()    : 'unidad',
      notas:     notas     ? String(notas).trim()     : '',
    })
  }

  return { filas, errores, advertencias, total: endIdx - startIdx }
}

// ════════════════════════════════════════════════════════════════════════════
// RUTAS — el orden importa: rutas concretas antes de /:id
// ════════════════════════════════════════════════════════════════════════════

// GET all
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const filter = q
      ? { $or: [
          { nombre:    { $regex: q, $options: 'i' } },
          { codigo:    { $regex: q, $options: 'i' } },
          { categoria: { $regex: q, $options: 'i' } },
        ]}
      : {}
    res.json(await Articulo.find(filter).sort({ nombre: 1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET historial
router.get('/historial', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200
    const entries = await ArticuloHistorial.find().sort({ createdAt: -1 }).limit(limit)
    res.json(entries)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET exportar Excel
router.get('/export/excel', async (req, res) => {
  try {
    const articulos = await Articulo.find().sort({ nombre: 1 })
    const data = [
      ['Código', 'Nombre', 'Categoría', 'Precio', 'Unidad', 'Notas'],
      ...articulos.map(a => [a.codigo, a.nombre, a.categoria, a.precio, a.unidad, a.notas])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Artículos')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename=articulos.xlsx')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST metadatos del archivo (hojas disponibles y cantidad de filas)
router.post('/import/meta', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' })
    res.json(readExcelMeta(req.file.buffer))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST preview de importación — parsea sin escribir en DB
router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' })

    const opts = { sheetIndex: req.body.sheetIndex, startRow: req.body.startRow, endRow: req.body.endRow }
    const { filas, errores, advertencias, total } = parseExcelBuffer(req.file.buffer, opts)

    const nuevos = [], actualizados = []

    for (const f of filas) {
      const filter = f.codigo
        ? { $or: [{ codigo: f.codigo }, { nombre: f.nombre }] }
        : { nombre: f.nombre }
      const existing = await Articulo.findOne(filter)
      if (existing) {
        const cambios = calcDiff(existing, f)
        actualizados.push({ ...f, cambios, _id: existing._id })
      } else {
        nuevos.push(f)
      }
    }

    res.json({ nuevos, actualizados, errores, advertencias, total })
  } catch (e) { res.status(500).json({ error: `Error al leer el archivo: ${e.message}` }) }
})

// POST importar Excel (commit)
router.post('/import/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' })

    const opts = { sheetIndex: req.body.sheetIndex, startRow: req.body.startRow, endRow: req.body.endRow }
    const { filas, errores, advertencias, total } = parseExcelBuffer(req.file.buffer, opts)
    let added = 0, updated = 0
    const sessionId = genSessionId()
    const histEntries = []

    for (const f of filas) {
      const filter = f.codigo
        ? { $or: [{ codigo: f.codigo }, { nombre: f.nombre }] }
        : { nombre: f.nombre }
      try {
        const before = await Articulo.findOne(filter)
        await Articulo.findOneAndUpdate(filter, f, { upsert: true, new: true, setDefaultsOnInsert: true })
        const esNuevo = !before
        histEntries.push({
          tipo: 'importado', importSessionId: sessionId, esNuevo,
          articuloNombre: f.nombre, articuloCodigo: f.codigo,
          cambios: before ? calcDiff(before, f) : [],
        })
        esNuevo ? added++ : updated++
      } catch (dbErr) {
        errores.push(`"${f.nombre}": error al guardar — ${dbErr.message}`)
      }
    }

    if (histEntries.length) await ArticuloHistorial.insertMany(histEntries)

    res.json({ added, updated, errors: errores, warnings: advertencias, total, sessionId })
  } catch (e) { res.status(500).json({ error: `Error al leer el archivo: ${e.message}` }) }
})

// GET one
router.get('/:id', async (req, res) => {
  try {
    const art = await Articulo.findById(req.params.id)
    if (!art) return res.status(404).json({ error: 'No encontrado' })
    res.json(art)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const art = await Articulo.create(req.body)
    await ArticuloHistorial.create({
      tipo: 'creado',
      articuloNombre: art.nombre,
      articuloCodigo: art.codigo || '',
      cambios: [],
    })
    res.status(201).json(art)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const anterior = await Articulo.findById(req.params.id)
    const art = await Articulo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!art) return res.status(404).json({ error: 'No encontrado' })

    const cambios = anterior ? calcDiff(anterior.toObject(), req.body) : []
    await ArticuloHistorial.create({
      tipo: 'actualizado',
      articuloNombre: art.nombre,
      articuloCodigo: art.codigo || '',
      cambios,
    })

    if (anterior && anterior.precio !== art.precio) {
      const motivo = `Precio de "${art.nombre}" cambió de $${anterior.precio} a $${art.precio}`
      snapshotMaquinasDeArticulo(art._id, motivo)
    }

    res.json(art)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// DELETE historial por sesión de importación
router.delete('/historial/session/:sid', async (req, res) => {
  try {
    const result = await ArticuloHistorial.deleteMany({ importSessionId: req.params.sid })
    res.json({ ok: true, deleted: result.deletedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE una entrada del historial
router.delete('/historial/:id', async (req, res) => {
  try {
    await ArticuloHistorial.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE todos los artículos
router.delete('/all', async (req, res) => {
  try {
    const result = await Articulo.deleteMany({})
    await ArticuloHistorial.create({
      tipo: 'borrado_masivo',
      articuloNombre: `${result.deletedCount} artículo${result.deletedCount !== 1 ? 's' : ''}`,
      articuloCodigo: '',
      cambios: [],
    })
    res.json({ ok: true, deleted: result.deletedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE artículo
router.delete('/:id', async (req, res) => {
  try {
    await Articulo.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
