import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Caixa from './pages/Caixa'
import Vendas from './pages/Vendas'
import Gastos from './pages/Gastos'
import Fiado from './pages/Fiado'
import Clientes from './pages/Clientes'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/fiado" element={<Fiado />} />
          <Route path="/clientes" element={<Clientes />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
