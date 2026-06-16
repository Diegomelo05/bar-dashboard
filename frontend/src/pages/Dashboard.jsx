import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CreditCard, ShoppingCart, TrendingDown, UserX, RefreshCw } from 'lucide-react'
import { getDashboard } from '../api'
import { fmt } from '../utils'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontVariantNumeric: 'tabular-nums' }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const d = await getDashboard()
      setData(d)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const caixa = data?.caixa_aberta

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do dia</p>
        </div>
        <button className="btn btn-ghost" onClick={load} style={{ marginTop: 2 }}>
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="spinner">Carregando...</div>
      ) : (
        <>
          {/* Status caixa */}
          <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`pulse-dot ${caixa ? '' : 'closed'}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {caixa ? 'Caixa aberto' : 'Caixa fechado'}
              </div>
              {caixa && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Saldo inicial: {fmt(caixa.saldo_inicial)}
                </div>
              )}
            </div>
            {!caixa && (
              <button className="btn btn-primary" onClick={() => navigate('/caixa')}>
                <CreditCard size={14} />
                Abrir caixa
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Vendas hoje</div>
              <div className="stat-value amber">{fmt(caixa?.total_vendas ?? 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Gastos hoje</div>
              <div className="stat-value red">{fmt(caixa?.total_gastos ?? 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Lucro hoje</div>
              <div className={`stat-value ${(caixa?.lucro ?? 0) >= 0 ? 'green' : 'red'}`}>
                {fmt(caixa?.lucro ?? 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Fiado em aberto</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <div className="stat-value red">{fmt(data?.total_fiado_aberto ?? 0)}</div>
                {(data?.num_clientes_com_fiado ?? 0) > 0 && (
                  <span className="badge badge-red">{data.num_clientes_com_fiado} clientes</span>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          {data?.resumo_semana?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                ÚLTIMOS 7 DIAS
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.resumo_semana} barGap={3}>
                  <XAxis
                    dataKey="data"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `R$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                  />
                  <Bar dataKey="vendas" name="Vendas" fill="#FFB000" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#FF2D78" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }} onClick={() => navigate('/vendas')}>
              <ShoppingCart size={16} />
              Nova Venda
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '12px' }} onClick={() => navigate('/gastos')}>
              <TrendingDown size={16} />
              Registrar Gasto
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '12px' }} onClick={() => navigate('/fiado')}>
              <UserX size={16} />
              Anotar Fiado
            </button>
          </div>
        </>
      )}
    </div>
  )
}
