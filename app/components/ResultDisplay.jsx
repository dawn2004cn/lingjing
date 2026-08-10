'use client'

import { useState } from 'react'
import MarkdownBody from './MarkdownBody'

const FOLLOWUPS = {
  ziwei: ['事业宫今年如何？', '感情宫与夫妻宫要点？', '大限当前要注意什么？', '财帛宫与迁移宫？'],
  bazi: ['日主强弱与喜用如何用？', '近十年大运利弊？', '事业方向适合什么？', '感情婚姻大致如何？'],
}

export default function ResultDisplay({
  result,
  error,
  system = 'bazi',
  polished,
  citationWarning,
  onFollowUp,
  followUpLoading,
  thread = [],
  ziweiSchool,
}) {
  const isZiwei = system === 'ziwei'
  const chips = FOLLOWUPS[isZiwei ? 'ziwei' : 'bazi']
  const [draft, setDraft] = useState('')

  if (error) {
    return (
      <div className="card p-7 text-center animate-slide-up mt-5">
        <p className="text-xs tracking-[0.16em] text-[var(--cinnabar)]">ANALYSIS ERROR</p>
        <p className="mt-2 text-sm text-[rgba(247,236,215,0.7)]">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="card p-7 text-center animate-fade-in mt-5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] text-xl text-[var(--gold-bright)]">
          {isZiwei ? '紫' : '卦'}
        </div>
        <p className="text-sm text-[#fff6e2] tracking-wide">等待生辰入盘</p>
        <p className="text-xs text-[rgba(245,234,210,0.45)] mt-2">
          {isZiwei
            ? '先排紫微命盘，再生成规则解读（可 LLM 润色）'
            : '先定四柱与喜用，再生成规则解读（可 LLM 润色）'}
        </p>
      </div>
    )
  }

  const submitDraft = () => {
    const q = draft.trim()
    if (!q || !onFollowUp || followUpLoading) return
    onFollowUp(q)
    setDraft('')
  }

  return (
    <div className="animate-slide-up mt-5">
      {citationWarning?.length > 0 && (
        <div className="mb-3 rounded-lg border border-[var(--cinnabar)]/35 bg-[rgba(184,74,52,0.08)] px-3 py-2 text-[11px] text-[rgba(247,236,215,0.7)]">
          润色引用护栏触发，已回退规则事实。疑似未在盘面出现：
          {citationWarning.join('、')}
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-[var(--gold-bright)] tracking-[0.18em]">
            {isZiwei ? '紫微解读' : '命理分析'}
          </span>
          <span className="text-[10px] text-[rgba(245,234,210,0.4)]">
            {isZiwei && ziweiSchool === 'feixing' ? '飞星 · ' : isZiwei ? '倪师 · ' : ''}
            {polished === false ? '规则事实' : polished ? '规则 + 润色' : 'AI 推演'}
          </span>
        </div>
        <div className="px-6 py-6">
          <MarkdownBody>{result}</MarkdownBody>
        </div>

        {thread.length > 0 && (
          <div className="px-6 pb-4 space-y-4 border-t border-[var(--line)] pt-4">
            <p className="text-[10px] tracking-[0.14em] text-[var(--gold-bright)]">多轮追问</p>
            {thread.map((turn, idx) => (
              <div key={`${idx}-${turn.question}`} className="space-y-2">
                <p className="text-xs text-[rgba(245,234,210,0.55)]">问：{turn.question}</p>
                <div className="rounded-md border border-[var(--line)] bg-[rgba(245,234,210,0.03)] px-3 py-3">
                  <MarkdownBody>{turn.answer}</MarkdownBody>
                </div>
              </div>
            ))}
          </div>
        )}

        {typeof onFollowUp === 'function' && (
          <div className="px-6 pb-6 pt-2 border-t border-[var(--line)]">
            <p className="text-[10px] tracking-[0.14em] text-[var(--gold-bright)] mb-2">继续追问</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!!followUpLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--line)] text-[rgba(245,234,210,0.65)] hover:border-[var(--gold)] hover:text-[#fff6e2] transition-colors disabled:opacity-40"
                  onClick={() => onFollowUp(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-base flex-1 text-sm"
                placeholder="输入自定义问题，可多轮连贯追问"
                value={draft}
                disabled={!!followUpLoading}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitDraft()
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary !w-auto px-4 shrink-0"
                disabled={!!followUpLoading || !draft.trim()}
                onClick={submitDraft}
              >
                {followUpLoading ? '…' : '发送'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
