import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export const insumosApi = {
  getAll: (q = '') => api.get('/insumos', { params: { q } }).then(r => r.data),
  create: (data)   => api.post('/insumos', data).then(r => r.data),
  update: (id, d)  => api.put(`/insumos/${id}`, d).then(r => r.data),
  remove: (id)     => api.delete(`/insumos/${id}`).then(r => r.data),
}

export const comprasApi = {
  getAll: (params = {}) => api.get('/compras', { params }).then(r => r.data),
  create: (data)         => api.post('/compras', data).then(r => r.data),
  remove: (id)            => api.delete(`/compras/${id}`).then(r => r.data),
}

export const productosApi = {
  getAll: (q = '') => api.get('/productos', { params: { q } }).then(r => r.data),
  create: (data)   => api.post('/productos', data).then(r => r.data),
  update: (id, d)  => api.put(`/productos/${id}`, d).then(r => r.data),
  remove: (id)     => api.delete(`/productos/${id}`).then(r => r.data),
}

export const feriasApi = {
  getAll: ()       => api.get('/ferias').then(r => r.data),
  create: (data)   => api.post('/ferias', data).then(r => r.data),
  update: (id, d)  => api.put(`/ferias/${id}`, d).then(r => r.data),
  remove: (id)     => api.delete(`/ferias/${id}`).then(r => r.data),
}

export const ventasApi = {
  getAll: (params = {}) => api.get('/ventas', { params }).then(r => r.data),
  create: (data)         => api.post('/ventas', data).then(r => r.data),
  remove: (id)            => api.delete(`/ventas/${id}`).then(r => r.data),
}

export const reportesApi = {
  resumen: (params = {}) => api.get('/reportes/resumen', { params }).then(r => r.data),
}
