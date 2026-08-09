'use client'

/** 八字四柱 + 五行 + 喜用 + 大运 */
export default function BaziPillarsCard({ meta }) {
  if (!meta?.pillars) return null
  const { pillars, dayMaster, wuXing, yongShen, daYun, yunStart, daySect } = meta
  const maxWx = Math.max(1, ...Object.values(wuXing || { 金: 0 }))

  return (
    <div className="card mt-5 p-5 md:p-6 animate-fade-in">
      <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">BAZI CHART</p>
      <h3 className="mt-1 text-lg font-semibold text-[#fff6e2]">四柱排盘</h3>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ['年', pillars.year],
          ['月', pillars.month],
          ['日', pillars.day],
          ['时', pillars.time],
        ].map(([label, gz]) => (
          <div key={label} className="rounded-md border border-[var(--line)] py-3">
            <div className="text-[10px] tracking-widest text-[rgba(245,234,210,0.4)]">{label}</div>
            <div className="mt-1 text-lg text-[var(--gold-bright)]">{gz}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-[rgba(245,234,210,0.7)]">
        日主 <span className="text-[var(--gold-bright)]">{dayMaster}</span>
        {yongShen && (
          <span className="ml-3 text-xs text-[rgba(245,234,210,0.55)]">
            强弱 {yongShen.strength}
            {yongShen.xiYong?.length ? ` · 喜 ${yongShen.xiYong.join('')}` : ''}
          </span>
        )}
      </p>

      {wuXing && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] tracking-[0.14em] text-[rgba(245,234,210,0.4)]">五行</p>
          {['木', '火', '土', '金', '水'].map((el) => (
            <div key={el} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-[rgba(245,234,210,0.55)]">{el}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[rgba(245,234,210,0.08)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--gold)]/70"
                  style={{ width: `${((wuXing[el] || 0) / maxWx) * 100}%` }}
                />
              </div>
              <span className="w-4 text-right text-[rgba(245,234,210,0.45)]">{wuXing[el] || 0}</span>
            </div>
          ))}
        </div>
      )}

      {yongShen?.note && (
        <p className="mt-3 text-[11px] leading-relaxed text-[rgba(245,234,210,0.5)]">{yongShen.note}</p>
      )}

      {daySect?.note && (
        <p className="mt-2 text-[11px] leading-relaxed text-[rgba(215,168,74,0.7)]">
          {daySect.note}
          {daySect.dayPillarAlt
            ? `（本盘日柱 ${daySect.dayPillarUsed}，另一派为 ${daySect.dayPillarAlt}）`
            : ''}
        </p>
      )}

      {daYun?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--line)]">
          <p className="text-[10px] tracking-[0.14em] text-[rgba(245,234,210,0.4)] mb-2">
            大运
            {yunStart ? ` · 起运约${yunStart.years}年${yunStart.months}月` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {daYun.map((d) => (
              <span
                key={`${d.startYear}-${d.ganZhi}`}
                className="rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[rgba(245,234,210,0.7)]"
              >
                {d.startAge}岁 {d.ganZhi}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
