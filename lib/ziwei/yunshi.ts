/**
 * 年度运势摘要 + 人生 K 线规则分（非预测断言，仅盘面加权）
 */

import type { ZiweiChart } from './types'
import { BRANCHES, STEMS } from './constants'
import { buildOverlay } from './overlay'
import { getLiuNianSiHua, getLiuYueSiHua, getYearStemIndex } from './sihua'

const KEY_PALACES = new Set(['命宫', '官禄', '官禄宫', '财帛', '财帛宫', '福德', '福德宫', '夫妻', '夫妻宫'])

function findStarPalace(chart: ZiweiChart, star: string) {
  return chart.palaces.find((p) => p.stars.some((s) => s.name === star))
}

/** 单年规则分 0–100 */
export function scoreYear(chart: ZiweiChart, year: number): number {
  const overlay = buildOverlay(chart, year)
  let score = 58

  for (const [star, sh] of Object.entries(overlay.liuNianStarMap)) {
    if (!sh) continue
    const palace = findStarPalace(chart, star)
    if (!palace) continue
    const key = KEY_PALACES.has(palace.name) || palace.isMingGong
    const w = key ? 7 : 3
    if (sh === '忌') score -= w
    else if (sh === '禄') score += w
    else if (sh === '权') score += w * 0.55
    else if (sh === '科') score += w * 0.4
  }

  if (overlay.daXianBranch != null) {
    const dx = chart.palaces.find((p) => p.branch === overlay.daXianBranch)
    if (dx) {
      const majors = dx.stars.filter((s) => s.type === 'major')
      const bright = majors.filter((s) => s.brightness === 'bright').length
      const dim = majors.filter((s) => s.brightness === 'dim').length
      score += bright * 1.5 - dim * 1.2
      if (majors.some((s) => s.siHua === '忌')) score -= 2
      if (majors.some((s) => s.siHua === '禄')) score += 2
    }
  }

  return Math.max(8, Math.min(96, Math.round(score)))
}

export interface MonthBrief {
  month: number
  stemName: string
  transforms: { 禄: string; 权: string; 科: string; 忌: string }
}

export interface YearPalaceRow {
  natalName: string
  branch: string
  /** 该年此宫充当的流年宫名 */
  flowName: string
  majors: string[]
  isLiuNianMing: boolean
  isDaXian: boolean
}

export interface YunshiReport {
  year: number
  age: number
  score: number
  overlaySummary: string
  liuNian: ReturnType<typeof getLiuNianSiHua>
  palaces: YearPalaceRow[]
  months: MonthBrief[]
}

/** 流年十二宫：以太岁支为流年命，逆时针安其余宫（与常见排法一致的简化） */
const FLOW_ORDER = [
  '命宫', '父母', '福德', '田宅', '官禄', '交友',
  '迁移', '疾厄', '财帛', '子女', '夫妻', '兄弟',
]

export function buildYearPalaces(chart: ZiweiChart, year: number): YearPalaceRow[] {
  const overlay = buildOverlay(chart, year)
  const mingBranch = overlay.liuNianMingBranch
  // 地支 mingBranch 上的本命宫 = 流年命宫
  // 流年宫名：从命起，地支逆行（紫微常见：流年命→兄弟在下一支等）
  // 简化：palace at branch B gets flowName = FLOW_ORDER[(mingBranch - B + 12) % 12]
  return chart.palaces
    .slice()
    .sort((a, b) => a.branch - b.branch)
    .map((p) => {
      const offset = (mingBranch - p.branch + 12) % 12
      return {
        natalName: p.name,
        branch: BRANCHES[p.branch],
        flowName: FLOW_ORDER[offset] || p.name,
        majors: p.stars.filter((s) => s.type === 'major').map((s) => s.name),
        isLiuNianMing: p.branch === mingBranch,
        isDaXian: overlay.daXianBranch === p.branch,
      }
    })
}

export function buildYunshiReport(chart: ZiweiChart, year: number): YunshiReport {
  const overlay = buildOverlay(chart, year)
  const liuNian = getLiuNianSiHua(year)
  const yearStem = getYearStemIndex(year)
  const months: MonthBrief[] = []
  for (let m = 1; m <= 12; m++) {
    const y = getLiuYueSiHua(yearStem, m)
    months.push({
      month: m,
      stemName: y.stemName,
      transforms: y.transforms,
    })
  }

  return {
    year,
    age: overlay.age,
    score: scoreYear(chart, year),
    overlaySummary: `${year}年 · ${liuNian.stemName}${BRANCHES[overlay.liuNianMingBranch]} · 大限${overlay.daXianName || '—'}`,
    liuNian,
    palaces: buildYearPalaces(chart, year),
    months,
  }
}

export interface KLinePoint {
  year: number
  age: number
  score: number
  label?: string
}

/** 人生 K 线：按年取样（默认从出生年到 +80） */
export function buildLifeKLine(
  chart: ZiweiChart,
  opts?: { fromYear?: number; toYear?: number; step?: number },
): KLinePoint[] {
  const from = opts?.fromYear ?? chart.birthInfo.year
  const to = opts?.toYear ?? chart.birthInfo.year + 80
  const step = opts?.step ?? 1
  const points: KLinePoint[] = []
  for (let y = from; y <= to; y += step) {
    const score = scoreYear(chart, y)
    const dx = chart.daXians.find((d) => {
      const age = y - chart.birthInfo.year
      return age >= d.startAge && age <= d.endAge
    })
    points.push({
      year: y,
      age: y - chart.birthInfo.year,
      score,
      label: dx?.palaceName,
    })
  }
  return points
}

/** 大限中点采样，适合概览曲线 */
export function buildDaXianKLine(chart: ZiweiChart): KLinePoint[] {
  return chart.daXians.map((dx) => {
    const midAge = Math.floor((dx.startAge + dx.endAge) / 2)
    const year = chart.birthInfo.year + midAge
    return {
      year,
      age: midAge,
      score: scoreYear(chart, year),
      label: `${dx.startAge}-${dx.endAge}·${dx.palaceName}`,
    }
  })
}

export function formatYunshiForPrompt(report: YunshiReport): string {
  const t = report.liuNian.transforms
  return [
    `## ${report.year}年运势要点（规则）`,
    `- ${report.overlaySummary} · 规则分 ${report.score}`,
    `- 流年四化：禄${t.禄} 权${t.权} 科${t.科} 忌${t.忌}`,
    `- 流年命宫位本命宫：${report.palaces.find((p) => p.isLiuNianMing)?.natalName || '—'}`,
  ].join('\n')
}
