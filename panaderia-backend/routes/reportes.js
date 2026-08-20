import { Router } from 'express'
import Venta from '../models/Venta.js'
import Compra from '../models/Compra.js'

const router = Router()

function rangoFechas(desde, hasta) {
  const filter = {}
  if (desde || hasta) {
    filter.fecha = {}
    if (desde) filter.fecha.$gte = new Date(desde)
    if (hasta) filter.fecha.$lte = new Date(hasta)
  }
  return filter
}

router.get('/resumen', async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const filterVentas = rangoFechas(desde, hasta)
    const filterCompras = rangoFechas(desde, hasta)

    const ventas = await Venta.find(filterVentas).populate('feria')
    const compras = await Compra.find(filterCompras)

    const totalVentas    = ventas.reduce((s, v) => s + v.total, 0)
    const totalCostoVenta = ventas.reduce((s, v) => s + v.costoTotal, 0)
    const gananciaBruta   = totalVentas - totalCostoVenta
    const totalCompras    = compras.reduce((s, c) => s + c.costoTotal, 0)
    const gananciaNeta    = totalVentas - totalCompras

    const porFeriaMap = {}
    for (const v of ventas) {
      const key = v.feria?._id?.toString() || 'sin-feria'
      if (!porFeriaMap[key]) {
        porFeriaMap[key] = {
          feriaId: v.feria?._id || null,
          feriaNombre: v.feria?.nombre || 'Sin feria',
          fecha: v.feria?.fecha || null,
          totalVentas: 0, totalCosto: 0, ganancia: 0, cantidadVentas: 0,
        }
      }
      porFeriaMap[key].totalVentas += v.total
      porFeriaMap[key].totalCosto  += v.costoTotal
      porFeriaMap[key].ganancia    += v.ganancia
      porFeriaMap[key].cantidadVentas += 1
    }

    const productosMap = {}
    for (const v of ventas) {
      for (const item of v.items) {
        if (!productosMap[item.nombre]) productosMap[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0 }
        productosMap[item.nombre].cantidad += item.cantidad
        productosMap[item.nombre].total += item.precioUnitario * item.cantidad
      }
    }
    const productosMasVendidos = Object.values(productosMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)

    res.json({
      totalVentas, totalCostoVenta, gananciaBruta,
      totalCompras, gananciaNeta,
      cantidadVentas: ventas.length,
      porFeria: Object.values(porFeriaMap).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)),
      productosMasVendidos,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
