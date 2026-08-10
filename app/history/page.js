'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NavBar from '../components/NavBar'
import { useAuth } from '../components/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    Promise.all([
      fetch('/api/records').then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '加载失败')
        return data.records || []
      }),
      fetch('/api/sessions?limit=40').then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '会话加载失败')
        return data.sessions || []
      }),
    ])
      .then(([recs, sess]) => {
        setRecords(recs)
        setSessions(sess)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  const reopen = (r) => {
    const q = new URLSearchParams({
      name: r.name || '',
      gender: r.gender || '男',
      calendarType: r.calendar_type || '公历',
      birthDate: r.birth_date || '',
      birthHour: r.birth_hour || '',
      system: r.system || 'bazi',
    })
    if (r.birth_clock) q.set('birthClock', r.birth_clock)
    if (r.is_leap_month) q.set('isLeapMonth', '1')
    if (r.use_true_solar) q.set('useTrueSolar', '1')
    if (r.province) q.set('province', r.province)
    if (r.city) q.set('city', r.city)
    if (Number(r.day_sect) === 1) q.set('daySect', '1')
    else q.set('daySect', '2')
    router.push(`/?${q.toString()}`)
  }

  const openSession = (s) => {
    router.push(`/?session=${encodeURIComponent(s.publicId)}`)
  }

  const removeSession = async (s) => {
    if (!confirm(`删除会话「${s.title}」？`)) return
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: s.publicId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')
      setSessions((prev) => prev.filter((x) => x.publicId !== s.publicId))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">HISTORY</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">命盘历史</h1>
          <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)]">
            解读会话可恢复主文与多轮追问；生辰记录用于一键回到排盘。
          </p>
        </div>

        {!user && !authLoading && (
          <div className="card p-6 text-center">
            <p className="text-sm text-[rgba(245,234,210,0.65)]">登录后可查看历史命盘</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/login" className="btn-ghost !text-xs border border-[var(--line)]">登录</Link>
              <Link href="/register" className="btn-primary !w-auto px-4 text-xs">注册</Link>
            </div>
          </div>
        )}

        {loading && (
          <div className="card p-6">
            <LoadingSpinner />
          </div>
        )}

        {error && <p className="text-sm text-[var(--cinnabar)]">{error}</p>}

        {user && !loading && sessions.length > 0 && (
          <section className="mb-10 space-y-3">
            <h2 className="text-sm tracking-[0.14em] text-[var(--gold-bright)]">解读会话</h2>
            {sessions.map((s) => (
              <div
                key={s.publicId}
                className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[#fff6e2] font-medium">
                    {s.title}
                    <span className="ml-2 text-[10px] tracking-widest text-[var(--gold-bright)]">
                      {s.system === 'ziwei' ? '紫微' : '八字'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[rgba(245,234,210,0.45)]">
                    {Array.isArray(s.thread) && s.thread.length
                      ? `${s.thread.length} 轮追问`
                      : '尚无追问'}
                    {' · '}
                    <span className="font-mono text-[10px]">{s.publicId}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-[rgba(245,234,210,0.3)]">
                    更新 {s.updatedAt}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost !text-xs border border-[var(--line)]"
                    onClick={() => openSession(s)}
                  >
                    继续会话
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !text-xs"
                    onClick={() => removeSession(s)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {user && !loading && records.length === 0 && sessions.length === 0 && (
          <div className="card p-6 text-center text-sm text-[rgba(245,234,210,0.5)]">
            暂无记录，去 <Link href="/" className="text-[var(--gold-bright)]">排盘</Link> 试一次
          </div>
        )}

        {records.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm tracking-[0.14em] text-[var(--gold-bright)]">生辰记录</h2>
            {records.map((r) => (
              <div
                key={r.id}
                className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[#fff6e2] font-medium">
                    {r.name}
                    <span className="ml-2 text-[10px] tracking-widest text-[var(--gold-bright)]">
                      {r.system === 'ziwei' ? '紫微' : '八字'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[rgba(245,234,210,0.45)]">
                    {r.gender} · {r.calendar_type} {r.birth_date}
                    {r.is_leap_month ? '（闰）' : ''} · {r.birth_clock || r.birth_hour}
                    {r.use_true_solar ? ` · 真太阳 ${r.province || ''}${r.city || ''}` : ''}
                    {r.true_solar_shift ? ' · 跨时辰' : ''}
                    {r.system !== 'ziwei' ? ` · 日柱流派${Number(r.day_sect) === 1 ? '1' : '2'}` : ''}
                    {r.boundary_hour ? ' · 时辰交界' : ''}
                    {r.boundary_jieqi ? ' · 节气交界' : ''}
                    {r.cross_status && r.cross_status !== 'skipped' ? ` · 交叉${r.cross_status}` : ''}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[rgba(245,234,210,0.3)]">{r.created_at}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost !text-xs border border-[var(--line)]" onClick={() => reopen(r)}>
                    再读
                  </button>
                  {r.system === 'ziwei' && (
                    <Link
                      href={`/yunshi?${new URLSearchParams({
                        name: r.name || '',
                        gender: r.gender || '男',
                        calendarType: r.calendar_type || '公历',
                        birthDate: r.birth_date || '',
                        birthHour: r.birth_hour || '',
                        ...(r.birth_clock ? { birthClock: r.birth_clock } : {}),
                        ...(r.is_leap_month ? { isLeapMonth: '1' } : {}),
                        ...(r.use_true_solar ? { useTrueSolar: '1' } : {}),
                        ...(r.province ? { province: r.province } : {}),
                        ...(r.city ? { city: r.city } : {}),
                        daySect: Number(r.day_sect) === 1 ? '1' : '2',
                      }).toString()}`}
                      className="btn-ghost !text-xs"
                    >
                      运势
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
