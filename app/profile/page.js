'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  if (loading) return null
  if (!user) { router.push('/login'); return null }

  const submit = async (e) => {
    e.preventDefault()
    setMsg(''); setErr('')
    if (newP !== confirm) { setErr('两次密码不一致'); return }
    if (newP.length < 6) { setErr('新密码至少 6 个字符'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldP, newPassword: newP }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMsg('密码修改成功')
      setOldP(''); setNewP(''); setConfirm('')
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="card p-8 w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-[rgba(245,234,210,0.55)] hover:text-[#fff6e2] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[#fff6e2] text-base font-semibold tracking-tight">个人设置</h1>
            <p className="text-[rgba(245,234,210,0.55)] text-xs mt-0.5">{user.username} · {user.role === 'admin' ? '管理员' : '普通用户'}</p>
          </div>
        </div>

        <div className="mb-6 h-px bg-[var(--line)]" />

        <form onSubmit={submit} className="space-y-5">
          <div className="input-field">
            <label className="input-label">旧密码</label>
            <input type="password" className="input-base" value={oldP} onChange={e => setOldP(e.target.value)} required />
          </div>
          <div className="input-field">
            <label className="input-label">新密码</label>
            <input type="password" className="input-base" value={newP} onChange={e => setNewP(e.target.value)} placeholder="至少 6 个字符" required />
          </div>
          <div className="input-field">
            <label className="input-label">确认新密码</label>
            <input type="password" className="input-base" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          {err && <p className="text-xs text-[var(--cinnabar)] text-center">{err}</p>}
          {msg && <p className="text-xs text-[var(--jade)] text-center">{msg}</p>}

          <div className="pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '保存中...' : '修改密码'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
