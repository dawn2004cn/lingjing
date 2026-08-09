'use client'

import { useState } from 'react'
import MarkdownBody from './MarkdownBody'

/**
 * 通用占卜起盘面板
 * fields: { key, label, type: 'text'|'date'|'time'|'number'|'select'|'textarea', options?, placeholder? }[]
 */
export default function CastPanel({
  system,
  title,
  blurb,
  researchOnly,
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
          尝试 LLM 润色（需配置 API Key；失败则回退规则事实）
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
            {payload.integrity?.status && <span>旁证 {payload.integrity.status}</span>}
          </div>
          <MarkdownBody content={payload.result || payload.ruleReading} />
        </div>
      )}
    </div>
  )
}
