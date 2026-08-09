/**
 * 紫微运限叠宫（倪师口径：大限看宫位；流年四化用年干，本命星高亮）
 */

import { getLiuNianSiHua, getYearBranchIndex } from './sihua'
import type { SiHua, ZiweiChart } from './types'

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
}

export function buildOverlay(chart: ZiweiChart, year: number): OverlayState {
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
  }
}

export function formatOverlaySummary(o: OverlayState): string {
  const t = o.transforms
  return [
    `${o.year}年 · 虚岁约${o.age}`,
    o.daXianName
      ? `大限在${o.daXianName}`
      : '大限未定',
    `流年命宫位：${'子丑寅卯辰巳午未申酉戌亥'[o.liuNianMingBranch]}`,
    `流年四化（${o.liuNianStemName}干）：禄${t.禄} 权${t.权} 科${t.科} 忌${t.忌}`,
  ].join(' · ')
}
