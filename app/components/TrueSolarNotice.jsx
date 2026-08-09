'use client'

/** 真太阳时 / 时辰校正提示条 */
export default function TrueSolarNotice({ trueSolar }) {
  if (!trueSolar) return null

  const crossed = trueSolar.changedTimeIndex || trueSolar.changedDate

  return (
    <div
      className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
        crossed
          ? 'border-[var(--gold)]/40 bg-[rgba(215,168,74,0.1)] text-[var(--gold-bright)]'
          : 'border-[var(--line)] bg-[rgba(245,234,210,0.04)] text-[rgba(245,234,210,0.65)]'
      }`}
    >
      <span className="tracking-[0.12em] text-[rgba(245,234,210,0.45)]">真太阳时</span>
      {' · '}
      校正 {trueSolar.totalCorrectionMin} 分钟
      {trueSolar.eotMethod ? `（${trueSolar.eotMethod === 'meeus' ? 'Meeus' : 'Spencer'}）` : ''}
      {trueSolar.label ? ` → ${trueSolar.label}` : ''}
      {crossed ? ' · 已跨时辰/日期，排盘已按校正后时间' : ' · 未跨时辰，排盘与民用时一致'}
    </div>
  )
}
