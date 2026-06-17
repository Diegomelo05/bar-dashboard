import { useEffect, useState } from 'react'
import { registrarVenda, cancelarVenda, getVendas, getCaixaAtual, getProdutos } from '../api'
import { fmt, fmtDate } from '../utils'
import { Trash2, ShoppingCart } from 'lucide-react'

const CATS = ['bebida', 'comida', 'outros']

const FORM_VAZIO = { produto_id: '', descricao: '', quantidade: 1, valor_unitario: '', categoria: 'bebida' }

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [caixaId, setCaixaId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [precoCusto, setPrecoCusto] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const c = await getCaixaAtual()
      setCaixaId(c.id)
      const [v, p] = await Promise.all([getVendas(c.id), getProdutos(true)])
      setVendas(v)
      setProdutos(p)
    } catch {
      setCaixaId(null)
      setVendas([])
      try { setProdutos(await getProdutos(true)) } catch { setProdutos([]) }
    }
  }

  useEffect(() => { load() }, [])

  const produtoSelecionado = produtos.find(p => p.id === parseInt(form.produto_id))

  const handleProdutoChange = (id) => {
    const p = produtos.find(x => x.id === parseInt(id))
    if (p) {
      setForm({ ...form, produto_id: id, descricao: p.nome, valor_unitario: p.preco_venda, categoria: p.categoria, quantidade: 1 })
      setPrecoCusto(p.preco_custo)
    } else {
      setForm({ ...FORM_VAZIO })
      setPrecoCusto(null)
    }
  }

  const total = (parseFloat(form.quantidade) || 0) * (parseFloat(form.valor_unitario) || 0)

  const estoqueInsuficiente = produtoSelecionado &&
    produtoSelecionado.quantidade_estoque < (parseInt(form.quantidade) || 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor_unitario) return
    if (estoqueInsuficiente) return
    setErr('')
    setLoading(true)
    try {
      const payload = {
        descricao: form.descricao,
        quantidade: parseFloat(form.quantidade),
        valor_unitario: parseFloat(form.valor_unitario),
        categoria: form.categoria,
      }
      if (form.produto_id) {
        payload.produto_id = parseInt(form.produto_id)
        payload.preco_custo = precoCusto
      }
      const v = await registrarVenda(payload)
      setVendas([v, ...vendas])
      // Atualiza estoque local do produto
      if (form.produto_id) {
        setProdutos(prev => prev.map(p =>
          p.id === parseInt(form.produto_id)
            ? { ...p, quantidade_estoque: p.quantidade_estoque - Math.round(parseFloat(form.quantidade)) }
            : p
        ))
      }
      setForm(FORM_VAZIO)
      setPrecoCusto(null)
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const venda = vendas.find(v => v.id === id)
    await cancelarVenda(id)
    setVendas(vendas.filter(v => v.id !== id))
    // Restaura estoque local
    if (venda?.produto_id) {
      setProdutos(prev => prev.map(p =>
        p.id === venda.produto_id
          ? { ...p, quantidade_estoque: p.quantidade_estoque + Math.round(venda.quantidade) }
          : p
      ))
    }
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

          {/* Seletor de produto */}
          {produtos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Produto do catálogo</label>
              <select className="form-input" value={form.produto_id} onChange={e => handleProdutoChange(e.target.value)}>
                <option value="">— Venda manual (sem produto cadastrado) —</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantidade_estoque === 0}>
                    {p.nome} · Estoque: {p.quantidade_estoque}un · {fmt(p.preco_venda)}
                    {p.quantidade_estoque === 0 ? ' ⚠ SEM ESTOQUE' : ''}
                  </option>
                ))}
              </select>
              {produtoSelecionado && (
                <div style={{ fontSize: 12, marginTop: 4, color: produtoSelecionado.quantidade_estoque <= produtoSelecionado.estoque_minimo ? 'var(--amber)' : 'var(--text-muted)' }}>
                  Estoque disponível: {produtoSelecionado.quantidade_estoque} unidade(s)
                  {produtoSelecionado.estoque_minimo > 0 && produtoSelecionado.quantidade_estoque <= produtoSelecionado.estoque_minimo &&
                    ' · Estoque baixo'}
                </div>
              )}
            </div>
          )}

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
                step={form.produto_id ? '1' : '0.5'}
                min={form.produto_id ? '1' : '0.5'}
                max={produtoSelecionado ? produtoSelecionado.quantidade_estoque : undefined}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total:</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
              </div>
              {precoCusto != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Margem:</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(total - precoCusto * parseFloat(form.quantidade))}
                  </span>
                </div>
              )}
            </div>
          )}

          {estoqueInsuficiente && (
            <div className="error-banner">
              Estoque insuficiente. Disponível: {produtoSelecionado.quantidade_estoque} unidade(s).
            </div>
          )}

          {err && <div className="error-banner">{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading || !caixaId || estoqueInsuficiente} style={{ width: 'fit-content' }}>
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
                    {v.preco_custo != null && (
                      <span style={{ color: 'var(--green)' }}> · margem {fmt((v.valor_unitario - v.preco_custo) * v.quantidade)}</span>
                    )}
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
