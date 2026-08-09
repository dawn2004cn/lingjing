'use client'

/** 人生 K 线：纯 SVG，规则分 */
export default function LifeKLine({ points = [], height = 160, highlightYear }) {
  if (!points.length) return null

  const w = Math.max(320, points.length * 4)
  const pad = { t: 16, r: 12, b: 28, l: 32 }
  const innerW = w - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const minS = Math.min(...points.map((p) => p.score), 0)
  const maxS = Math.max(...points.map((p) => p.score), 100)
  const span = Math.max(1, maxS - minS)

  const xy = (i, score) => {
    const x = pad.l + (i / Math.max(1, points.length - 1)) * innerW
    const y = pad.t + (1 - (score - minS) / span) * innerH
    return [x, y]
  }

  const d = points
    .map((p, i) => {
      const [x, y] = xy(i, p.score)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const hi = highlightYear != null
    ? points.findIndex((p) => p.year === highlightYear)
    : -1

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${height}`} className="min-w-full" role="img" aria-label="人生运势曲线">
        <line
          x1={pad.l}
          y1={pad.t + innerH / 2}
          x2={w - pad.r}
          y2={pad.t + innerH / 2}
          stroke="rgba(245,234,210,0.12)"
        />
        <path d={d} fill="none" stroke="rgba(215,168,74,0.85)" strokeWidth="1.6" />
        {hi >= 0 && (() => {
          const [x, y] = xy(hi, points[hi].score)
          return (
            <g>
              <circle cx={x} cy={y} r="4" fill="var(--gold-bright)" />
              <text x={x} y={y - 8} textAnchor="middle" fill="rgba(245,234,210,0.7)" fontSize="10">
                {points[hi].score}
              </text>
            </g>
          )
        })()}
        <text x={pad.l} y={height - 8} fill="rgba(245,234,210,0.35)" fontSize="10">
          {points[0].year}
        </text>
        <text x={w - pad.r} y={height - 8} textAnchor="end" fill="rgba(245,234,210,0.35)" fontSize="10">
          {points[points.length - 1].year}
        </text>
        <text x={4} y={pad.t + 4} fill="rgba(245,234,210,0.35)" fontSize="9">{Math.round(maxS)}</text>
        <text x={4} y={pad.t + innerH} fill="rgba(245,234,210,0.35)" fontSize="9">{Math.round(minS)}</text>
      </svg>
      <p className="text-[10px] text-[rgba(245,234,210,0.35)] mt-1">
        规则加权分，仅反映流年四化与大限宫亮度倾向，不作吉凶断言
      </p>
    </div>
  )
}
