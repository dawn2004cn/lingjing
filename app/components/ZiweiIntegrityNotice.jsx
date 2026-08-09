'use client'

/** 紫微盘面完整性旁证 */
export default function ZiweiIntegrityNotice({ report }) {
  if (!report?.summary) return null

  const tone =
    report.status === 'ok'
      ? 'border-[rgba(107,159,212,0.35)] bg-[rgba(107,159,212,0.06)]'
      : report.status === 'warn'
        ? 'border-[var(--gold)]/35 bg-[rgba(215,168,74,0.06)]'
        : 'border-[var(--cinnabar)]/35 bg-[rgba(184,74,52,0.08)]'

  const label =
    report.status === 'ok' ? '通过' : report.status === 'warn' ? '告警' : '未通过'

  return (
    <div className={`mt-4 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed text-[rgba(245,234,210,0.7)] ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tracking-[0.14em] text-[var(--gold-bright)]">ZIWEI INTEGRITY</span>
        <span className="text-[rgba(245,234,210,0.45)]">{label}</span>
        <span className="text-[rgba(245,234,210,0.35)]">主星 {report.majorCount}/14</span>
      </div>
      <p className="mt-1 text-[rgba(245,234,210,0.65)]">{report.summary}</p>
      {report.notes?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[10px] text-[rgba(245,234,210,0.45)]">
          {report.notes.slice(0, 4).map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
