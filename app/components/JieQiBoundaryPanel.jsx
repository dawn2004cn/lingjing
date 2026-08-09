'use client'

export default function JieQiBoundaryPanel({ probe }) {
  if (!probe?.jieQi) return null
  if (!probe.nearBoundary && !probe.dualRecommended) return null

  return (
    <div className="card mt-5 p-5 md:p-6 border border-[var(--gold)]/35 animate-fade-in">
      <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">JIEQI BOUNDARY</p>
      <h3 className="mt-1 text-lg font-semibold text-[#fff6e2]">节气交界 · 换柱对照</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-[rgba(245,234,210,0.6)]">
        {probe.message}
      </p>

      {probe.pillarsBefore && probe.pillarsAfter && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-md border border-[var(--line)] p-3">
            <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">交界前一刻</div>
            <div className="mt-1 font-mono text-[rgba(245,234,210,0.75)]">{probe.pillarsBefore}</div>
          </div>
          <div className="rounded-md border border-[var(--line)] p-3">
            <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">交界后一刻</div>
            <div className="mt-1 font-mono text-[rgba(245,234,210,0.75)]">{probe.pillarsAfter}</div>
          </div>
        </div>
      )}

      {probe.pillarsCurrent && (
        <p className="mt-3 text-[11px] text-[rgba(245,234,210,0.45)]">
          当前排盘：<span className="font-mono text-[rgba(245,234,210,0.65)]">{probe.pillarsCurrent}</span>
          {probe.yearPillarChanged ? ' · 年柱会变' : ''}
          {probe.monthPillarChanged ? ' · 月柱会变' : ''}
        </p>
      )}
    </div>
  )
}
