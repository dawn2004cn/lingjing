'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [users, setUsers] = useState(null)
  const [showUsers, setShowUsers] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [rechecking, setRechecking] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) throw new Error('获取数据失败')
      setData(await res.json())
    } catch (e) { setError(e.message) }
  }, [])

  const recheckRecord = useCallback(async (recordId) => {
    setRechecking(recordId)
    setError('')
    try {
      const res = await fetch('/api/admin/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '复算失败')
      await fetchDashboard()
    } catch (e) { setError(e.message) }
    finally { setRechecking(null) }
  }, [fetchDashboard])

  const recheckAllMismatch = useCallback(async () => {
    setRechecking('all')
    setError('')
    try {
      const res = await fetch('/api/admin/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allMismatch: true }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '批量复算失败')
      await fetchDashboard()
    } catch (e) { setError(e.message) }
    finally { setRechecking(null) }
  }, [fetchDashboard])

  const backfillFlags = useCallback(async () => {
    setRechecking('backfill')
    setError('')
    try {
      let remaining = 1
      let rounds = 0
      let lastRemaining = Infinity
      while (remaining > 0 && rounds < 20) {
        const res = await fetch('/api/admin/recheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backfill: true, limit: 100 }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || '回填失败')
        remaining = d.remaining ?? 0
        rounds += 1
        if (!d.count) break
        if (remaining >= lastRemaining) break
        lastRemaining = remaining
      }
      await fetchDashboard()
    } catch (e) { setError(e.message) }
    finally { setRechecking(null) }
  }, [fetchDashboard])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('获取用户失败')
      const d = await res.json()
      setUsers(d.users)
    } catch (e) { setError(e.message) }
  }, [])

  const deleteUser = useCallback(async (userId, username) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '删除失败')
      setDeleteConfirm(null)
      fetchUsers()
      fetchDashboard()
    } catch (e) { setError(e.message) }
  }, [fetchUsers, fetchDashboard])

  const setUserPlan = useCallback(async (userId, plan) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '更新档位失败')
      fetchUsers()
    } catch (e) { setError(e.message) }
  }, [fetchUsers])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'admin') { router.push('/'); return }
    fetchDashboard()
  }, [user, loading, router, fetchDashboard])

  const openUsers = async () => {
    setShowUsers(true)
    fetchUsers()
  }

  if (loading || !user) return null

  return (
    <div className="page-shell min-h-screen">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="app-container h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[rgba(245,234,210,0.55)] hover:text-[#fff6e2] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-[#fff6e2] text-lg font-semibold tracking-tight">数据看板</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgba(245,234,210,0.45)]">{user.username}</span>
            <button onClick={fetchDashboard} className="btn-ghost !text-xs">刷新</button>
          </div>
        </div>
      </nav>

      <main className="app-container py-8">
        {error && (
          <div className="card p-5 mb-6 border border-[var(--cinnabar)]/30">
            <p className="text-xs text-[var(--cinnabar)]">{error}</p>
          </div>
        )}

        {data && !showUsers && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: '总访问量', value: data.totalVisits, icon: '👁' },
                { label: '今日访问', value: data.todayVisits, icon: '📅' },
                { label: '总测算次数', value: data.totalRecords, icon: '🔮' },
                { label: '今日测算', value: data.todayRecords, icon: '✨' },
              ].map((s) => (
                <div key={s.label} className="card p-5 animate-slide-up">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg">{s.icon}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                  <div className="stat-value text-2xl">{s.value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Users summary - clickable */}
            <button onClick={openUsers} className="card p-5 mb-8 animate-slide-up w-full text-left cursor-pointer hover:border-[var(--gold-bright)]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <span className="stat-label">注册用户</span>
                </div>
                <svg className="w-4 h-4 text-[rgba(245,234,210,0.35)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
              <div className="stat-value">{data.totalUsers}</div>
              <p className="text-xs text-[rgba(245,234,210,0.4)] mt-1">点击查看和管理用户</p>
            </button>

            {data.accuracy && (data.accuracy.needsBackfill > 0 || data.accuracy.crossMismatch > 0 || data.accuracy.crossPartial > 0) && (
              <div className="card p-5 mb-6 animate-slide-up border border-[var(--gold)]/30">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-[var(--gold-bright)] tracking-[0.18em]">
                    精度运维
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {data.accuracy.needsBackfill > 0 && (
                      <button
                        type="button"
                        className="btn-ghost !text-[10px] border border-[var(--line)]"
                        disabled={!!rechecking}
                        onClick={backfillFlags}
                      >
                        {rechecking === 'backfill'
                          ? '回填中…'
                          : `回填旧记录（${data.accuracy.needsBackfill}）`}
                      </button>
                    )}
                    <a
                      href="/api/admin/mismatch-export?format=csv&recompute=1"
                      className="btn-ghost !text-[10px] border border-[var(--line)]"
                    >
                      导出复核 CSV
                    </a>
                    <a
                      href="/api/admin/mismatch-export?format=md&recompute=1"
                      className="btn-ghost !text-[10px] border border-[var(--line)]"
                    >
                      导出复核 MD
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-[rgba(245,234,210,0.5)] leading-relaxed">
                  回填会按批（每批 100）重算 skipped 旧记录的交叉与边界标志。
                  导出含 mismatch / partial，并即时复算旁证摘要。
                </p>
              </div>
            )}

            {data.accuracy && data.accuracy.crossMismatch > 0 && (
              <div className="card p-5 mb-6 animate-slide-up border border-[var(--cinnabar)]/35 bg-[rgba(184,74,52,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-[var(--cinnabar)] tracking-[0.18em]">
                    交叉未通过告警 · {data.accuracy.crossMismatch} 条
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[rgba(245,234,210,0.4)]">需人工复核</span>
                    <button
                      type="button"
                      className="btn-ghost !text-[10px] border border-[var(--line)]"
                      disabled={!!rechecking}
                      onClick={recheckAllMismatch}
                    >
                      {rechecking === 'all' ? '复算中…' : '全部复算旁证'}
                    </button>
                  </div>
                </div>
                {(!data.mismatchRecords || data.mismatchRecords.length === 0) ? (
                  <p className="text-xs text-[rgba(245,234,210,0.5)]">暂无明细（统计含历史）</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--line)]">
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">用户</th>
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">姓名</th>
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">出生</th>
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">流派</th>
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">时间</th>
                          <th className="text-left py-2 px-2 text-[rgba(245,234,210,0.45)] font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.mismatchRecords.map((r) => (
                          <tr key={r.id} className="border-b border-[var(--line)]/40">
                            <td className="py-2 px-2 text-[#fff6e2]">{r.username}</td>
                            <td className="py-2 px-2 text-[rgba(247,236,215,0.78)]">{r.name}</td>
                            <td className="py-2 px-2 text-[rgba(247,236,215,0.65)] whitespace-nowrap">
                              {r.calendar_type} {r.birth_date} · {r.birth_clock || r.birth_hour}
                            </td>
                            <td className="py-2 px-2 text-[rgba(245,234,210,0.55)]">
                              {Number(r.day_sect) === 1 ? '1' : '2'}
                            </td>
                            <td className="py-2 px-2 text-[rgba(245,234,210,0.45)] whitespace-nowrap">
                              {r.created_at?.replace('T', ' ').slice(0, 16)}
                            </td>
                            <td className="py-2 px-2">
                              <button
                                type="button"
                                className="text-[10px] text-[var(--gold-bright)] hover:underline disabled:opacity-40"
                                disabled={!!rechecking}
                                onClick={() => recheckRecord(r.id)}
                              >
                                {rechecking === r.id ? '…' : '复算'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {data.accuracy && (
              <div className="card p-5 mb-8 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--gold-bright)] tracking-[0.18em]">精度字段统计</span>
                  <Link href="/accuracy" className="text-[10px] text-[rgba(245,234,210,0.45)] hover:text-[var(--gold-bright)]">
                    口径说明
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: '填精确钟点', value: `${data.accuracy.withClock}（${data.accuracy.withClockPct}%）` },
                    { label: '真太阳时', value: `${data.accuracy.trueSolar}（${data.accuracy.trueSolarPct}%）` },
                    { label: '真太阳跨时辰', value: `${data.accuracy.trueSolarShift}（${data.accuracy.trueSolarShiftPct}%）` },
                    { label: '农历/闰月', value: `${data.accuracy.lunarCalendar} / 闰${data.accuracy.leapMonth}` },
                    { label: '八字/紫微', value: `${data.accuracy.systemBazi} / ${data.accuracy.systemZiwei}` },
                    { label: '日柱流派2', value: `${data.accuracy.daySect2}（${data.accuracy.daySect2Pct}%）` },
                    { label: '日柱流派1', value: `${data.accuracy.daySect1}（${data.accuracy.daySect1Pct}%）` },
                    { label: '时辰交界双盘', value: `${data.accuracy.boundaryHour}（${data.accuracy.boundaryHourPct}%）` },
                    { label: '节气交界', value: `${data.accuracy.boundaryJieqi}（${data.accuracy.boundaryJieqiPct}%）` },
                    { label: '交叉通过', value: `${data.accuracy.crossMatch}（${data.accuracy.crossMatchPct}%）` },
                    { label: '流派差 sect_diff', value: `${data.accuracy.crossSect}（${data.accuracy.crossSectPct}%）` },
                    { label: '交叉未通过', value: `${data.accuracy.crossMismatch}（${data.accuracy.crossMismatchPct}%）` },
                    { label: '待回填 skipped', value: `${data.accuracy.needsBackfill ?? 0}` },
                    {
                      label: 'citation 采样',
                      value: data.accuracy.citation
                        ? `${data.accuracy.citation.total}（回退 ${data.accuracy.citation.fallbackPct}%）`
                        : '0',
                    },
                    {
                      label: 'citation 均分',
                      value: data.accuracy.citation ? String(data.accuracy.citation.avgScore) : '—',
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md border border-[var(--line)] px-3 py-2.5">
                      <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">{s.label}</div>
                      <div className="mt-1 text-[rgba(245,234,210,0.78)]">{s.value}</div>
                    </div>
                  ))}
                </div>
                {data.accuracy.citation?.bySystem?.length > 0 && (
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)] mb-2">
                      citation 按术数
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-[rgba(245,234,210,0.55)]">
                      {data.accuracy.citation.bySystem.map((s) => (
                        <li key={s.system} className="flex flex-wrap gap-3">
                          <span className="text-[var(--gold-bright)] w-20">{s.system}</span>
                          <span>采样 {s.total}</span>
                          <span>回退 {s.fallbacks}（{s.fallbackPct}%）</span>
                          <span>均分 {s.avgScore}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.accuracy.citation?.recentFallbacks?.length > 0 && (
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)] mb-2">
                      最近 citation 回退
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-[rgba(245,234,210,0.55)]">
                      {data.accuracy.citation.recentFallbacks.slice(0, 8).map((e) => (
                        <li key={e.id} className="flex flex-wrap gap-2">
                          <span className="text-[rgba(245,234,210,0.35)]">{e.created_at}</span>
                          <span>{e.system || '—'}</span>
                          <span>score={e.score}</span>
                          <span className="truncate max-w-[28rem]">{e.detail || ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recent Records Table */}
            <div className="card overflow-hidden animate-slide-up">
              <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--gold-bright)] tracking-[0.18em]">最近测算记录</span>
                <span className="text-xs text-[rgba(245,234,210,0.42)]">{data.totalRecords} 条</span>
              </div>

              {data.recentRecords.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[rgba(245,234,210,0.5)]">暂无测算记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">用户</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">姓名</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">体系</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">出生</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">精度</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRecords.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? '' : 'bg-[rgba(245,234,210,0.02)]'}>
                          <td className="py-2.5 px-4 text-[#fff6e2]">{r.username}</td>
                          <td className="py-2.5 px-4 text-[rgba(247,236,215,0.78)]">{r.name}</td>
                          <td className="py-2.5 px-4 text-[rgba(247,236,215,0.78)]">
                            {r.system === 'ziwei' ? '紫微' : '八字'}
                          </td>
                          <td className="py-2.5 px-4 text-[rgba(247,236,215,0.78)] whitespace-nowrap">
                            {r.calendar_type} {r.birth_date}
                            {r.is_leap_month ? '闰' : ''} · {r.birth_clock || r.birth_hour}
                          </td>
                          <td className="py-2.5 px-4 text-[rgba(245,234,210,0.55)] whitespace-nowrap">
                            {[
                              r.birth_clock ? '钟点' : null,
                              r.use_true_solar ? '真太阳' : null,
                              r.true_solar_shift ? '跨时辰' : null,
                              r.system !== 'ziwei' ? `流派${Number(r.day_sect) === 1 ? '1' : '2'}` : `旁证流派${Number(r.day_sect) === 1 ? '1' : '2'}`,
                              r.boundary_hour ? '时辰交界' : null,
                              r.boundary_jieqi ? '节气交界' : null,
                              r.cross_status && r.cross_status !== 'skipped' ? r.cross_status : null,
                            ].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-[rgba(245,234,210,0.5)] whitespace-nowrap">
                            {r.created_at?.replace('T', ' ').slice(0, 16)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* User Management Panel */}
        {showUsers && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setShowUsers(false); setDeleteConfirm(null) }}
                className="text-[rgba(245,234,210,0.55)] hover:text-[#fff6e2] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-[#fff6e2] text-lg font-semibold tracking-tight">用户管理</h2>
              <button onClick={() => { fetchUsers() }} className="btn-ghost !text-xs ml-auto">刷新</button>
            </div>

            {!users ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-xs text-[rgba(245,234,210,0.5)] tracking-[0.18em]">加载中...</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">ID</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">用户名</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">角色</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">档位</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">测算次数</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">注册时间</th>
                        <th className="text-left py-3 px-4 text-[rgba(245,234,210,0.55)] font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-[rgba(245,234,210,0.02)]'}>
                          <td className="py-2.5 px-4 text-[rgba(247,236,215,0.5)]">{u.id}</td>
                          <td className="py-2.5 px-4 text-[#fff6e2]">
                            {u.username}
                            {Number(u.id) === user?.id && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[0.6rem] bg-[rgba(215,168,74,0.2)] text-[var(--gold-bright)]">当前</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-medium ${
                              u.role === 'admin'
                                ? 'bg-[rgba(215,168,74,0.15)] text-[var(--gold-bright)]'
                                : 'text-[rgba(247,236,215,0.6)]'
                            }`}>
                              {u.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="text-[rgba(245,234,210,0.45)]">管理·不限</span>
                            ) : (
                              <select
                                className="input-base !py-1 !text-[11px] !w-auto"
                                value={u.plan === 'pro' ? 'pro' : 'free'}
                                onChange={(e) => setUserPlan(u.id, e.target.value)}
                              >
                                <option value="free">免费</option>
                                <option value="pro">专业</option>
                              </select>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-[rgba(247,236,215,0.78)]">{u.recordCount ?? 0}</td>
                          <td className="py-2.5 px-4 text-[rgba(245,234,210,0.5)] whitespace-nowrap">
                            {u.createdAt?.replace('T', ' ').slice(0, 16)}
                          </td>
                          <td className="py-2.5 px-4">
                            {Number(u.id) === user?.id ? (
                              <span className="text-xs text-[rgba(245,234,210,0.3)]">不可操作</span>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(u)}
                                className="text-xs text-[var(--cinnabar)] hover:text-[#ef5a3e] transition-colors"
                              >
                                删除
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!data && !error && !showUsers && (
          <div className="flex items-center justify-center py-20">
            <p className="text-xs text-[rgba(245,234,210,0.5)] tracking-[0.18em]">加载中...</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-6 max-w-sm w-full animate-slide-up text-center">
            <p className="text-[#fff6e2] text-sm font-semibold mb-2">确认删除</p>
            <p className="text-xs text-[rgba(245,234,210,0.6)] mb-1">
              用户 <span className="text-[var(--gold-bright)]">{deleteConfirm.username}</span>
            </p>
            <p className="text-xs text-[rgba(245,234,210,0.45)] mb-5">
              该用户的所有测算记录也将被删除，此操作不可撤销。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-md text-xs font-semibold bg-[rgba(245,234,210,0.08)] text-[rgba(245,234,210,0.7)] hover:bg-[rgba(245,234,210,0.14)] transition-colors">
                取消
              </button>
              <button onClick={() => deleteUser(deleteConfirm.id, deleteConfirm.username)}
                className="flex-1 py-2 rounded-md text-xs font-semibold bg-[var(--cinnabar)] text-white hover:brightness-110 transition-all">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}