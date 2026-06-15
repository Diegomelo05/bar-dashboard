import { useEffect, useState } from 'react'
import { getFiados, registrarFiado, pagarFiado, deletarFiado, getClientes, criarCliente } from '../api'
import { fmt, fmtDate } from '../utils'
import { X, Plus, Check, Trash2 } from 'lucide-react'

function ModalNovoFiado({ clientes, onSave, onClose }) {
  const [clienteId, setClienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    if (!descricao || !valor) return setErr('Preencha todos os campos')
    if (!clienteId && !novoNome) return setErr('Selecione ou crie um cliente')
    setErr('')
    try {
      let id = clienteId
      if (!id && novoNome) {
        const c = await criarCliente({ nome: novoNome })
        id = c.id
      }
      await onSave({ cliente_id: parseInt(id), descricao, valor: parseFloat(valor) })
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao registrar')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">Anotar fiado</div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Cliente</label>
          {!criandoCliente ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Selecionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <button className="btn btn-ghost" type="button" onClick={() => setCriandoCliente(true)} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={14} />
                Novo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Nome do cliente"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                autoFocus
              />
              <button className="btn btn-ghost" type="button" onClick={() => { setCriandoCliente(false); setNovoNome('') }}>
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input
            className="form-input"
            placeholder="Ex: 2 doses de whisky"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
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
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>

        {err && <div className="error-banner">{err}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>Registrar</button>
        </div>
      </div>
    </div>
  )
}

export default function Fiado() {
  const [fiados, setFiados] = useState([])
  const [clientes, setClientes] = useState([])
  const [tab, setTab] = useState('aberto')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [f, c] = await Promise.all([
        getFiados({ apenas_abertos: tab === 'aberto' }),
        getClientes(),
      ])
      setFiados(f)
      setClientes(c)
    } catch {
      setFiados([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const handleSave = async (payload) => {
    await registrarFiado(payload)
    setShowModal(false)
    load()
  }

  const handlePagar = async (id) => {
    await pagarFiado(id)
    load()
  }

  const handleDelete = async (id) => {
    await deletarFiado(id)
    setFiados(fiados.filter(f => f.id !== id))
  }

  // Group by cliente
  const byCliente = fiados.reduce((acc, f) => {
    const key = f.cliente_id
    if (!acc[key]) acc[key] = { nome: f.cliente_nome, id: key, items: [] }
    acc[key].items.push(f)
    return acc
  }, {})

  const totalGeral = fiados.reduce((sum, f) => sum + f.valor, 0)

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Fiado</h1>
          <p className="page-subtitle">Controle de crédito por cliente</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} />
          Novo fiado
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="tabs">
          <button className={`tab ${tab === 'aberto' ? 'active' : ''}`} onClick={() => setTab('aberto')}>Em aberto</button>
          <button className={`tab ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>Histórico</button>
        </div>
        {tab === 'aberto' && fiados.length > 0 && (
          <span className="badge badge-red">{fmt(totalGeral)} total</span>
        )}
      </div>

      {loading ? (
        <div className="spinner">Carregando...</div>
      ) : fiados.length === 0 ? (
        <div className="empty">{tab === 'aberto' ? 'Nenhum fiado em aberto' : 'Nenhum histórico'}</div>
      ) : tab === 'aberto' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.values(byCliente).map(({ nome, id, items }) => {
            const total = items.reduce((s, f) => s + f.valor, 0)
            return (
              <div key={id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{nome}</div>
                  <span className="badge badge-red">{fmt(total)}</span>
                </div>
                <div className="item-list">
                  {items.map(f => (
                    <div key={f.id} className="item-row">
                      <div className="item-desc">
                        <div>{f.descricao}</div>
                        <div className="item-meta">{fmtDate(f.created_at)}</div>
                      </div>
                      <div className="item-value debit">{fmt(f.valor)}</div>
                      <button className="btn btn-success btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handlePagar(f.id)} title="Marcar como pago">
                        <Check size={12} />
                        Pago
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(f.id)} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {items.length > 1 && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="btn btn-success"
                      onClick={() => Promise.all(items.map(f => pagarFiado(f.id))).then(load)}
                    >
                      <Check size={14} />
                      Quitar tudo ({fmt(total)})
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Histórico — flat list */
        <div className="item-list">
          {fiados.map(f => (
            <div key={f.id} className="item-row">
              <div className="item-desc">
                <div>{f.descricao}</div>
                <div className="item-meta">
                  {f.cliente_nome} · {fmtDate(f.created_at)}
                  {f.pago && f.data_pagamento && ` · pago em ${fmtDate(f.data_pagamento)}`}
                </div>
              </div>
              <div className="item-value" style={{ color: f.pago ? 'var(--green)' : 'var(--red)' }}>{fmt(f.valor)}</div>
              <span className={`badge ${f.pago ? 'badge-green' : 'badge-red'}`}>{f.pago ? 'pago' : 'aberto'}</span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalNovoFiado clientes={clientes} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
