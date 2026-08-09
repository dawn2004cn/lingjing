'use client'

const SIHUA_COLOR = {
  禄: 'text-[#4f8f78]',
  权: 'text-[#6b9fd4]',
  科: 'text-[var(--gold-bright)]',
  忌: 'text-[var(--cinnabar)]',
}

function FlyTable({ title, rows }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.14em] text-[rgba(245,234,210,0.45)] mb-2">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-[rgba(245,234,210,0.4)] border-b border-[var(--line)]">
              <th className="py-2 pr-2 font-normal">四化</th>
              <th className="py-2 pr-2 font-normal">星</th>
              <th className="py-2 pr-2 font-normal">己盘</th>
              <th className="py-2 font-normal">入对方</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.siHua}-${r.star}`} className="border-b border-[var(--line)]/60">
                <td className={`py-2 pr-2 ${SIHUA_COLOR[r.siHua] || ''}`}>化{r.siHua}</td>
                <td className="py-2 pr-2 text-[#fff6e2]">{r.star || '—'}</td>
                <td className="py-2 pr-2 text-[rgba(245,234,210,0.55)]">{r.selfPalace || '—'}</td>
                <td className="py-2 text-[rgba(245,234,210,0.75)]">{r.otherPalace || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function HemingMatrixView({ matrix }) {
  if (!matrix) return null

  return (
    <div className="card p-5 md:p-6 mt-6 animate-fade-in">
      <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">MUTUAL FLY</p>
      <h3 className="mt-1 text-lg font-semibold text-[#fff6e2]">合盘结构 · 四化互飞</h3>
      <p className="mt-1 text-[11px] text-[rgba(245,234,210,0.45)]">
        以双方生年干四化落宫对照；解读须同时参看命宫、夫妻、福德。
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[rgba(245,234,210,0.4)] border-b border-[var(--line)]">
              <th className="py-2 pr-3 text-left font-normal">宫位</th>
              <th className="py-2 pr-3 text-left font-normal">甲方</th>
              <th className="py-2 text-left font-normal">乙方</th>
            </tr>
          </thead>
          <tbody>
            {matrix.keyPalaces.map((row) => (
              <tr key={row.name} className="border-b border-[var(--line)]/50 align-top">
                <td className="py-2.5 pr-3 text-[var(--gold-bright)] whitespace-nowrap">{row.name}</td>
                <td className="py-2.5 pr-3 text-[rgba(245,234,210,0.7)]">
                  {row.a ? (
                    <>
                      <span className="text-[rgba(245,234,210,0.4)]">{row.a.ganZhi}</span>
                      {' '}
                      {row.a.majors.join('、') || '空宫'}
                      {row.a.siHuaTags?.length > 0 && (
                        <span className="block text-[10px] text-[rgba(245,234,210,0.4)] mt-0.5">
                          {row.a.siHuaTags.join(' · ')}
                        </span>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="py-2.5 text-[rgba(245,234,210,0.7)]">
                  {row.b ? (
                    <>
                      <span className="text-[rgba(245,234,210,0.4)]">{row.b.ganZhi}</span>
                      {' '}
                      {row.b.majors.join('、') || '空宫'}
                      {row.b.siHuaTags?.length > 0 && (
                        <span className="block text-[10px] text-[rgba(245,234,210,0.4)] mt-0.5">
                          {row.b.siHuaTags.join(' · ')}
                        </span>
                      )}
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <FlyTable title="甲年干四化 → 乙盘" rows={matrix.aToB} />
        <FlyTable title="乙年干四化 → 甲盘" rows={matrix.bToA} />
      </div>

      {matrix.summaryLines?.length > 0 && (
        <ul className="mt-5 space-y-1 text-[11px] text-[rgba(245,234,210,0.5)]">
          {matrix.summaryLines.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
