import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Dashboard
export const getDashboard = () => api.get('/dashboard/').then(r => r.data)

// Caixa
export const getCaixaAtual = () => api.get('/caixa/atual').then(r => r.data)
export const abrirCaixa = (payload) => api.post('/caixa/abrir', payload).then(r => r.data)
export const fecharCaixa = (payload) => api.post('/caixa/fechar', payload).then(r => r.data)
export const getHistoricoCaixa = () => api.get('/caixa/historico').then(r => r.data)
export const getCaixa = (id) => api.get(`/caixa/${id}`).then(r => r.data)

// Vendas
export const getVendas = (caixaId) => api.get('/vendas/', { params: { caixa_id: caixaId, limit: 200 } }).then(r => r.data)
export const registrarVenda = (payload) => api.post('/vendas/', payload).then(r => r.data)
export const cancelarVenda = (id) => api.delete(`/vendas/${id}`).then(r => r.data)

// Gastos
export const getGastos = (caixaId) => api.get('/gastos/', { params: { caixa_id: caixaId, limit: 200 } }).then(r => r.data)
export const registrarGasto = (payload) => api.post('/gastos/', payload).then(r => r.data)
export const cancelarGasto = (id) => api.delete(`/gastos/${id}`).then(r => r.data)

// Clientes
export const getClientes = () => api.get('/clientes/').then(r => r.data)
export const criarCliente = (payload) => api.post('/clientes/', payload).then(r => r.data)
export const atualizarCliente = (id, payload) => api.put(`/clientes/${id}`, payload).then(r => r.data)
export const deletarCliente = (id) => api.delete(`/clientes/${id}`).then(r => r.data)

// Fiado
export const getFiados = (params) => api.get('/fiado/', { params }).then(r => r.data)
export const registrarFiado = (payload) => api.post('/fiado/', payload).then(r => r.data)
export const pagarFiado = (id) => api.patch(`/fiado/${id}/pagar`).then(r => r.data)
export const deletarFiado = (id) => api.delete(`/fiado/${id}`).then(r => r.data)
