'use client'

import { useState } from 'react'
import MarkdownBody from './MarkdownBody'

const SIDECAR_SYSTEMS = new Set(['taiyi', 'huangji', 'qimen', 'daliuren', 'jinkou'])

function statusColor(status) {
  if (status === 'ok' || status === true) return 'text-[rgba(120,180,120,0.9)]'
  if (status === 'warn') return 'text-[rgba(215,168,74,0.95)]'
  if (status === 'fail' || status === false) return 'text-[rgba(196,92,74,0.95)]'
  return 'text-[rgba(245,234,210,0.45)]'
}

function StatusStrip({ payload, system }) {
  const integrity = payload.integrity
  const witness = payload.chart?.witness
  const pyNote = payload.meta?.pyNote
  const pyEngine = payload.meta?.pyEngine
  const pyOk =
    pyEngine && typeof pyEngine === 'object' ? pyEngine.ok !== false && !pyEngine.error : null
  const pyStub =
    pyEngine && typeof pyEngine === 'object' && String(pyEngine.engine || '').includes('stub')

  return (
    <div className="space-y-2 border border-[var(--line)] rounded-md px-3 py-2.5">
      <p className="text-[10px] tracking-[0.16em] text-[rgba(245,234,210,0.35)]">OUTPUT STATUS</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className={statusColor(integrity?.status)}>
          integrity: {integrity?.status || '—'}
        </span>
        {witness && (
          <span className={statusColor(witness.status)}>
            witness: {witness.status}
            {witness.engine ? ` · ${witness.engine}` : ''}
          </span>
        )}
        {SIDECAR_SYSTEMS.has(system) && (
          <span
            className={statusColor(
              pyNote ? (pyStub || pyOk === false ? 'warn' : 'ok') : 'warn',
            )}
          >
            pyEngine:{' '}
            {pyNote
              ? pyStub
                ? 'stub（包未装或失败）'
                : pyOk === false
                  ? '不可用'
                  : '已并入'
              : '未调用（未配置 PY_ENGINE_URL 或不可达）'}
          </span>
        )}
      </div>
      {integrity?.summary && (
        <p className="text-[11px] text-[rgba(245,234,210,0.45)] leading-relaxed">
          {integrity.summary}
        </p>
      )}
      {witness?.summary && (
        <p className="text-[11px] text-[rgba(245,234,210,0.4)] leading-relaxed">
          MIT 旁证：{witness.summary}
        </p>
      )}
      {pyNote && (
        <p className="text-[11px] text-[rgba(245,234,210,0.4)] leading-relaxed">sidecar：{pyNote}</p>
      )}
    </div>
  )
}

/**
 * 通用占卜起盘面板
 * fields: { key, label, type: 'text'|'date'|'time'|'number'|'select'|'textarea', options?, placeholder? }[]
 */
export default function CastPanel({
  system,
  title,
  blurb,
  researchOnly,
  requiresHumanReview,
  fields,
  initial = {},
}) {
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [polish, setPolish] = useState(false)

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/divination/${system}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, polish }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '请求失败')
      setPayload(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--gold-bright)] tracking-wide">{title}</h1>
        <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">{blurb}</p>
        {researchOnly && (
          <p className="mt-2 text-xs text-[rgba(215,168,74,0.85)] border border-[var(--gold)]/30 rounded-md px-3 py-2">
            研究级模块：侧重宏观/结构演示，不作日常一事一占的绝对断言。
          </p>
        )}
        {requiresHumanReview && (
          <p className="mt-2 text-xs text-[rgba(196,92,74,0.95)] border border-[var(--cinnabar)]/35 rounded-md px-3 py-2">
            须人工复核：本系统含自研简化或边界课体；排盘事实可复现，重大决策请对照旁证并人工核验，勿直接作绝对断言。
          </p>
        )}
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <label key={f.key} className={`block text-xs ${f.full ? 'sm:col-span-2' : ''}`}>
              <span className="text-[rgba(245,234,210,0.45)] tracking-widest">{f.label}</span>
              {f.type === 'select' ? (
                <select
                  className="mt-1 w-full rounded-md bg-[rgba(0,0,0,0.25)] border border-[var(--line)] px-3 py-2 text-sm"
                  value={form[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className="mt-1 w-full rounded-md bg-[rgba(0,0,0,0.25)] border border-[var(--line)] px-3 py-2 text-sm min-h-[72px]"
                  value={form[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  className="mt-1 w-full rounded-md bg-[rgba(0,0,0,0.25)] border border-[var(--line)] px-3 py-2 text-sm"
                  value={form[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                />
              )}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-[rgba(245,234,210,0.55)]">
          <input type="checkbox" checked={polish} onChange={(e) => setPolish(e.target.checked)} />
          尝试 LLM 润色（需登录；计日额度；失败或额度不足则回退规则事实）
        </label>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? '起盘中…' : '起盘 / 排盘'}
        </button>
        {error && <p className="text-xs text-[var(--cinnabar)]">{error}</p>}
      </form>

      {payload && (
        <div className="card p-5 space-y-3">
          <div className="flex flex-wrap gap-2 text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">
            <span>{payload.system}</span>
            {payload.polished === false && <span>规则事实</span>}
            {payload.polished === true && <span>已润色</span>}
          </div>
          <StatusStrip payload={payload} system={system} />
          {payload.quotaWarning && (
            <p className="text-[11px] text-[rgba(242,207,122,0.75)]">{payload.quotaWarning}</p>
          )}
          <MarkdownBody content={payload.result || payload.ruleReading} />
          {payload.chart && (
            <details className="text-[11px] text-[rgba(245,234,210,0.4)]">
              <summary className="cursor-pointer tracking-widest">结构化盘面 JSON</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all border border-[var(--line)] rounded-md p-3 text-[10px] text-[rgba(245,234,210,0.55)]">
                {JSON.stringify(payload.chart, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
