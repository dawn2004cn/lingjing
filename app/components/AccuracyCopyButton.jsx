'use client'

import { useState } from 'react'

const BLURB = `灵镜准确度口径
· 确定性排盘 → 规则事实 →（可选）LLM 润色
· 八字：lunar-javascript；默认日柱流派2（23:00后不跨日）
· 对照：tyme4ts；八字与紫微旁证共用日柱流派；仅流派差标 sect_diff
· 紫微：iztro；历法底座交叉校验
· 真太阳时：东经120°，Meeus均时差（失败回退Spencer），须钟点+省市
· 紫微：iztro；十四主星完整性 + 历法底座交叉
· 时辰交界≤20分钟双盘；十二节精确换月（2020–2026抽检）
· citation 回退可观测（/admin）
详情：/accuracy`

export default function AccuracyCopyButton() {
  const [done, setDone] = useState(false)

  const copy = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const text = `${BLURB}\n${origin}/accuracy`
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setDone(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn-ghost !text-xs border border-[var(--line)]"
    >
      {done ? '已复制' : '复制口径摘要'}
    </button>
  )
}
