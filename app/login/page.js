'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await login(u, p)
      router.push('/')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="auth-card p-8 w-full max-w-sm animate-slide-up">
        <h1 className="text-xl font-semibold text-[#fff6e2] text-center tracking-tight">登录</h1>
        <p className="text-xs text-[rgba(245,234,210,0.55)] text-center mt-1 mb-7 font-light">欢迎回来</p>

        <form onSubmit={submit} className="space-y-5">
          <div className="input-field">
            <label className="input-label">用户名</label>
            <input type="text" className="input-base" value={u} onChange={e => setU(e.target.value)} required />
          </div>
          <div className="input-field">
            <label className="input-label">密码</label>
            <input type="password" className="input-base" value={p} onChange={e => setP(e.target.value)} required />
          </div>

          {err && <p className="text-xs text-[var(--cinnabar)] text-center">{err}</p>}

          <div className="pt-1">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>

        <p className="text-xs text-[rgba(245,234,210,0.45)] text-center mt-6">
          没有账号？
          <Link href="/register" className="text-[var(--gold-bright)] hover:text-[#fff6e2] ml-1">去注册</Link>
        </p>
      </div>
    </div>
  )
}
