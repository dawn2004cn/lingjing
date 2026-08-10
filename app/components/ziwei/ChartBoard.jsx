'use client'

import { useMemo, useState } from 'react'
import PalaceCell from './PalaceCell'
import { buildOverlay } from '@/lib/ziwei/overlay'

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 地支 → 4x4 网格 [row, col]，1-indexed */
const BRANCH_GRID_POS = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1],                   9: [2, 4],
  3: [3, 1],                   10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
}

const ANIMATION_ORDER = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4]

function getSanFangSiZheng(branch) {
  return [
    branch,
    (branch + 6) % 12,
    (branch + 4) % 12,
    (branch + 8) % 12,
  ]
}

export default function ChartBoard({ chart, patterns = [], school = 'ni' }) {
  const [selectedBranch, setSelectedBranch] = useState(null)
  const birthYear = chart?.birthInfo?.year || 1990
  const [year, setYear] = useState(() => new Date().getFullYear())
  const ziweiSchool = school === 'feixing' ? 'feixing' : 'ni'

  const overlay = useMemo(
    () => (chart ? buildOverlay(chart, year, { school: ziweiSchool }) : null),
    [chart, year, ziweiSchool],
  )

  if (!chart?.palaces?.length) return null

  const palaceMap = {}
  chart.palaces.forEach((p) => { palaceMap[p.branch] = p })

  const sanFang = selectedBranch !== null ? getSanFangSiZheng(selectedBranch) : null
  const sanFangSet = sanFang ? new Set(sanFang) : null

  const yearMin = birthYear
  const yearMax = birthYear + 90

  return (
    <div className="ziwei-board card animate-slide-up mt-5 overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">ZI WEI CHART</p>
          <h3 className="mt-1 text-lg font-semibold text-[#fff6e2]">
            {chart.birthInfo?.name ? `${chart.birthInfo.name} · ` : ''}紫微命盘
          </h3>
        </div>
        <div className="text-right text-xs text-[rgba(245,234,210,0.55)]">
          <div>{chart.wuxingJuName}</div>
          <div className="mt-0.5">
            命{BRANCHES[chart.mingGongBranch]} · 身{BRANCHES[chart.shenGongBranch]}
          </div>
          <div className="mt-0.5 text-[var(--gold-bright)]">
            {ziweiSchool === 'feixing' ? '飞星口径' : '倪师口径'}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[var(--line)] flex flex-wrap items-center gap-3">
        <span className="text-[10px] tracking-[0.14em] text-[rgba(245,234,210,0.45)]">TIME NAV</span>
        <button
          type="button"
          className="btn-ghost !text-xs !px-2 !py-1"
          onClick={() => setYear((y) => Math.max(yearMin, y - 1))}
        >
          −年
        </button>
        <input
          type="number"
          className="input-base !w-24 !py-1 !text-sm text-center"
          value={year}
          min={yearMin}
          max={yearMax}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!Number.isNaN(v)) setYear(Math.min(yearMax, Math.max(yearMin, v)))
          }}
        />
        <button
          type="button"
          className="btn-ghost !text-xs !px-2 !py-1"
          onClick={() => setYear((y) => Math.min(yearMax, y + 1))}
        >
          +年
        </button>
        <button
          type="button"
          className="btn-ghost !text-xs !px-2 !py-1"
          onClick={() => setYear(new Date().getFullYear())}
        >
          今年
        </button>
        {overlay && (
          <p className="text-[11px] text-[rgba(245,234,210,0.55)] w-full sm:w-auto sm:ml-auto">
            虚岁约{overlay.age}
            {overlay.daXianName ? ` · 大限${overlay.daXianName}` : ''}
            {' · '}流年{overlay.liuNianStemName}干四化
            禄{overlay.transforms.禄}/权{overlay.transforms.权}/科{overlay.transforms.科}/忌{overlay.transforms.忌}
          </p>
        )}
      </div>

      {chart.daXians?.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto text-[11px]">
          {chart.daXians.map((dx, idx) => (
            <button
              key={`${dx.startAge}-${dx.palaceBranch}`}
              type="button"
              className={`shrink-0 rounded-md border px-2 py-1 transition-colors ${
                overlay?.daXianIndex === idx
                  ? 'border-[var(--gold)] text-[var(--gold-bright)] bg-[rgba(215,168,74,0.12)]'
                  : 'border-[var(--line)] text-[rgba(245,234,210,0.5)]'
              }`}
              onClick={() => setYear(birthYear + dx.startAge)}
            >
              {dx.startAge}–{dx.endAge} · {dx.palaceName}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 sm:p-4">
        <div className="ziwei-grid">
          {ANIMATION_ORDER.map((branch) => {
            const [row, col] = BRANCH_GRID_POS[branch]
            const palace = palaceMap[branch]
            if (!palace) return null
            return (
              <div
                key={branch}
                style={{ gridRow: row, gridColumn: col }}
              >
                <PalaceCell
                  palace={palace}
                  isSelected={selectedBranch === branch}
                  isSanFang={!!(sanFangSet?.has(branch) && selectedBranch !== branch)}
                  isFocusDaXian={overlay?.daXianBranch === branch}
                  isLiuNianMing={overlay?.liuNianMingBranch === branch}
                  liuNianStarMap={overlay?.liuNianStarMap}
                  onClick={() =>
                    setSelectedBranch((prev) => (prev === branch ? null : branch))
                  }
                />
              </div>
            )
          })}

          <div className="ziwei-center">
            <div className="ziwei-center-seal">☯</div>
            <p className="ziwei-center-title">紫微斗数</p>
            <p className="ziwei-center-meta">
              命宫 {BRANCHES[chart.mingGongBranch]}
              <span>·</span>
              身宫 {BRANCHES[chart.shenGongBranch]}
            </p>
            <p className="ziwei-center-ju">{chart.wuxingJuName}</p>
            {overlay?.daXianName && (
              <p className="ziwei-center-dx">
                {year} · 大限 {overlay.daXianName}
              </p>
            )}
            <p className="ziwei-center-lunar">
              农历 {chart.lunarInfo.lunarYear}·
              {chart.lunarInfo.isLeapMonth ? '闰' : ''}
              {chart.lunarInfo.lunarMonth}·{chart.lunarInfo.lunarDay}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[rgba(245,234,210,0.45)]">
          {[
            { h: '本命化禄', c: 'ziwei-sihua-lu' },
            { h: '本命化权', c: 'ziwei-sihua-quan' },
            { h: '本命化科', c: 'ziwei-sihua-ke' },
            { h: '本命化忌', c: 'ziwei-sihua-ji' },
          ].map(({ h, c }) => (
            <span key={h} className={`ziwei-legend ${c}`}>{h}</span>
          ))}
          <span>限=大限宫 · 年=流年命宫位 · 流X=流年四化落本命星</span>
        </div>

        {ziweiSchool === 'feixing' && overlay && (
          <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
            <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)]">飞星 · 来因 / 自化 / 飞化链</p>
            {overlay.laiYin?.length > 0 && (
              <div className="text-[11px] text-[rgba(245,234,210,0.7)] space-y-1">
                {overlay.laiYin.map((e) => (
                  <p key={`${e.siHua}-${e.starName}`}>
                    <span className="text-[rgba(245,234,210,0.45)]">{e.starName}化{e.siHua}</span>
                    {' ← '}
                    {e.from.length ? e.from.join('、') : '未命中宫干'}
                    {e.siHua === '忌' ? '（化忌来因重点）' : ''}
                  </p>
                ))}
              </div>
            )}
            {overlay.feihuaChain?.length > 0 && (
              <div className="space-y-1.5 text-[11px] text-[rgba(245,234,210,0.7)]">
                <p className="text-[rgba(245,234,210,0.45)]">本命飞化链</p>
                {overlay.feihuaChain.map((link) => (
                  <p key={`chain-${link.siHua}`} className="leading-relaxed">
                    <span className="text-[var(--gold-bright)]">{link.siHua}</span>
                    {' · '}
                    {link.summary}
                  </p>
                ))}
              </div>
            )}
            {overlay.daXianFeihuaChain?.length > 0 && (
              <div className="space-y-1.5 text-[11px] text-[rgba(245,234,210,0.7)]">
                <p className="text-[rgba(245,234,210,0.45)]">大限飞化链</p>
                {overlay.daXianFeihuaChain.map((link) => (
                  <p key={`dx-chain-${link.siHua}`} className="leading-relaxed">
                    <span className="text-[var(--gold-bright)]">限{link.siHua}</span>
                    {' · '}
                    {link.summary}
                  </p>
                ))}
              </div>
            )}
            {overlay.liuNianFeihuaChain?.length > 0 && (
              <div className="space-y-1.5 text-[11px] text-[rgba(245,234,210,0.7)]">
                <p className="text-[rgba(245,234,210,0.45)]">流年飞化链（{overlay.year}）</p>
                {overlay.liuNianFeihuaChain.map((link) => (
                  <p key={`ln-chain-${link.siHua}`} className="leading-relaxed">
                    <span className="text-[var(--gold-bright)]">年{link.siHua}</span>
                    {' · '}
                    {link.summary}
                  </p>
                ))}
              </div>
            )}
            {overlay.selfSihua?.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {overlay.selfSihua.map((p) => (
                  <span
                    key={p.palaceName}
                    className="rounded-md border border-[var(--line)] px-2 py-1 text-[rgba(245,234,210,0.65)]"
                  >
                    {p.palaceName}：
                    {p.items.map((i) => `自化${i.siHua}${i.starName}`).join('、')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[rgba(245,234,210,0.4)]">本盘无宫干自化命中</p>
            )}
            {overlay.daXianSiHua && (
              <p className="text-[11px] text-[rgba(245,234,210,0.55)]">
                大限四化（宫干{overlay.daXianSiHua.stemName}）：禄{overlay.daXianSiHua.transforms.禄}
                /权{overlay.daXianSiHua.transforms.权}/科{overlay.daXianSiHua.transforms.科}
                /忌{overlay.daXianSiHua.transforms.忌}
              </p>
            )}
          </div>
        )}

        {patterns.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--line)]">
            <p className="text-xs tracking-[0.14em] text-[var(--gold-bright)] mb-2">格局</p>
            <div className="flex flex-wrap gap-2">
              {patterns.slice(0, 8).map((p) => (
                <span key={p.name} className={`ziwei-pattern ziwei-pattern-${p.level}`} title={p.description}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
