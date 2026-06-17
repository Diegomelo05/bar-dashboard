import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Caixa from './pages/Caixa'
import Vendas from './pages/Vendas'
import Gastos from './pages/Gastos'
import Fiado from './pages/Fiado'
import Clientes from './pages/Clientes'
import Produtos from './pages/Produtos'
import Login from './pages/Login'

function RequireAuth({ children }) {
  if (!localStorage.getItem('api_key')) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="caixa" element={<Caixa />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="gastos" element={<Gastos />} />
                <Route path="fiado" element={<Fiado />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="produtos" element={<Produtos />} />
              </Routes>
            </Layout>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}
