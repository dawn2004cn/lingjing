'use client'

const STATUS_LABEL = {
  match: '校验通过',
  sect_diff: '流派差异',
  partial: '部分一致',
  mismatch: '未通过',
  skipped: '未校验',
}

export default function CrossEngineNotice({ report }) {
  if (!report?.summary) return null

  const tone =
    report.status === 'match'
      ? 'border-[rgba(107,159,212,0.35)] bg-[rgba(107,159,212,0.06)]'
      : report.status === 'sect_diff' || report.status === 'partial'
        ? 'border-[var(--gold)]/35 bg-[rgba(215,168,74,0.06)]'
        : 'border-[var(--cinnabar)]/35 bg-[rgba(184,74,52,0.08)]'

  const alignSect2 = report.pillars?.matchSect2 && !report.pillars?.matchDefault
  const alignDefault = report.pillars?.matchDefault && !report.pillars?.matchSect2

  return (
    <div className={`mt-4 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed text-[rgba(245,234,210,0.7)] ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tracking-[0.14em] text-[var(--gold-bright)]">CROSS ENGINE</span>
        <span className="text-[rgba(245,234,210,0.45)]">
          {STATUS_LABEL[report.status] || report.status}
        </span>
        <span className="text-[rgba(245,234,210,0.35)]">
          {report.engines?.primary} ↔ {report.engines?.secondary}
        </span>
        {report.daySect != null && (
          <span className="text-[rgba(245,234,210,0.35)]">日柱流派{report.daySect}</span>
        )}
      </div>
      <p className="mt-1 text-[rgba(245,234,210,0.65)]">{report.summary}</p>
      {report.pillars && (
        <div className="mt-1.5 space-y-0.5 text-[10px] text-[rgba(245,234,210,0.45)] font-mono">
          <div>主引擎 {report.pillars.primary}</div>
          {(report.status === 'sect_diff' || !report.pillars.matchDefault) && (
            <div>tyme默认 {report.pillars.tymeDefault}{alignDefault ? '（本盘对齐）' : ''}</div>
          )}
          {(report.status === 'sect_diff' || !report.pillars.matchSect2) && (
            <div>tyme流派2 {report.pillars.tymeSect2}{alignSect2 ? '（本盘对齐）' : ''}</div>
          )}
        </div>
      )}
      {report.status === 'sect_diff' && (
        <p className="mt-1.5 text-[10px] text-[rgba(245,234,210,0.5)]">
          {alignDefault
            ? '本盘采用流派1（23:00后换日）；另一派为不跨日。'
            : '本盘采用流派2（23:00后不跨日）；另一派为换日。'}
          八字主盘与紫微历法旁证共用同一日柱流派。解读时已写入规则事实。
        </p>
      )}
      {report.status === 'mismatch' && (
        <p className="mt-1.5 text-[10px] text-[rgba(247,200,180,0.75)]">
          两引擎未对齐，请人工复核后再下结论。
        </p>
      )}
    </div>
  )
}
