'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (p !== c) { setErr('两次密码不一致'); return }
    setLoading(true)
    try {
      await register(u, p)
      router.push('/')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="auth-card p-8 w-full max-w-sm animate-slide-up">
        <h1 className="text-xl font-semibold text-[#fff6e2] text-center tracking-tight">注册</h1>
        <p className="text-xs text-[rgba(245,234,210,0.55)] text-center mt-1 mb-7 font-light">创建您的账号</p>

        <form onSubmit={submit} className="space-y-5">
          <div className="input-field">
            <label className="input-label">用户名</label>
            <input type="text" className="input-base" value={u} onChange={e => setU(e.target.value)} placeholder="至少 2 个字符" required />
          </div>
          <div className="input-field">
            <label className="input-label">密码</label>
            <input type="password" className="input-base" value={p} onChange={e => setP(e.target.value)} placeholder="至少 6 个字符" required />
          </div>
          <div className="input-field">
            <label className="input-label">确认密码</label>
            <input type="password" className="input-base" value={c} onChange={e => setC(e.target.value)} required />
          </div>

          {err && <p className="text-xs text-[var(--cinnabar)] text-center">{err}</p>}

          <div className="pt-1">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '注册中...' : '注册'}
            </button>
          </div>
        </form>

        <p className="text-xs text-[rgba(245,234,210,0.45)] text-center mt-6">
          已有账号？
          <Link href="/login" className="text-[var(--gold-bright)] hover:text-[#fff6e2] ml-1">去登录</Link>
        </p>
      </div>
    </div>
  )
}
