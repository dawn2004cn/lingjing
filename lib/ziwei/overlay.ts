/**
 * 紫微运限叠宫
 * 默认倪师口径：大限看宫位；流年四化用年干。
 * 飞星口径（ziweiSchool=feixing）：另输出大限宫干四化与自化宫位数。
 */

import {
  getDaXianSiHua,
  getLiuNianSiHua,
  getYearBranchIndex,
  buildAllSelfSihua,
  getSiHuaByStem,
  findIncomingPalaces,
} from './sihua'
import type { SiHua, ZiweiChart } from './types'
import { STEMS } from './constants'

export type ZiweiSchool = 'ni' | 'feixing'

/** 本命年干四化 → 来因宫（宫干引发该化的宫位） */
export function buildNatalLaiYin(
  chart: ZiweiChart,
): { siHua: SiHua; starName: string; from: string[] }[] {
  const stem = chart.lunarInfo?.yearStem ?? 0
  const transforms = getSiHuaByStem(stem)
  return (['禄', '权', '科', '忌'] as SiHua[])
    .map((siHua) => {
      const starName = transforms[siHua]
      if (!starName) return null
      const from = findIncomingPalaces(chart, starName, siHua).map((p) => p.name)
      return { siHua, starName, from }
    })
    .filter(Boolean) as { siHua: SiHua; starName: string; from: string[] }[]
}

export function formatLaiYinLine(
  entries: { siHua: SiHua; starName: string; from: string[] }[],
): string {
  return entries
    .map((e) => {
      const src = e.from.length ? e.from.join('、') : '未命中宫干'
      return `${e.starName}化${e.siHua}←${src}`
    })
    .join('；')
}

export function natalYearStemName(chart: ZiweiChart): string {
  const i = chart.lunarInfo?.yearStem ?? 0
  return STEMS[i] || '—'
}

export interface OverlayState {
  year: number
  age: number
  daXianIndex: number
  daXianBranch: number | null
  daXianName: string | null
  /** 流年太岁地支 = 该支本命宫为流年命宫位 */
  liuNianMingBranch: number
  liuNianStemName: string
  /** 流年四化：星名 → 禄权科忌 */
  liuNianStarMap: Partial<Record<string, SiHua>>
  transforms: Record<SiHua, string>
  /** 口径：ni=倪师（默认）；feixing=飞星（大限宫干四化+自化） */
  school: ZiweiSchool
  /** 仅飞星口径：大限宫干四化 */
  daXianSiHua?: {
    stemIndex: number
    stemName: string
    transforms: Record<SiHua, string>
  } | null
  /** 仅飞星口径：有自化的宫位数 */
  selfSihuaPalaceCount?: number
  /** 仅飞星口径：自化明细（宫名 → 自化列表） */
  selfSihua?: { palaceName: string; items: { siHua: SiHua; starName: string }[] }[]
  /** 仅飞星口径：本命年干四化之来因宫 */
  laiYin?: { siHua: SiHua; starName: string; from: string[] }[]
}

export function buildOverlay(
  chart: ZiweiChart,
  year: number,
  opts?: { school?: ZiweiSchool },
): OverlayState {
  const school: ZiweiSchool = opts?.school === 'feixing' ? 'feixing' : 'ni'
  const age = year - chart.birthInfo.year
  let daXianIndex = chart.daXians.findIndex(
    (d) => age >= d.startAge && age <= d.endAge,
  )
  if (daXianIndex < 0 && chart.daXians.length) {
    if (age < chart.daXians[0].startAge) daXianIndex = 0
    else daXianIndex = chart.daXians.length - 1
  }

  const dx = daXianIndex >= 0 ? chart.daXians[daXianIndex] : null
  const liu = getLiuNianSiHua(year)
  const liuNianStarMap: Partial<Record<string, SiHua>> = {}
  ;(['禄', '权', '科', '忌'] as SiHua[]).forEach((k) => {
    const star = liu.transforms[k]
    if (star) liuNianStarMap[star] = k
  })

  const daXianSiHua =
    school === 'feixing' && daXianIndex >= 0 ? getDaXianSiHua(chart, daXianIndex) : null
  const selfMap = school === 'feixing' ? buildAllSelfSihua(chart) : null
  const selfSihua =
    school === 'feixing' && selfMap
      ? chart.palaces
          .filter((p) => selfMap[p.branch]?.length)
          .map((p) => ({
            palaceName: p.name,
            items: selfMap[p.branch].map((x) => ({ siHua: x.siHua, starName: x.starName })),
          }))
      : undefined
  const laiYin = school === 'feixing' ? buildNatalLaiYin(chart) : undefined

  return {
    year,
    age,
    daXianIndex,
    daXianBranch: dx?.palaceBranch ?? null,
    daXianName: dx?.palaceName ?? null,
    liuNianMingBranch: getYearBranchIndex(year),
    liuNianStemName: liu.stemName,
    liuNianStarMap,
    transforms: liu.transforms,
    school,
    daXianSiHua: daXianSiHua || null,
    selfSihuaPalaceCount: selfMap ? Object.keys(selfMap).length : undefined,
    selfSihua,
    laiYin,
  }
}

export function formatOverlaySummary(o: OverlayState): string {
  const t = o.transforms
  const parts = [
    `${o.year}年 · 虚岁约${o.age}`,
    o.daXianName ? `大限在${o.daXianName}` : '大限未定',
    `流年命宫位：${'子丑寅卯辰巳午未申酉戌亥'[o.liuNianMingBranch]}`,
    `流年四化（${o.liuNianStemName}干）：禄${t.禄} 权${t.权} 科${t.科} 忌${t.忌}`,
    `口径：${o.school === 'feixing' ? '飞星' : '倪师'}`,
  ]
  if (o.school === 'feixing' && o.daXianSiHua) {
    const d = o.daXianSiHua.transforms
    parts.push(
      `大限四化（宫干${o.daXianSiHua.stemName}）：禄${d.禄} 权${d.权} 科${d.科} 忌${d.忌}`,
    )
  }
  if (o.school === 'feixing' && o.laiYin?.length) {
    const ji = o.laiYin.find((x) => x.siHua === '忌')
    if (ji) {
      parts.push(`化忌来因：${ji.from.length ? ji.from.join('、') : '—'}`)
    }
  }
  return parts.join(' · ')
}
