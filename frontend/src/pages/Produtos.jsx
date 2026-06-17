import { useEffect, useState } from 'react'
import { getProdutos, criarProduto, atualizarProduto, deletarProduto, entradaEstoque } from '../api'
import { fmt } from '../utils'
import { Plus, Pencil, PackagePlus, PackageX } from 'lucide-react'

const CATS = ['bebida', 'comida', 'outros']

const FORM_VAZIO = { nome: '', preco_custo: '', preco_venda: '', categoria: 'bebida', estoque_minimo: 0, quantidade_estoque: 0 }

function badgeEstoque(p) {
  if (p.quantidade_estoque === 0) return 'badge badge-red'
  if (p.estoque_minimo > 0 && p.quantidade_estoque <= p.estoque_minimo) return 'badge badge-amber'
  return 'badge badge-green'
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [entradaId, setEntradaId] = useState(null)
  const [entradaQtd, setEntradaQtd] = useState(1)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const lista = await getProdutos(false)
      setProdutos(lista)
    } catch {
      setProdutos([])
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      if (editando) {
        const atualizado = await atualizarProduto(editando.id, {
          nome: form.nome,
          preco_custo: parseFloat(form.preco_custo),
          preco_venda: parseFloat(form.preco_venda),
          categoria: form.categoria,
          estoque_minimo: parseInt(form.estoque_minimo) || 0,
        })
        setProdutos(produtos.map(p => p.id === atualizado.id ? atualizado : p))
      } else {
        const novo = await criarProduto({
          nome: form.nome,
          preco_custo: parseFloat(form.preco_custo),
          preco_venda: parseFloat(form.preco_venda),
          categoria: form.categoria,
          estoque_minimo: parseInt(form.estoque_minimo) || 0,
          quantidade_estoque: parseInt(form.quantidade_estoque) || 0,
        })
        setProdutos([...produtos, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      setForm(FORM_VAZIO)
      setShowForm(false)
      setEditando(null)
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = (p) => {
    setEditando(p)
    setForm({ nome: p.nome, preco_custo: p.preco_custo, preco_venda: p.preco_venda, categoria: p.categoria, estoque_minimo: p.estoque_minimo, quantidade_estoque: p.quantidade_estoque })
    setShowForm(true)
    setErr('')
  }

  const handleDesativar = async (id) => {
    await deletarProduto(id)
    setProdutos(produtos.map(p => p.id === id ? { ...p, ativo: false } : p))
  }

  const handleEntrada = async (e) => {
    e.preventDefault()
    if (!entradaId || entradaQtd < 1) return
    try {
      const atualizado = await entradaEstoque(entradaId, parseInt(entradaQtd))
      setProdutos(produtos.map(p => p.id === atualizado.id ? atualizado : p))
      setEntradaId(null)
      setEntradaQtd(1)
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro ao adicionar estoque')
    }
  }

  const cancelarForm = () => {
    setShowForm(false)
    setEditando(null)
    setForm(FORM_VAZIO)
    setErr('')
  }

  const ativos = produtos.filter(p => p.ativo)
  const inativos = produtos.filter(p => !p.ativo)

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">Catálogo e controle de estoque</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 2 }}>
            <Plus size={14} />
            Novo produto
          </button>
        )}
      </div>

      {/* Formulário add/edit */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>
            {editando ? `Editar: ${editando.nome}` : 'Novo produto'}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nome do produto</label>
                <input className="form-input" placeholder="Ex: Cerveja Long Neck" value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Preço de custo (R$)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
                  value={form.preco_custo} onChange={e => setForm({ ...form, preco_custo: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Preço de venda (R$)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
                  value={form.preco_venda} onChange={e => setForm({ ...form, preco_venda: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Estoque mínimo</label>
                <input className="form-input" type="number" min="0" placeholder="0"
                  value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: e.target.value })} />
              </div>
              {!editando && (
                <div className="form-group">
                  <label className="form-label">Qtd inicial em estoque</label>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={form.quantidade_estoque} onChange={e => setForm({ ...form, quantidade_estoque: e.target.value })} />
                </div>
              )}
            </div>

            {form.preco_custo && form.preco_venda && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Margem por unidade:{' '}
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                  {fmt(parseFloat(form.preco_venda) - parseFloat(form.preco_custo))}
                </span>
                {' '}({parseFloat(form.preco_custo) > 0
                  ? `${(((parseFloat(form.preco_venda) - parseFloat(form.preco_custo)) / parseFloat(form.preco_custo)) * 100).toFixed(0)}%`
                  : '—'})
              </div>
            )}

            {err && <div className="error-banner">{err}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar produto'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelarForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal entrada de estoque */}
      {entradaId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Entrada de estoque</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {produtos.find(p => p.id === entradaId)?.nome}
            </div>
            <form onSubmit={handleEntrada} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Quantas unidades chegaram?</label>
                <input className="form-input" type="number" min="1" step="1"
                  value={entradaQtd} onChange={e => setEntradaQtd(e.target.value)} autoFocus />
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost" type="button" onClick={() => { setEntradaId(null); setEntradaQtd(1) }}>Cancelar</button>
                <button className="btn btn-primary" type="submit">Confirmar entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de produtos ativos */}
      {ativos.length === 0 && !showForm ? (
        <div className="empty">Nenhum produto cadastrado. Clique em "Novo produto" para começar.</div>
      ) : (
        <div className="item-list">
          {ativos.map(p => (
            <div key={p.id} className="item-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="item-desc">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{p.nome}</span>
                  <span className="badge badge-amber" style={{ fontSize: 10 }}>{p.categoria}</span>
                </div>
                <div className="item-meta">
                  Custo {fmt(p.preco_custo)} · Venda {fmt(p.preco_venda)} · Margem {fmt(p.preco_venda - p.preco_custo)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={badgeEstoque(p)} style={{ fontSize: 12, padding: '3px 10px' }}>
                  {p.quantidade_estoque} un
                </span>
                <button className="btn-icon" title="Entrada de estoque" onClick={() => { setEntradaId(p.id); setEntradaQtd(1) }}>
                  <PackagePlus size={15} />
                </button>
                <button className="btn-icon" title="Editar" style={{ color: 'var(--text-muted)' }}
                  onClick={() => handleEditar(p)}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Pencil size={14} />
                </button>
                <button className="btn-icon" title="Desativar produto" onClick={() => handleDesativar(p.id)}>
                  <PackageX size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Produtos inativos */}
      {inativos.length > 0 && (
        <>
          <div className="section-heading" style={{ marginTop: 28 }}>Inativos</div>
          <div className="item-list">
            {inativos.map(p => (
              <div key={p.id} className="item-row" style={{ opacity: 0.5 }}>
                <div className="item-desc">
                  <span style={{ textDecoration: 'line-through' }}>{p.nome}</span>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={async () => {
                    const reativado = await atualizarProduto(p.id, { ativo: true })
                    setProdutos(produtos.map(x => x.id === reativado.id ? reativado : x))
                  }}>
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
