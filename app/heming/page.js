'use client'

import { useState } from 'react'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import PersonBirthForm, { emptyPerson } from '../components/PersonBirthForm'
import ChartBoard from '../components/ziwei/ChartBoard'
import HemingMatrixView from '../components/heming/HemingMatrixView'
import LoadingSpinner from '../components/LoadingSpinner'
import MarkdownBody from '../components/MarkdownBody'
import CrossEngineNotice from '../components/CrossEngineNotice'

function isReady(f) {
  const hasTime = !!(f.birthHour || f.birthClock)
  if (!f.birthDate || !hasTime) return false
  if (f.useTrueSolar && (!f.province || !f.city || !f.birthClock)) return false
  return true
}

export default function HemingPage() {
  const [personA, setPersonA] = useState(emptyPerson())
  const [personB, setPersonB] = useState(emptyPerson())
  const [chartA, setChartA] = useState(null)
  const [chartB, setChartB] = useState(null)
  const [patternsA, setPatternsA] = useState([])
  const [patternsB, setPatternsB] = useState([])
  const [crossA, setCrossA] = useState(null)
  const [crossB, setCrossB] = useState(null)
  const [result, setResult] = useState(null)
  const [matrix, setMatrix] = useState(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [citationWarning, setCitationWarning] = useState(null)
  const [polished, setPolished] = useState(undefined)

  const run = async (q) => {
    setError(null)
    if (!isReady(personA) || !isReady(personB)) {
      setError('请先填写双方完整出生日期与时辰')
      return
    }

    setLoading(true)
    setResult(null)
    setMatrix(null)
    setCitationWarning(null)
    setPolished(undefined)

    try {
      let cA = chartA
      let cB = chartB
      let pA = patternsA
      let pB = patternsB

      if (!cA || !cB) {
        const [resA, resB] = await Promise.all([
          fetch('/api/ziwei/chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personA),
          }),
          fetch('/api/ziwei/chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personB),
          }),
        ])
        const dataA = await resA.json()
        const dataB = await resB.json()
        if (!resA.ok) throw new Error(dataA.error || '甲方排盘失败')
        if (!resB.ok) throw new Error(dataB.error || '乙方排盘失败')
        cA = dataA.chart
        cB = dataB.chart
        pA = dataA.patterns || []
        pB = dataB.patterns || []
        setChartA(cA)
        setChartB(cB)
        setPatternsA(pA)
        setPatternsB(pB)
        setCrossA(dataA.crossCheck || null)
        setCrossB(dataB.crossCheck || null)
      }

      const res = await fetch('/api/heming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartA: cA,
          chartB: cB,
          birthA: personA,
          birthB: personB,
          question: q || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '合盘失败')
      setResult(data.result)
      setMatrix(data.matrix || null)
      setCitationWarning(data.citationWarning || null)
      setPolished(data.polished)
      if (data.crossCheckA) setCrossA(data.crossCheckA)
      if (data.crossCheckB) setCrossB(data.crossCheckB)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetCharts = (setter) => (next) => {
    setter(next)
    setChartA(null)
    setChartB(null)
    setCrossA(null)
    setCrossB(null)
    setResult(null)
    setMatrix(null)
  }

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">HEMING</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">紫微合盘</h1>
          <p className="mt-2 max-w-2xl text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">
            输入双方生辰，先排双盘，再基于倪海夏体系互参命宫、夫妻宫与福德宫，生成缘分与相处建议。
            日柱流派与主站一致，写入双方历法旁证。
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/yunshi" className="btn-ghost !text-xs">年度运势</Link>
            <Link href="/library" className="btn-ghost !text-xs">古籍原典</Link>
            <Link href="/knowledge" className="btn-ghost !text-xs">命理百科</Link>
            <Link href="/accuracy" className="btn-ghost !text-xs">准确度口径</Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5 md:p-6">
            <PersonBirthForm
              label="甲方 · A"
              formData={personA}
              onChange={resetCharts(setPersonA)}
            />
          </div>
          <div className="card p-5 md:p-6">
            <PersonBirthForm
              label="乙方 · B"
              formData={personB}
              onChange={resetCharts(setPersonB)}
            />
          </div>
        </div>

        <div className="mt-6 card p-5 md:p-7">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)] mb-3">合盘分析</p>
          {!result && !loading && (
            <p className="text-sm text-[rgba(245,234,210,0.5)] mb-4">
              填好双方信息后开始分析。可追问感情、合伙、婚期等。
            </p>
          )}
          {error && (
            <p className="mb-4 text-sm text-[var(--cinnabar)]">{error}</p>
          )}
          <button
            type="button"
            className="btn-primary max-w-xs"
            disabled={loading}
            onClick={() => run()}
          >
            {loading ? '分析中...' : '开始合盘分析'}
          </button>

          {loading && (
            <div className="mt-6">
              <LoadingSpinner />
            </div>
          )}
        </div>

        {(crossA || crossB) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {crossA && (
              <div>
                <p className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)] mb-1">甲方旁证</p>
                <CrossEngineNotice report={crossA} />
              </div>
            )}
            {crossB && (
              <div>
                <p className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)] mb-1">乙方旁证</p>
                <CrossEngineNotice report={crossB} />
              </div>
            )}
          </div>
        )}

        {matrix && <HemingMatrixView matrix={matrix} />}

        {result && !loading && (
          <div className="mt-6 card p-5 md:p-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">合盘解读</p>
              <span className="text-[10px] text-[rgba(245,234,210,0.4)]">
                {polished === false ? '规则事实' : polished ? '规则 + 润色' : '解读'}
              </span>
            </div>
            {citationWarning?.length > 0 && (
              <div className="mb-3 rounded-lg border border-[var(--cinnabar)]/35 bg-[rgba(184,74,52,0.08)] px-3 py-2 text-[11px] text-[rgba(247,236,215,0.7)]">
                引用护栏触发，已回退结构化事实。疑似未在双盘出现：
                {citationWarning.join('、')}
              </div>
            )}
            <MarkdownBody>{result}</MarkdownBody>

            <div className="mt-8 pt-6 border-t border-[var(--line)] space-y-3">
              <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)]">继续追问</p>
              <div className="flex flex-wrap gap-2">
                {['感情匹配度如何？', '适合合伙创业吗？', '结婚是否合适？', '最易矛盾点？'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--line)] text-[rgba(245,234,210,0.65)] hover:border-[var(--gold)] hover:text-[#fff6e2] transition-colors"
                    onClick={() => { setQuestion(q); run(q) }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-base flex-1"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例如：哪几年是感情关键期？"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) run(question || undefined)
                  }}
                />
                <button
                  type="button"
                  className="btn-primary !w-auto px-5"
                  disabled={loading}
                  onClick={() => run(question || undefined)}
                >
                  追问
                </button>
              </div>
            </div>
          </div>
        )}

        {(chartA || chartB) && (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {chartA && (
              <div>
                <p className="mb-2 text-xs text-[rgba(245,234,210,0.45)]">甲方命盘</p>
                <ChartBoard chart={chartA} patterns={patternsA} />
              </div>
            )}
            {chartB && (
              <div>
                <p className="mb-2 text-xs text-[rgba(245,234,210,0.45)]">乙方命盘</p>
                <ChartBoard chart={chartB} patterns={patternsB} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
