import { useEffect, useState } from 'react'
import { getCaixaAtual, abrirCaixa, fecharCaixa, getHistoricoCaixa, getVendas, getGastos } from '../api'
import { fmt, fmtDate, fmtDateShort } from '../utils'
import { X, Trash2 } from 'lucide-react'
import { cancelarVenda, cancelarGasto } from '../api'

function ModalFechar({ onConfirm, onClose }) {
  const [saldo, setSaldo] = useState('')
  const [obs, setObs] = useState('')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">Fechar caixa</div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Saldo final em caixa (R$)</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={saldo}
            onChange={e => setSaldo(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Observação (opcional)</label>
          <input className="form-input" placeholder="Notas do fechamento..." value={obs} onChange={e => setObs(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-danger"
            disabled={saldo === ''}
            onClick={() => onConfirm({ saldo_final: parseFloat(saldo), observacao: obs || undefined })}
          >
            Fechar caixa
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Caixa() {
  const [caixa, setCaixa] = useState(null)
  const [historico, setHistorico] = useState([])
  const [vendas, setVendas] = useState([])
  const [gastos, setGastos] = useState([])
  const [tab, setTab] = useState('vendas')
  const [mainTab, setMainTab] = useState('atual')
  const [showFechar, setShowFechar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [obs, setObs] = useState('')
  const [err, setErr] = useState('')

  const loadCaixa = async () => {
    try {
      const c = await getCaixaAtual()
      setCaixa(c)
      const [v, g] = await Promise.all([getVendas(c.id), getGastos(c.id)])
      setVendas(v)
      setGastos(g)
    } catch {
      setCaixa(null)
    }
  }

  const loadHistorico = async () => {
    try {
      const h = await getHistoricoCaixa()
      setHistorico(h)
    } catch {
      setHistorico([])
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCaixa(), loadHistorico()]).finally(() => setLoading(false))
  }, [])

  const handleAbrir = async () => {
    setErr('')
    try {
      await abrirCaixa({ saldo_inicial: parseFloat(saldoInicial || 0), observacao: obs || undefined })
      await loadCaixa()
      setSaldoInicial('')
      setObs('')
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao abrir caixa')
    }
  }

  const handleFechar = async (payload) => {
    try {
      await fecharCaixa(payload)
      setShowFechar(false)
      setCaixa(null)
      await Promise.all([loadCaixa(), loadHistorico()])
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao fechar caixa')
    }
  }

  const handleDeleteVenda = async (id) => {
    await cancelarVenda(id)
    setVendas(vendas.filter(v => v.id !== id))
  }

  const handleDeleteGasto = async (id) => {
    await cancelarGasto(id)
    setGastos(gastos.filter(g => g.id !== id))
  }

  if (loading) return <div className="page"><div className="spinner">Carregando...</div></div>

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className={`pulse-dot ${caixa ? '' : 'closed'}`} />
        <div>
          <h1 className="page-title">Caixa</h1>
          <p className="page-subtitle">{caixa ? 'Em aberto' : 'Fechado'}</p>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ marginBottom: 20 }}>
        <div className="tabs">
          <button className={`tab ${mainTab === 'atual' ? 'active' : ''}`} onClick={() => setMainTab('atual')}>Caixa atual</button>
          <button className={`tab ${mainTab === 'historico' ? 'active' : ''}`} onClick={() => setMainTab('historico')}>Histórico</button>
        </div>
      </div>

      {err && <div className="error-banner" style={{ marginBottom: 16 }}>{err}</div>}

      {mainTab === 'atual' && (
        <>
          {!caixa ? (
            /* Abrir caixa form */
            <div className="card" style={{ maxWidth: 400 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Abrir caixa</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Saldo inicial (R$)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={saldoInicial}
                    onChange={e => setSaldoInicial(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Observação (opcional)</label>
                  <input className="form-input" placeholder="Observações..." value={obs} onChange={e => setObs(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleAbrir}>Abrir caixa</button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats do caixa aberto */}
              <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-label">Vendas</div>
                  <div className="stat-value amber">{fmt(caixa.total_vendas)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{caixa.num_vendas} lançamentos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Gastos</div>
                  <div className="stat-value red">{fmt(caixa.total_gastos)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Lucro</div>
                  <div className={`stat-value ${caixa.lucro >= 0 ? 'green' : 'red'}`}>{fmt(caixa.lucro)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Saldo inicial</div>
                  <div className="stat-value white">{fmt(caixa.saldo_inicial)}</div>
                </div>
              </div>

              {/* Sub tabs */}
              <div style={{ marginBottom: 14 }}>
                <div className="tabs">
                  <button className={`tab ${tab === 'vendas' ? 'active' : ''}`} onClick={() => setTab('vendas')}>
                    Vendas ({vendas.length})
                  </button>
                  <button className={`tab ${tab === 'gastos' ? 'active' : ''}`} onClick={() => setTab('gastos')}>
                    Gastos ({gastos.length})
                  </button>
                </div>
              </div>

              {tab === 'vendas' && (
                <div className="item-list">
                  {vendas.length === 0 ? (
                    <div className="empty">Nenhuma venda registrada</div>
                  ) : vendas.map(v => (
                    <div key={v.id} className="item-row">
                      <div className="item-desc">
                        <div>{v.descricao}</div>
                        <div className="item-meta">{v.quantidade}× {fmt(v.valor_unitario)} · {v.categoria}</div>
                      </div>
                      <div className="item-value credit">{fmt(v.valor_total)}</div>
                      <button className="btn-icon" onClick={() => handleDeleteVenda(v.id)} title="Cancelar venda">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'gastos' && (
                <div className="item-list">
                  {gastos.length === 0 ? (
                    <div className="empty">Nenhum gasto registrado</div>
                  ) : gastos.map(g => (
                    <div key={g.id} className="item-row">
                      <div className="item-desc">
                        <div>{g.descricao}</div>
                        <div className="item-meta">{g.categoria}</div>
                      </div>
                      <div className="item-value debit">−{fmt(g.valor)}</div>
                      <button className="btn-icon" onClick={() => handleDeleteGasto(g.id)} title="Cancelar gasto">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-danger" onClick={() => setShowFechar(true)}>
                  Fechar caixa
                </button>
              </div>
            </>
          )}
        </>
      )}

      {mainTab === 'historico' && (
        <div className="item-list">
          {historico.length === 0 ? (
            <div className="empty">Nenhum caixa registrado</div>
          ) : historico.map(c => (
            <div key={c.id} className="item-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="item-desc">
                <div style={{ fontWeight: 600 }}>{fmtDateShort(c.data_abertura)}</div>
                <div className="item-meta">{fmtDate(c.data_abertura)} → {c.data_fechamento ? fmtDate(c.data_fechamento) : 'aberto'}</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vendas</div>
                  <div className="item-value credit">{fmt(c.total_vendas)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gastos</div>
                  <div className="item-value debit">{fmt(c.total_gastos)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lucro</div>
                  <div className={`item-value ${c.lucro >= 0 ? 'credit' : 'debit'}`}>{fmt(c.lucro)}</div>
                </div>
              </div>
              <span className={`badge ${c.status === 'aberto' ? 'badge-amber' : 'badge-green'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {showFechar && <ModalFechar onConfirm={handleFechar} onClose={() => setShowFechar(false)} />}
    </div>
  )
}
