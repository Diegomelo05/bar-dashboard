import { useEffect, useState } from 'react'
import { registrarVenda, cancelarVenda, getVendas, getCaixaAtual } from '../api'
import { fmt, fmtDate } from '../utils'
import { Trash2, ShoppingCart } from 'lucide-react'

const CATS = ['bebida', 'comida', 'outros']

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [caixaId, setCaixaId] = useState(null)
  const [form, setForm] = useState({ descricao: '', quantidade: 1, valor_unitario: '', categoria: 'bebida' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const c = await getCaixaAtual()
      setCaixaId(c.id)
      const v = await getVendas(c.id)
      setVendas(v)
    } catch {
      setCaixaId(null)
      setVendas([])
    }
  }

  useEffect(() => { load() }, [])

  const total = (parseFloat(form.quantidade) || 0) * (parseFloat(form.valor_unitario) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor_unitario) return
    setErr('')
    setLoading(true)
    try {
      const v = await registrarVenda({
        descricao: form.descricao,
        quantidade: parseFloat(form.quantidade),
        valor_unitario: parseFloat(form.valor_unitario),
        categoria: form.categoria,
      })
      setVendas([v, ...vendas])
      setForm({ descricao: '', quantidade: 1, valor_unitario: '', categoria: form.categoria })
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await cancelarVenda(id)
    setVendas(vendas.filter(v => v.id !== id))
  }

  const totalDia = vendas.reduce((sum, v) => sum + v.valor_total, 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Vendas</h1>
        <p className="page-subtitle">Registrar vendas do caixa atual</p>
      </div>

      {!caixaId && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          Abra o caixa antes de registrar vendas.
        </div>
      )}

      {/* Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Descrição</label>
              <input
                className="form-input"
                placeholder="Ex: Cerveja long neck"
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Qtd</label>
              <input
                className="form-input"
                type="number"
                step="0.5"
                min="0.5"
                value={form.quantidade}
                onChange={e => setForm({ ...form, quantidade: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valor unitário (R$)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor_unitario}
                onChange={e => setForm({ ...form, valor_unitario: e.target.value })}
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

          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total desta venda:</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
            </div>
          )}

          {err && <div className="error-banner">{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading || !caixaId} style={{ width: 'fit-content' }}>
            <ShoppingCart size={14} />
            {loading ? 'Registrando...' : 'Registrar venda'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="section-heading">Vendas do caixa atual</div>

      {vendas.length === 0 ? (
        <div className="empty">Nenhuma venda registrada neste caixa</div>
      ) : (
        <>
          <div className="item-list">
            {vendas.map(v => (
              <div key={v.id} className="item-row">
                <div className="item-desc">
                  <div>{v.descricao}</div>
                  <div className="item-meta">
                    {v.quantidade}× {fmt(v.valor_unitario)} · <span style={{ textTransform: 'capitalize' }}>{v.categoria}</span> · {fmtDate(v.created_at)}
                  </div>
                </div>
                <div className="item-value credit">{fmt(v.valor_total)}</div>
                <button className="btn-icon" onClick={() => handleDelete(v.id)} title="Cancelar">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="total-row" style={{ marginTop: 8 }}>
            <span className="total-label">Total do caixa</span>
            <span className="item-value credit" style={{ fontSize: 16 }}>{fmt(totalDia)}</span>
          </div>
        </>
      )}
    </div>
  )
}
