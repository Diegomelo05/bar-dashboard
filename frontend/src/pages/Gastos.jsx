import { useEffect, useState } from 'react'
import { registrarGasto, cancelarGasto, getGastos, getCaixaAtual } from '../api'
import { fmt, fmtDate } from '../utils'
import { Trash2, TrendingDown } from 'lucide-react'

const CATS = ['compra', 'conta', 'outros']

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [caixaId, setCaixaId] = useState(null)
  const [form, setForm] = useState({ descricao: '', valor: '', categoria: 'compra' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const c = await getCaixaAtual()
      setCaixaId(c.id)
      const g = await getGastos(c.id)
      setGastos(g)
    } catch {
      setCaixaId(null)
      // load without caixa filter to show all gastos
      try {
        const g = await getGastos()
        setGastos(g)
      } catch {
        setGastos([])
      }
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor) return
    setErr('')
    setLoading(true)
    try {
      const g = await registrarGasto({
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        categoria: form.categoria,
      })
      setGastos([g, ...gastos])
      setForm({ descricao: '', valor: '', categoria: form.categoria })
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao registrar gasto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await cancelarGasto(id)
    setGastos(gastos.filter(g => g.id !== id))
  }

  const totalDia = gastos.reduce((sum, g) => sum + g.valor, 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Gastos</h1>
        <p className="page-subtitle">Registrar saídas e despesas</p>
      </div>

      {/* Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Descrição</label>
              <input
                className="form-input"
                placeholder="Ex: Compra de gelo"
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {err && <div className="error-banner">{err}</div>}

          <button className="btn btn-danger" type="submit" disabled={loading} style={{ width: 'fit-content', background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <TrendingDown size={14} />
            {loading ? 'Registrando...' : 'Registrar gasto'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="section-heading">Gastos do caixa atual</div>

      {gastos.length === 0 ? (
        <div className="empty">Nenhum gasto registrado</div>
      ) : (
        <>
          <div className="item-list">
            {gastos.map(g => (
              <div key={g.id} className="item-row">
                <div className="item-desc">
                  <div>{g.descricao}</div>
                  <div className="item-meta">
                    <span style={{ textTransform: 'capitalize' }}>{g.categoria}</span> · {fmtDate(g.created_at)}
                  </div>
                </div>
                <div className="item-value debit">−{fmt(g.valor)}</div>
                <button className="btn-icon" onClick={() => handleDelete(g.id)} title="Cancelar">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="total-row" style={{ marginTop: 8 }}>
            <span className="total-label">Total de gastos</span>
            <span className="item-value debit" style={{ fontSize: 16 }}>{fmt(totalDia)}</span>
          </div>
        </>
      )}
    </div>
  )
}
