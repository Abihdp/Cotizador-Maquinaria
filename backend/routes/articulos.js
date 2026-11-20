import { Router } from 'express'
import multer from 'multer'
import XLSX from 'xlsx'
import Articulo from '../models/Articulo.js'
import Maquina from '../models/Maquina.js'
import SnapshotCosto from '../models/SnapshotCosto.js'
import ArticuloHistorial from '../models/ArticuloHistorial.js'
import { calcCosto, detalleSnapshot, getPinturaConfig, detectarPerfil } from '../lib/costos.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const CAMPOS_DIFF = ['codigo', 'codigoSistema', 'nombre', 'categoria', 'precio', 'unidad', 'notas', 'precioBarra', 'largoBarra', 'perfil', 'ancho', 'alto']

// Si el artículo se compra por barra, el precio por metro sale de dividir el
// precio de la barra por su largo (6 m por defecto) y la unidad pasa a "mt".
function aplicarPrecioBarra(data) {
  const precioBarra = Number(data.precioBarra)
  if (data.precioBarra === null || data.precioBarra === '' || data.precioBarra === undefined || !(precioBarra > 0)) {
    if (data.precioBarra !== undefined) data.precioBarra = null
    return data
  }
  const largo = Number(data.largoBarra) > 0 ? Number(data.largoBarra) : 6
  data.precioBarra = precioBarra
  data.largoBarra  = largo
  data.precio      = Math.round((precioBarra / largo) * 100) / 100
  data.unidad      = 'mt'
  return data
}

// Busca el artículo que corresponde a una fila del Excel: primero por código de
// sistema, después por código interno y por último por nombre.
async function buscarExistente(f) {
  if (f.codigoSistema) {
    const a = await Articulo.findOne({ codigoSistema: f.codigoSistema })
    if (a) return a
  }
  if (f.codigo) {
    const a = await Articulo.findOne({ codigo: f.codigo })
    if (a) return a
  }
  if (f.nombre) return Articulo.findOne({ nombre: f.nombre })
  return null
}

const parseNum = (v) => (v === undefined || v === null || v === '') ? null : parseFloat(String(v).replace(',', '.'))

function calcDiff(anterior, siguiente) {
  return CAMPOS_DIFF
    .filter(c => siguiente[c] !== undefined && String(anterior[c] ?? '') !== String(siguiente[c] ?? ''))
    .map(c => ({ campo: c, antes: anterior[c], despues: siguiente[c] }))
}

function genSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

async function snapshotMaquinasDeArticulo(articuloId, motivo) {
  try {
    const pintura = await getPinturaConfig()
    // Si el artículo es uno de los productos de pintura, cambia el costo de todas las máquinas que se pintan
    const esPintura = pintura && ['pu', 'endurecedor', 'diluyente', 'primer']
      .some(k => String(pintura[k]?.articulo?._id || '') === String(articuloId))
    const filtro = esPintura
      ? { $or: [{ 'componentes.articulo': articuloId }, { pintar: { $ne: false } }] }
      : { 'componentes.articulo': articuloId }
    const maquinas = await Maquina.find(filtro).populate('componentes.articulo')
    for (const maq of maquinas) {
      const c = calcCosto(maq, pintura)
      await SnapshotCosto.create({
        maquina: maq._id, maquinaNombre: maq.nombre, motivo,
        costoTotal: c.total,
        margen: maq.margen || 0,
        detalle: detalleSnapshot(c),
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

    // Columnas: Código interno | Nombre | Categoría | Precio | Unidad | Notas | (Cantidad) | Precio barra | Largo barra (m) | Código sistema
    // La columna G queda para la cantidad del importador de máquinas, por eso la barra va en H e I.
    // Una fila sin nombre pero con código (interno o de sistema) solo actualiza el precio de ese artículo.
    const [codigo, nombre, categoria, precioRaw, unidad, notas, , precioBarraRaw, largoBarraRaw, codigoSistemaRaw] = row
    const codigoSistema = codigoSistemaRaw !== undefined && codigoSistemaRaw !== null ? String(codigoSistemaRaw).trim() : ''
    const codigoInt     = codigo !== undefined && codigo !== null ? String(codigo).trim() : ''
    const soloPrecio    = (!nombre || String(nombre).trim() === '') && !!(codigoSistema || codigoInt)
    const precioBarra = parseNum(precioBarraRaw)
    const largoBarra  = parseNum(largoBarraRaw)
    if (precioBarra !== null && (isNaN(precioBarra) || precioBarra < 0)) {
      errores.push(`Fila ${excelRow} ("${nombre}"): precio de barra inválido — "${precioBarraRaw}".`)
      continue
    }
    if (largoBarra !== null && (isNaN(largoBarra) || largoBarra <= 0)) {
      errores.push(`Fila ${excelRow} ("${nombre}"): largo de barra inválido — "${largoBarraRaw}".`)
      continue
    }
    const porBarra = precioBarra !== null && precioBarra > 0

    if (!soloPrecio && (!nombre || String(nombre).trim() === '')) {
      errores.push(`Fila ${excelRow}: falta el nombre del artículo (o un código para actualizar solo el precio).`)
      continue
    }
    if (!porBarra && (precioRaw === undefined || precioRaw === null || precioRaw === '')) {
      errores.push(`Fila ${excelRow} ("${nombre}"): falta el precio.`)
      continue
    }
    const precio = porBarra ? 0 : parseFloat(String(precioRaw).replace(',', '.'))
    if (isNaN(precio) || precio < 0) {
      errores.push(`Fila ${excelRow} ("${nombre}"): precio inválido — "${precioRaw}".`)
      continue
    }
    if (soloPrecio) {
      const f = { soloPrecio: true, codigo: codigoInt, codigoSistema, nombre: '', precio,
        precioBarra: porBarra ? precioBarra : null, largoBarra: largoBarra || 6, excelRow }
      if (!porBarra) delete f.precioBarra
      filas.push(porBarra ? aplicarPrecioBarra(f) : f)
      continue
    }
    if (!categoria || String(categoria).trim() === '')
      advertencias.push(`Fila ${excelRow} ("${nombre}"): sin categoría, se dejará en blanco.`)
    if (!porBarra && (!unidad || String(unidad).trim() === ''))
      advertencias.push(`Fila ${excelRow} ("${nombre}"): sin unidad, se usará "unidad" por defecto.`)

    filas.push(aplicarPrecioBarra({
      codigo:    codigoInt,
      codigoSistema,
      nombre:    String(nombre).trim(),
      categoria: categoria ? String(categoria).trim() : '',
      precio,
      unidad:    unidad    ? String(unidad).trim()    : 'unidad',
      notas:     notas     ? String(notas).trim()     : '',
      precioBarra: porBarra ? precioBarra : null,
      largoBarra:  largoBarra || 6,
    }))
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
          { codigoSistema: { $regex: q, $options: 'i' } },
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
      ['Código interno', 'Nombre', 'Categoría', 'Precio', 'Unidad', 'Notas', 'Cantidad', 'Precio barra', 'Largo barra (m)', 'Código sistema'],
      ...articulos.map(a => [a.codigo, a.nombre, a.categoria, a.precio, a.unidad, a.notas, '',
        a.precioBarra || '', a.precioBarra ? (a.largoBarra || 6) : '', a.codigoSistema || ''])
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
      const existing = await buscarExistente(f)
      if (existing) {
        const { soloPrecio, excelRow, ...datos } = f
        if (!datos.codigoSistema) delete datos.codigoSistema
        const cambios = calcDiff(existing, datos)
        actualizados.push({ ...datos, nombre: existing.nombre, codigo: existing.codigo, codigoSistema: existing.codigoSistema, cambios, _id: existing._id })
      } else if (f.soloPrecio) {
        errores.push(`Fila ${f.excelRow}: no hay ningún artículo con código ${f.codigoSistema ? `de sistema "${f.codigoSistema}"` : `interno "${f.codigo}"`}.`)
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

    for (const f0 of filas) {
      const { soloPrecio, excelRow, ...f } = f0
      try {
        const before = await buscarExistente(f0)
        if (!before && soloPrecio) {
          errores.push(`Fila ${excelRow}: no hay ningún artículo con código ${f.codigoSistema ? `de sistema "${f.codigoSistema}"` : `interno "${f.codigo}"`}.`)
          continue
        }
        // Un Excel sin la columna "Código sistema" no borra el código que ya tenía el artículo
        if (!f.codigoSistema) delete f.codigoSistema
        if (soloPrecio) {
          // Solo precio: no se tocan nombre, códigos ni el resto de los datos
          delete f.nombre; delete f.codigo; delete f.codigoSistema
        }
        if (before) await Articulo.findByIdAndUpdate(before._id, f, { runValidators: true })
        else        await Articulo.create(f)
        const esNuevo = !before
        histEntries.push({
          tipo: 'importado', importSessionId: sessionId, esNuevo,
          articuloNombre: before?.nombre || f.nombre, articuloCodigo: before?.codigo || f.codigo || f.codigoSistema || '',
          cambios: before ? calcDiff(before, f) : [],
        })
        if (before && f.precio !== undefined && Number(before.precio) !== Number(f.precio))
          snapshotMaquinasDeArticulo(before._id, 'Importación de precios')
        esNuevo ? added++ : updated++
      } catch (dbErr) {
        errores.push(`"${f.nombre || f.codigoSistema || f.codigo}": error al guardar — ${dbErr.message}`)
      }
    }

    if (histEntries.length) await ArticuloHistorial.insertMany(histEntries)

    res.json({ added, updated, errors: errores, warnings: advertencias, total, sessionId })
  } catch (e) { res.status(500).json({ error: `Error al leer el archivo: ${e.message}` }) }
})

// POST detectar perfiles a partir del nombre (solo artículos que todavía no tienen perfil)
router.post('/detectar-perfiles', async (req, res) => {
  try {
    const sinPerfil = await Articulo.find({ $or: [{ perfil: '' }, { perfil: { $exists: false } }] })
    const detectados = []
    for (const art of sinPerfil) {
      const d = detectarPerfil(art.nombre)
      if (!d) continue
      await Articulo.updateOne({ _id: art._id }, d)
      detectados.push({ nombre: art.nombre, ...d })
    }
    res.json({ revisados: sinPerfil.length, detectados })
  } catch (e) { res.status(500).json({ error: e.message }) }
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
    const art = await Articulo.create(aplicarPrecioBarra({ ...req.body }))
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
    const datos = aplicarPrecioBarra({ ...req.body })
    const art = await Articulo.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true })
    if (!art) return res.status(404).json({ error: 'No encontrado' })

    const cambios = anterior ? calcDiff(anterior.toObject(), datos) : []
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
