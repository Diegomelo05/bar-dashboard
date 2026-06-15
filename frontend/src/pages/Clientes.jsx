import { useEffect, useState } from 'react'
import { getClientes, criarCliente, deletarCliente, getFiados, pagarFiado } from '../api'
import { fmt, fmtDate } from '../utils'
import { X, Plus, Trash2, ChevronRight, Check, User } from 'lucide-react'

function ModalCliente({ onSave, onClose }) {
  const [form, setForm] = useState({ nome: '', telefone: '', observacao: '' })
  const [err, setErr] = useState('')

  const handleSave = async () => {
    if (!form.nome.trim()) return setErr('Nome é obrigatório')
    setErr('')
    try {
      await onSave(form)
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao salvar')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">Novo cliente</div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Telefone (opcional)</label>
          <input className="form-input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Observação (opcional)</label>
          <textarea className="form-input" rows={2} placeholder="Notas sobre o cliente..." value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={{ resize: 'vertical' }} />
        </div>
        {err && <div className="error-banner">{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function DrawerCliente({ cliente, onClose, onRefresh }) {
  const [fiados, setFiados] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const f = await getFiados({ cliente_id: cliente.id, apenas_abertos: false })
      setFiados(f)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [cliente.id])

  const handlePagar = async (id) => {
    await pagarFiado(id)
    load()
    onRefresh()
  }

  const abertos = fiados.filter(f => !f.pago)
  const pagos = fiados.filter(f => f.pago)
  const totalAberto = abertos.reduce((s, f) => s + f.valor, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="modal-title">{cliente.nome}</div>
            {cliente.telefone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{cliente.telefone}</div>}
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {cliente.observacao && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            {cliente.observacao}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Em aberto</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totalAberto > 0 ? 'var(--red)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(totalAberto)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="spinner" style={{ padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {abertos.length > 0 && (
              <div>
                <div className="section-heading">Em aberto</div>
                <div className="item-list">
                  {abertos.map(f => (
                    <div key={f.id} className="item-row">
                      <div className="item-desc">
                        <div>{f.descricao}</div>
                        <div className="item-meta">{fmtDate(f.created_at)}</div>
                      </div>
                      <div className="item-value debit">{fmt(f.valor)}</div>
                      <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handlePagar(f.id)}>
                        <Check size={12} />
                        Pago
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pagos.length > 0 && (
              <div>
                <div className="section-heading">Histórico pago</div>
                <div className="item-list">
                  {pagos.map(f => (
                    <div key={f.id} className="item-row" style={{ opacity: 0.65 }}>
                      <div className="item-desc">
                        <div>{f.descricao}</div>
                        <div className="item-meta">{fmtDate(f.created_at)}</div>
                      </div>
                      <div className="item-value" style={{ color: 'var(--green)' }}>{fmt(f.valor)}</div>
                      <span className="badge badge-green">pago</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fiados.length === 0 && <div className="empty">Nenhum registro de fiado</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const c = await getClientes()
      setClientes(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    await criarCliente(payload)
    setShowModal(false)
    load()
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Excluir cliente? Todos os fiados serão removidos.')) return
    await deletarCliente(id)
    setClientes(clientes.filter(c => c.id !== id))
  }

  const filtrados = clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} />
          Novo cliente
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {loading ? (
        <div className="spinner">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty">Nenhum cliente encontrado</div>
      ) : (
        <div className="item-list">
          {filtrados.map(c => (
            <div
              key={c.id}
              className="item-row"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(c)}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber-glow)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={14} style={{ color: 'var(--amber)' }} />
              </div>
              <div className="item-desc">
                <div style={{ fontWeight: 600 }}>{c.nome}</div>
                {c.telefone && <div className="item-meta">{c.telefone}</div>}
              </div>
              {c.total_devido > 0 ? (
                <span className="badge badge-red">{fmt(c.total_devido)}</span>
              ) : (
                <span className="badge badge-green">sem fiado</span>
              )}
              <button className="btn-icon" onClick={(e) => handleDelete(c.id, e)} title="Excluir cliente">
                <Trash2 size={14} />
              </button>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      )}

      {showModal && <ModalCliente onSave={handleSave} onClose={() => setShowModal(false)} />}
      {selected && (
        <DrawerCliente
          cliente={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  )
}
