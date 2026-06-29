import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const articulosApi = {
  getAll:         (q = '') => api.get('/articulos', { params: { q } }).then(r => r.data),
  create:         (data)   => api.post('/articulos', data).then(r => r.data),
  update:         (id, d)  => api.put(`/articulos/${id}`, d).then(r => r.data),
  remove:         (id)     => api.delete(`/articulos/${id}`).then(r => r.data),
  removeAll:      ()       => api.delete('/articulos/all').then(r => r.data),
  importMeta:     (file)              => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/articulos/import/meta', fd).then(r => r.data)
  },
  importPreview:  (file, opts = {})   => {
    const fd = new FormData()
    fd.append('file', file)
    if (opts.sheetIndex != null) fd.append('sheetIndex', opts.sheetIndex)
    if (opts.startRow)           fd.append('startRow',   opts.startRow)
    if (opts.endRow)             fd.append('endRow',     opts.endRow)
    return api.post('/articulos/import/preview', fd).then(r => r.data)
  },
  import:         (file, opts = {})   => {
    const fd = new FormData()
    fd.append('file', file)
    if (opts.sheetIndex != null) fd.append('sheetIndex', opts.sheetIndex)
    if (opts.startRow)           fd.append('startRow',   opts.startRow)
    if (opts.endRow)             fd.append('endRow',     opts.endRow)
    return api.post('/articulos/import/excel', fd).then(r => r.data)
  },
  exportUrl:      () => '/api/articulos/export/excel',
  historial:      (limit = 200) => api.get('/articulos/historial', { params: { limit } }).then(r => r.data),
  deleteHistorial: (id)  => api.delete(`/articulos/historial/${id}`).then(r => r.data),
  deleteSession:   (sid) => api.delete(`/articulos/historial/session/${sid}`).then(r => r.data),
}

export const maquinasApi = {
  getAll:  (q = '') => api.get('/maquinas', { params: { q } }).then(r => r.data),
  create:  (data)   => api.post('/maquinas', data).then(r => r.data),
  update:  (id, d)  => api.put(`/maquinas/${id}`, d).then(r => r.data),
  remove:  (id)     => api.delete(`/maquinas/${id}`).then(r => r.data),
}

export const configApi = {
  get: () => api.get('/config').then(r => r.data),
  update: (tarifas, precioPlacaKg, pagos, empresa) =>
    api.put('/config', { tarifas, precioPlacaKg, pagos, empresa }).then(r => r.data),
}

export const snapshotsApi = {
  deMaquina: (id)          => api.get(`/snapshots/maquina/${id}`).then(r => r.data),
  variacion:  (id)          => api.get(`/snapshots/variacion/${id}`).then(r => r.data),
  manual:     (id, motivo)  => api.post(`/snapshots/maquina/${id}`, { motivo }).then(r => r.data),
}