'use client'

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export default function DualBoundaryPanel({ dual, system }) {
  if (!dual?.applicable || !dual.probe?.nearBoundary) return null

  const isZiwei = system === 'ziwei'
  const diff = dual.ziwei?.diff
  const bazi = dual.bazi

  return (
    <div className="card mt-5 p-5 md:p-6 border border-[var(--gold)]/35 animate-fade-in">
      <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">BOUNDARY DUAL</p>
      <h3 className="mt-1 text-lg font-semibold text-[#fff6e2]">边界时辰 · 双盘对照</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-[rgba(245,234,210,0.6)]">
        {dual.probe.message}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
        <div className="rounded-md border border-[var(--line)] p-3">
          <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">当前时辰</div>
          <div className="mt-1 text-[var(--gold-bright)]">{dual.probe.currentLabel}</div>
          {isZiwei && diff && (
            <div className="mt-2 text-[rgba(245,234,210,0.65)] space-y-1">
              <div>命宫 {BRANCHES[diff.mingGongA]} · {diff.wuxingJuA}</div>
              <div>主星 {diff.mingMajorsA}</div>
            </div>
          )}
          {!isZiwei && bazi && (
            <div className="mt-2 text-[rgba(245,234,210,0.65)]">{bazi.snapA}</div>
          )}
        </div>
        <div className="rounded-md border border-[var(--line)] p-3">
          <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">邻近时辰</div>
          <div className="mt-1 text-[#6b9fd4]">{dual.probe.alternateLabel}</div>
          {isZiwei && diff && (
            <div className="mt-2 text-[rgba(245,234,210,0.65)] space-y-1">
              <div>命宫 {BRANCHES[diff.mingGongB]} · {diff.wuxingJuB}</div>
              <div>主星 {diff.mingMajorsB}</div>
            </div>
          )}
          {!isZiwei && bazi && (
            <div className="mt-2 text-[rgba(245,234,210,0.65)]">{bazi.snapB}</div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[rgba(245,234,210,0.45)]">
        {isZiwei
          ? `命宫${diff?.mingGongChanged ? '已变' : '未变'} · 五行局${diff?.wuxingJuChanged ? '已变' : '未变'} · 主星${diff?.mingMajorsA !== diff?.mingMajorsB ? '已变' : '未变'}`
          : `四柱${bazi?.pillarsChanged ? '已变（多在时柱）' : '未变'}`}
        。交界处请对照后再下结论。
      </p>
    </div>
  )
}
