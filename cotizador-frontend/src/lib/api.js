import axios from 'axios'

// En desarrollo usa el proxy de Vite ('/api').
// En producción (Vercel/Netlify), usa la URL del backend desplegado.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export const articulosApi = {
  getAll:    (q = '') => api.get('/articulos', { params: { q } }).then(r => r.data),
  create:    (data)   => api.post('/articulos', data).then(r => r.data),
  update:    (id, d)  => api.put(`/articulos/${id}`, d).then(r => r.data),
  remove:    (id)     => api.delete(`/articulos/${id}`).then(r => r.data),
  import:    (file)   => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/articulos/import/excel', fd).then(r => r.data)
  },
  exportUrl: () => `${import.meta.env.VITE_API_URL || ''}/api/articulos/export/excel`,
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