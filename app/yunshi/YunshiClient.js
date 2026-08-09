'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import PersonBirthForm, { emptyPerson } from '../components/PersonBirthForm'
import LifeKLine from '../components/LifeKLine'
import LoadingSpinner from '../components/LoadingSpinner'
import ShareCard from '../components/ShareCard'
import CrossEngineNotice from '../components/CrossEngineNotice'

export default function YunshiClient() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ ...emptyPerson(), name: '' })
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!searchParams?.get('birthDate')) return
    setForm((prev) => ({
      ...prev,
      name: searchParams.get('name') || prev.name,
      gender: searchParams.get('gender') || prev.gender,
      calendarType: searchParams.get('calendarType') || prev.calendarType,
      birthDate: searchParams.get('birthDate') || prev.birthDate,
      birthHour: searchParams.get('birthHour') || prev.birthHour,
      birthClock: searchParams.get('birthClock') || prev.birthClock,
      isLeapMonth: searchParams.get('isLeapMonth') === '1',
      useTrueSolar: searchParams.get('useTrueSolar') === '1',
      province: searchParams.get('province') || prev.province,
      city: searchParams.get('city') || prev.city,
      daySect: searchParams.get('daySect') === '1' ? 1 : 2,
    }))
  }, [searchParams])

  const run = async () => {
    setError(null)
    if (!form.birthDate || !(form.birthHour || form.birthClock)) {
      setError('请填写出生日期与时辰')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ziwei/yunshi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, year }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '计算失败')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const report = data?.report

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">YUN SHI</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">年度运势</h1>
          <p className="mt-2 max-w-2xl text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">
            流年十二宫叠宫、月度四化简表与人生规则分曲线。分数仅作盘面加权参考。
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/" className="btn-ghost !text-xs">返回排盘</Link>
            <Link href="/heming" className="btn-ghost !text-xs">合盘</Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="card p-5 md:p-6">
            <PersonBirthForm label="生辰" formData={form} onChange={setForm} />
            <div className="mt-4 input-field">
              <label className="input-label">流年年份</label>
              <input
                type="number"
                className="input-base"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              />
            </div>
            {error && <p className="mt-3 text-sm text-[var(--cinnabar)]">{error}</p>}
            <button type="button" className="btn-primary mt-5" disabled={loading} onClick={run}>
              {loading ? '推演中...' : '查看运势'}
            </button>
          </div>

          <div>
            {loading && (
              <div className="card p-6">
                <LoadingSpinner />
              </div>
            )}

            {!loading && report && (
              <div className="space-y-5">
                {data.crossCheck && <CrossEngineNotice report={data.crossCheck} />}

                <div className="card p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">YEAR SCORE</p>
                      <h2 className="mt-1 text-xl text-[#fff6e2]">{report.overlaySummary}</h2>
                      <p className="mt-1 text-sm text-[rgba(245,234,210,0.55)]">
                        虚岁约 {report.age} · 规则分{' '}
                        <span className="text-[var(--gold-bright)] text-lg">{report.score}</span>
                        {data.chartMeta?.daySect != null && (
                          <span className="ml-2 text-[10px] text-[rgba(245,234,210,0.4)]">
                            旁证流派{data.chartMeta.daySect}
                          </span>
                        )}
                      </p>
                    </div>
                    <ShareCard
                      subtitle={`${form.name || '命主'} · ${report.year}年`}
                      lines={[
                        report.overlaySummary,
                        `规则分 ${report.score}`,
                        `流年四化 禄${report.liuNian.transforms.禄} 权${report.liuNian.transforms.权} 科${report.liuNian.transforms.科} 忌${report.liuNian.transforms.忌}`,
                        ...(data.patterns || []).map((p) => `格局：${p.name}`),
                      ]}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-[rgba(245,234,210,0.65)]">
                    {['禄', '权', '科', '忌'].map((k) => (
                      <span key={k} className="rounded border border-[var(--line)] px-2 py-1">
                        化{k} {report.liuNian.transforms[k]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="card p-5 md:p-6">
                  <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)] mb-3">流年十二宫</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {report.palaces.map((p) => (
                      <div
                        key={p.natalName + p.branch}
                        className={`rounded-md border px-2.5 py-2 ${
                          p.isLiuNianMing
                            ? 'border-[#6b9fd4]/50 bg-[rgba(107,159,212,0.08)]'
                            : p.isDaXian
                              ? 'border-[var(--gold)]/40 bg-[rgba(215,168,74,0.08)]'
                              : 'border-[var(--line)]'
                        }`}
                      >
                        <div className="text-[rgba(245,234,210,0.4)]">
                          流年{p.flowName}
                          {p.isLiuNianMing ? ' · 年' : ''}
                          {p.isDaXian ? ' · 限' : ''}
                        </div>
                        <div className="text-[#fff6e2] mt-0.5">
                          {p.natalName}（{p.branch}）
                        </div>
                        <div className="text-[rgba(245,234,210,0.55)] mt-0.5">
                          {p.majors.join('、') || '空'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5 md:p-6">
                  <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)] mb-3">月度四化</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-[rgba(245,234,210,0.4)] border-b border-[var(--line)]">
                          <th className="py-2 text-left font-normal">月</th>
                          <th className="py-2 text-left font-normal">干</th>
                          <th className="py-2 text-left font-normal">禄</th>
                          <th className="py-2 text-left font-normal">权</th>
                          <th className="py-2 text-left font-normal">科</th>
                          <th className="py-2 text-left font-normal">忌</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.months.map((m) => (
                          <tr key={m.month} className="border-b border-[var(--line)]/40">
                            <td className="py-1.5">{m.month}</td>
                            <td className="py-1.5 text-[var(--gold-bright)]">{m.stemName}</td>
                            <td className="py-1.5 text-[rgba(245,234,210,0.65)]">{m.transforms.禄}</td>
                            <td className="py-1.5 text-[rgba(245,234,210,0.65)]">{m.transforms.权}</td>
                            <td className="py-1.5 text-[rgba(245,234,210,0.65)]">{m.transforms.科}</td>
                            <td className="py-1.5 text-[rgba(245,234,210,0.65)]">{m.transforms.忌}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card p-5 md:p-6">
                  <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)] mb-3">人生 K 线</p>
                  <LifeKLine points={data.lifeLine || []} highlightYear={report.year} />
                  {data.daXianLine?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {data.daXianLine.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          className="text-[10px] rounded border border-[var(--line)] px-2 py-1 text-[rgba(245,234,210,0.55)] hover:border-[var(--gold)]"
                          onClick={() => setYear(p.year)}
                          title={`规则分 ${p.score}`}
                        >
                          {p.label} · {p.score}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
