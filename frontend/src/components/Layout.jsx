import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CreditCard, ShoppingCart, TrendingDown, UserX, Users, Package, LogOut } from 'lucide-react'
import './Layout.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/caixa', icon: CreditCard, label: 'Caixa' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/gastos', icon: TrendingDown, label: 'Gastos' },
  { to: '/fiado', icon: UserX, label: 'Fiado' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('api_key')
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">▣</span>
          <span className="logo-text">Bar</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout} title="Sair">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
