'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from './components/AuthContext'
import FortuneForm from './components/FortuneForm'
import ResultDisplay from './components/ResultDisplay'
import LoadingSpinner from './components/LoadingSpinner'
import NavBar from './components/NavBar'
import ChartBoard from './components/ziwei/ChartBoard'
import BaziPillarsCard from './components/BaziPillarsCard'
import TrueSolarNotice from './components/TrueSolarNotice'
import DualBoundaryPanel from './components/DualBoundaryPanel'
import JieQiBoundaryPanel from './components/JieQiBoundaryPanel'
import CrossEngineNotice from './components/CrossEngineNotice'
import ZiweiIntegrityNotice from './components/ZiweiIntegrityNotice'
import ShareCard from './components/ShareCard'
import { emptyBirthExtras } from './components/birthOptions'
import Link from 'next/link'

export default function HomeClient() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    gender: '男',
    calendarType: '公历',
    birthDate: '',
    birthHour: '',
    system: 'bazi',
    ...emptyBirthExtras(),
  })

  useEffect(() => {
    if (!searchParams) return
    const name = searchParams.get('name')
    const birthDate = searchParams.get('birthDate')
    if (!name && !birthDate) return
    setFormData((prev) => ({
      ...prev,
      name: name || prev.name,
      gender: searchParams.get('gender') || prev.gender,
      calendarType: searchParams.get('calendarType') || prev.calendarType,
      birthDate: birthDate || prev.birthDate,
      birthHour: searchParams.get('birthHour') || prev.birthHour,
      birthClock: searchParams.get('birthClock') || prev.birthClock,
      system: searchParams.get('system') || prev.system,
      isLeapMonth: searchParams.get('isLeapMonth') === '1',
      useTrueSolar: searchParams.get('useTrueSolar') === '1',
      province: searchParams.get('province') || prev.province,
      city: searchParams.get('city') || prev.city,
      daySect: searchParams.get('daySect') === '1' ? 1 : 2,
    }))
  }, [searchParams])
  const [chartLoading, setChartLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [chart, setChart] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [trueSolar, setTrueSolar] = useState(null)
  const [baziMeta, setBaziMeta] = useState(null)
  const [polished, setPolished] = useState(undefined)
  const [citationWarning, setCitationWarning] = useState(null)
  const [dualBoundary, setDualBoundary] = useState(null)
  const [crossCheck, setCrossCheck] = useState(null)
  const [integrity, setIntegrity] = useState(null)
  const [jieQiBoundary, setJieQiBoundary] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showAuthHint, setShowAuthHint] = useState(false)

  const system = formData.system || 'bazi'
  const isZiwei = system === 'ziwei'
  const loading = chartLoading || analyzeLoading

  const handleSystemChange = (next) => {
    setFormData(next)
    if (next.system !== formData.system) {
      setChart(null)
      setPatterns([])
      setTrueSolar(null)
      setBaziMeta(null)
      setResult(null)
      setPolished(undefined)
      setCitationWarning(null)
      setDualBoundary(null)
      setCrossCheck(null)
      setJieQiBoundary(null)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!user) {
      setShowAuthHint(true)
      return
    }
    setShowAuthHint(false)

    fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).catch(() => {})

    setResult(null)
    setError(null)
    setTrueSolar(null)
    setBaziMeta(null)
    setPolished(undefined)
    setCitationWarning(null)
    setDualBoundary(null)
    setCrossCheck(null)
    setIntegrity(null)
    setJieQiBoundary(null)

    try {
      let chartText = ''

      if (isZiwei) {
        setChart(null)
        setPatterns([])
        setChartLoading(true)
        const chartRes = await fetch('/api/ziwei/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const chartData = await chartRes.json()
        if (!chartRes.ok) throw new Error(chartData.error || '排盘失败')
        setChart(chartData.chart)
        setPatterns(chartData.patterns || [])
        setTrueSolar(chartData.trueSolar || null)
        if (chartData.dualBoundary) setDualBoundary(chartData.dualBoundary)
        if (chartData.crossCheck) setCrossCheck(chartData.crossCheck)
        if (chartData.integrity) setIntegrity(chartData.integrity)
        chartText = chartData.promptText || ''
        setChartLoading(false)
      } else {
        setChart(null)
        setPatterns([])
        setIntegrity(null)
      }

      setAnalyzeLoading(true)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          chartText: isZiwei ? chartText : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '请求失败')
      setResult(data.result)
      setPolished(data.polished)
      setCitationWarning(data.citationWarning || null)
      if (data.dualBoundary) setDualBoundary(data.dualBoundary)
      if (data.crossCheck) setCrossCheck(data.crossCheck)
      if (data.integrity) setIntegrity(data.integrity)
      if (data.jieQiBoundary) setJieQiBoundary(data.jieQiBoundary)
      if (!isZiwei && data.chartMeta) {
        setBaziMeta(data.chartMeta)
        setTrueSolar(data.chartMeta.trueSolar || null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setChartLoading(false)
      setAnalyzeLoading(false)
    }
  }

  const handleFollowUp = async (question) => {
    if (!user || !result) return
    setAnalyzeLoading(true)
    setError(null)
    setCitationWarning(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          question,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '追问失败')
      setResult(data.result)
      setPolished(data.polished)
      setCitationWarning(data.citationWarning || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const methodLabel = isZiwei ? '紫微排盘' : '八字排盘'
  const focusLabel = isZiwei ? '十二宫星曜' : '五行旺衰'

  return (
    <div className="page-shell">
      <NavBar />

      <main className="app-container relative z-10 pt-28 pb-16 md:pt-32">
        <div className="hero-grid">
          <section className="animate-fade-in pt-4 md:pt-10">
            <div className="hero-kicker">
              <span className="h-px w-8 bg-[var(--gold)]" />
              AI 命理 · 八字 / 紫微
            </div>
            <h1 className="hero-title">灵镜</h1>
            <p className="hero-subtitle">
              以出生年月日时为引，可选八字或紫微斗数。支持早晚子、闰月与真太阳时；紫微走真实排盘，八字先定柱位再解读。
            </p>

            <div className="oracle-strip animate-slide-up">
              <div>
                <div className="oracle-label">METHOD</div>
                <div className="oracle-value">{methodLabel}</div>
              </div>
              <div>
                <div className="oracle-label">FOCUS</div>
                <div className="oracle-value">{focusLabel}</div>
              </div>
              <div>
                <div className="oracle-label">OUTPUT</div>
                <div className="oracle-value">AI 解读</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              <Link href="/heming" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">合盘分析</Link>
              <Link href="/yunshi" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">年度运势</Link>
              <Link href="/history" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">命盘历史</Link>
              <Link href="/accuracy" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">准确度</Link>
              <Link href="/library" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">古籍原典</Link>
              <Link href="/knowledge" className="btn-ghost !text-xs border border-[var(--line)] !rounded-full !px-3">命理百科</Link>
            </div>
          </section>

          <section className="animate-fade-in">
            <div className="card p-5 md:p-7">
              <div className="form-card-heading">
                <div>
                  <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">BIRTH CHART</p>
                  <h2 className="mt-1 text-xl font-semibold text-[#fff6e2]">填写生辰</h2>
                </div>
                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-[var(--gold-bright)]">
                  {isZiwei ? '紫' : '命'}
                </div>
              </div>
              <FortuneForm
                formData={formData}
                onChange={handleSystemChange}
                onSubmit={handleAnalyze}
                loading={loading}
              />

              {showAuthHint && (
                <div className="mt-5 p-4 rounded-lg border border-[var(--cinnabar)]/30 bg-[rgba(184,74,52,0.08)] animate-slide-up">
                  <p className="text-sm text-[#fff6e2] font-medium mb-2">请先登录或注册</p>
                  <p className="text-xs text-[rgba(245,234,210,0.6)] mb-3">需要注册账号后才能使用命理测算功能</p>
                  <div className="flex gap-2">
                    <Link href="/login" className="flex-1 text-center py-2 rounded-md text-xs font-semibold bg-[rgba(245,234,210,0.08)] text-[var(--gold-bright)] hover:bg-[rgba(245,234,210,0.14)] transition-colors">
                      登录
                    </Link>
                    <Link href="/register" className="flex-1 text-center py-2 rounded-md text-xs font-semibold bg-[var(--gold)] text-[#140d05] hover:brightness-110 transition-all">
                      免费注册
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <TrueSolarNotice trueSolar={trueSolar} />

            <DualBoundaryPanel dual={dualBoundary} system={system} />
            <JieQiBoundaryPanel probe={jieQiBoundary} />
            <CrossEngineNotice report={crossCheck} />
            <ZiweiIntegrityNotice report={integrity} />

            {(chart || baziMeta) && (
              <div className="mt-4 flex justify-end">
                <ShareCard
                  system={system}
                  subtitle={`${formData.name || '命主'} · ${formData.birthDate} ${formData.birthHour || formData.birthClock || ''}`}
                  badges={[
                    crossCheck?.status === 'match'
                      ? '跨引擎通过'
                      : crossCheck?.status === 'sect_diff'
                        ? '日柱流派2'
                        : crossCheck?.status === 'mismatch'
                          ? '交叉未通过'
                          : crossCheck?.status
                            ? '交叉部分一致'
                            : null,
                    jieQiBoundary?.nearBoundary ? `近${jieQiBoundary.jieQi?.name || '节气'}` : null,
                    dualBoundary?.applicable ? '时辰双盘' : null,
                    formData.useTrueSolar ? '真太阳时' : null,
                    integrity?.status === 'ok'
                      ? '盘面完整'
                      : integrity?.status === 'fail'
                        ? '盘面异常'
                        : integrity?.status === 'warn'
                          ? '盘面告警'
                          : null,
                    Number(formData.daySect) === 1 ? '日柱流派1' : '日柱流派2',
                  ]}
                  lines={
                    isZiwei && chart
                      ? [
                          `${chart.wuxingJuName} · 命${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][chart.mingGongBranch]}`,
                          ...(patterns || []).slice(0, 4).map((p) => `格局：${p.name}`),
                          crossCheck?.summary || '',
                        ].filter(Boolean)
                      : baziMeta
                        ? [
                            `四柱 ${baziMeta.pillars.year} ${baziMeta.pillars.month} ${baziMeta.pillars.day} ${baziMeta.pillars.time}`,
                            `日主 ${baziMeta.dayMaster}`,
                            baziMeta.yongShen
                              ? `喜用 ${baziMeta.yongShen.xiYong?.join('') || ''}（${baziMeta.yongShen.strength}）`
                              : '',
                            crossCheck?.summary || '',
                          ].filter(Boolean)
                        : []
                  }
                />
              </div>
            )}

            {!isZiwei && baziMeta && <BaziPillarsCard meta={baziMeta} />}

            {isZiwei && chart && (
              <ChartBoard chart={chart} patterns={patterns} />
            )}
            {chartLoading && !chart ? (
              <div className="card mt-5">
                <LoadingSpinner />
              </div>
            ) : analyzeLoading ? (
              <div className="card mt-5">
                <LoadingSpinner />
              </div>
            ) : (
              <ResultDisplay
                result={result}
                error={error}
                system={system}
                polished={polished}
                citationWarning={citationWarning}
                onFollowUp={handleFollowUp}
                followUpLoading={analyzeLoading}
              />
            )}
          </section>
        </div>

        <footer className="mt-14 flex flex-col items-center gap-2 text-xs text-[rgba(245,234,210,0.32)]">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[rgba(215,168,74,0.2)]" />
            <span>灵镜</span>
            <span className="h-px w-10 bg-[rgba(215,168,74,0.2)]" />
          </div>
          <p>
            确定性排盘 + 规则护栏 · 紫微基于{' '}
            <a
              href="https://github.com/Renhuai123/ziwei-doushu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[rgba(242,207,122,0.55)] hover:text-[var(--gold-bright)] transition-colors"
            >
              ziwei-doushu
            </a>
            {' '}/ iztro
          </p>
        </footer>
      </main>
    </div>
  )
}
