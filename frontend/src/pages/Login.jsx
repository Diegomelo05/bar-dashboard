import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Login.css'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Login() {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!senha.trim()) return
    setLoading(true)
    setErro('')
    try {
      await axios.post(`${BASE_URL}/auth/verify`, null, {
        headers: { 'X-API-Key': senha.trim() },
      })
      localStorage.setItem('api_key', senha.trim())
      navigate('/', { replace: true })
    } catch {
      setErro('Senha incorreta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">▣</span>
          <span className="login-logo-text">Bar</span>
        </div>
        <p className="login-subtitle">Controle de Bar</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="senha">Senha de acesso</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha"
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {erro && <p className="login-erro">{erro}</p>}
          <button type="submit" disabled={loading || !senha.trim()} className="login-btn">
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
