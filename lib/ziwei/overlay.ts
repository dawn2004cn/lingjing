/**
 * 紫微运限叠宫
 * 默认倪师口径：大限看宫位；流年四化用年干。
 * 飞星口径（ziweiSchool=feixing）：另输出大限宫干四化与自化宫位数。
 */

import {
  getDaXianSiHua,
  getLiuNianSiHua,
  getLiuYueSiHua,
  getLiuRiSiHua,
  getYearStemIndex,
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

export type FeihuaNextHop = {
  siHua: SiHua
  starName: string
  fall: string[]
}

/** 本命飞化链一环：来因 → 化星 → 落宫（+对宫）+ 落宫宫干再飞一跳 */
export type FeihuaLayer = 'natal' | 'daxian' | 'liunian' | 'liuyue' | 'liuri'

export type FeihuaLink = {
  layer: FeihuaLayer
  siHua: SiHua
  starName: string
  from: string[]
  fall: string[]
  opposite: string[]
  selfHua: boolean
  nextHop: FeihuaNextHop[]
  /** 可读摘要 */
  summary: string
}

function findStarPalaces(chart: ZiweiChart, starName: string) {
  return (chart.palaces || []).filter(
    (p) =>
      (p.stars || []).some((s) => s.name === starName) ||
      (p.borrowedStars || []).includes(starName),
  )
}

/**
 * 由四化表构建飞化链（本命 / 大限 / 流年共用）
 * @param fromLabel 无宫干来因时的来源标签，如「年干」「大限宫干甲」「流年丙干」
 * @param usePalaceLaiYin 是否用来因宫（宫干回溯）作为 from
 */
export function buildFeihuaChainFromTransforms(
  chart: ZiweiChart,
  transforms: Record<SiHua, string>,
  opts?: { fromLabel?: string; usePalaceLaiYin?: boolean; layer?: FeihuaLayer },
): FeihuaLink[] {
  const fromLabel = opts?.fromLabel || '干'
  const usePalaceLaiYin = opts?.usePalaceLaiYin !== false
  const layer: FeihuaLayer = opts?.layer || 'natal'
  const links: FeihuaLink[] = []

  for (const siHua of ['禄', '权', '科', '忌'] as SiHua[]) {
    const starName = transforms[siHua]
    if (!starName) continue
    const from = usePalaceLaiYin
      ? findIncomingPalaces(chart, starName, siHua).map((p) => p.name)
      : []
    const fallPalaces = findStarPalaces(chart, starName)
    const fall = fallPalaces.map((p) => p.name)
    const opposite = fallPalaces
      .map((p) => {
        const oppBranch = (p.branch + 6) % 12
        return chart.palaces.find((x) => x.branch === oppBranch)?.name
      })
      .filter(Boolean) as string[]

    const selfHua = fallPalaces.some((p) =>
      detectSelfSihuaOnPalace(p).some((s) => s.starName === starName && s.siHua === siHua),
    )

    const nextHop: FeihuaNextHop[] = []
    const seenHop = new Set<string>()
    for (const p of fallPalaces) {
      const out = getSiHuaByStem(p.stem)
      for (const sh of ['禄', '权', '科', '忌'] as SiHua[]) {
        const sn = out[sh]
        if (!sn) continue
        const key = `${sh}:${sn}`
        if (seenHop.has(key)) continue
        seenHop.add(key)
        nextHop.push({
          siHua: sh,
          starName: sn,
          fall: findStarPalaces(chart, sn).map((x) => x.name),
        })
      }
    }

    const fromStr = from.length ? from.join('、') : fromLabel
    const fallStr = fall.length ? fall.join('、') : '未入盘'
    const oppStr = opposite.length ? `→对宫${opposite.join('、')}` : ''
    const selfStr = selfHua ? '（落宫自化）' : ''
    const hopStr =
      nextHop.length > 0
        ? `；落宫再飞 ${nextHop
            .slice(0, 4)
            .map((h) => `${h.starName}化${h.siHua}→${h.fall.join('、') || '—'}`)
            .join('、')}`
        : ''

    links.push({
      layer,
      siHua,
      starName,
      from,
      fall,
      opposite,
      selfHua,
      nextHop,
      summary: `${fromStr}→${starName}化${siHua}→${fallStr}${oppStr}${selfStr}${hopStr}`,
    })
  }
  return links
}

/** 本命年干四化飞化链 */
export function buildNatalFeihuaChain(chart: ZiweiChart): FeihuaLink[] {
  const stem = chart.lunarInfo?.yearStem ?? 0
  return buildFeihuaChainFromTransforms(chart, getSiHuaByStem(stem), {
    fromLabel: `年干${STEMS[stem] || ''}`,
    usePalaceLaiYin: true,
    layer: 'natal',
  })
}

/** 大限宫干四化飞化链 */
export function buildDaXianFeihuaChain(
  chart: ZiweiChart,
  daXianIndex: number,
): FeihuaLink[] {
  const dx = getDaXianSiHua(chart, daXianIndex)
  if (!dx) return []
  return buildFeihuaChainFromTransforms(chart, dx.transforms, {
    fromLabel: `大限宫干${dx.stemName}`,
    usePalaceLaiYin: true,
    layer: 'daxian',
  })
}

/** 流年年干四化飞化链 */
export function buildLiuNianFeihuaChain(chart: ZiweiChart, year: number): FeihuaLink[] {
  const liu = getLiuNianSiHua(year)
  return buildFeihuaChainFromTransforms(chart, liu.transforms, {
    fromLabel: `流年${liu.stemName}干`,
    usePalaceLaiYin: true,
    layer: 'liunian',
  })
}

/**
 * 流月干四化飞化链
 * @param month 月序 1–12（与运势月表/五虎遁一致）
 */
export function buildLiuYueFeihuaChain(
  chart: ZiweiChart,
  year: number,
  month: number,
): FeihuaLink[] {
  const m = Math.min(12, Math.max(1, Math.floor(month) || 1))
  const yearStem = getYearStemIndex(year)
  const ly = getLiuYueSiHua(yearStem, m)
  return buildFeihuaChainFromTransforms(chart, ly.transforms, {
    fromLabel: `流月${m}月${ly.stemName}干`,
    usePalaceLaiYin: true,
    layer: 'liuyue',
  })
}

/**
 * 流日干四化飞化链
 * @param day 公历日 1–31
 */
export function buildLiuRiFeihuaChain(
  chart: ZiweiChart,
  year: number,
  month: number,
  day: number,
): FeihuaLink[] {
  const ri = getLiuRiSiHua(year, month, day)
  return buildFeihuaChainFromTransforms(chart, ri.transforms, {
    fromLabel: `流日${ri.ganZhi}${ri.stemName}干`,
    usePalaceLaiYin: true,
    layer: 'liuri',
  })
}

function detectSelfSihuaOnPalace(palace: {
  stem: number
  stars: { name: string }[]
}): { siHua: SiHua; starName: string }[] {
  const transforms = getSiHuaByStem(palace.stem)
  const names = new Set((palace.stars || []).map((s) => s.name))
  const found: { siHua: SiHua; starName: string }[] = []
  ;(['禄', '权', '科', '忌'] as SiHua[]).forEach((sh) => {
    const starName = transforms[sh]
    if (starName && names.has(starName)) found.push({ siHua: sh, starName })
  })
  return found
}

export function formatFeihuaChainLines(links: FeihuaLink[], titlePrefix = ''): string[] {
  return links.map((l) => `- ${titlePrefix}${l.siHua}：${l.summary}`)
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
  /** 仅飞星口径：本命飞化链（来因→落宫→再飞一跳） */
  feihuaChain?: FeihuaLink[]
  /** 仅飞星口径：大限飞化链 */
  daXianFeihuaChain?: FeihuaLink[]
  /** 仅飞星口径：流年飞化链 */
  liuNianFeihuaChain?: FeihuaLink[]
  /** 流月序号 1–12（飞星口径下用于流月链） */
  month?: number
  /** 仅飞星口径：流月干名 */
  liuYueStemName?: string
  /** 仅飞星口径：流月飞化链 */
  liuYueFeihuaChain?: FeihuaLink[]
  /** 公历日 1–31（飞星口径下流日链） */
  day?: number
  /** 仅飞星口径：流日干支 */
  liuRiGanZhi?: string
  /** 仅飞星口径：流日干名 */
  liuRiStemName?: string
  /** 仅飞星口径：流日飞化链 */
  liuRiFeihuaChain?: FeihuaLink[]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function buildOverlay(
  chart: ZiweiChart,
  year: number,
  opts?: { school?: ZiweiSchool; month?: number; day?: number },
): OverlayState {
  const school: ZiweiSchool = opts?.school === 'feixing' ? 'feixing' : 'ni'
  const month = Math.min(12, Math.max(1, Math.floor(opts?.month ?? new Date().getMonth() + 1) || 1))
  const maxDay = daysInMonth(year, month)
  const day = Math.min(maxDay, Math.max(1, Math.floor(opts?.day ?? new Date().getDate()) || 1))
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
  const feihuaChain = school === 'feixing' ? buildNatalFeihuaChain(chart) : undefined
  const daXianFeihuaChain =
    school === 'feixing' && daXianIndex >= 0
      ? buildDaXianFeihuaChain(chart, daXianIndex)
      : undefined
  const liuNianFeihuaChain =
    school === 'feixing' ? buildLiuNianFeihuaChain(chart, year) : undefined
  const liuYue =
    school === 'feixing' ? getLiuYueSiHua(getYearStemIndex(year), month) : null
  const liuYueFeihuaChain =
    school === 'feixing' ? buildLiuYueFeihuaChain(chart, year, month) : undefined
  const liuRi = school === 'feixing' ? getLiuRiSiHua(year, month, day) : null
  const liuRiFeihuaChain =
    school === 'feixing' ? buildLiuRiFeihuaChain(chart, year, month, day) : undefined

  return {
    year,
    age,
    month,
    day,
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
    feihuaChain,
    daXianFeihuaChain,
    liuNianFeihuaChain,
    liuYueStemName: liuYue?.stemName,
    liuYueFeihuaChain,
    liuRiGanZhi: liuRi?.ganZhi,
    liuRiStemName: liuRi?.stemName,
    liuRiFeihuaChain,
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
  if (o.school === 'feixing' && o.feihuaChain?.length) {
    const ji = o.feihuaChain.find((x) => x.siHua === '忌')
    if (ji?.fall?.length) {
      parts.push(`本命化忌落${ji.fall.join('、')}`)
    }
  }
  if (o.school === 'feixing' && o.daXianFeihuaChain?.length) {
    const ji = o.daXianFeihuaChain.find((x) => x.siHua === '忌')
    if (ji?.fall?.length) parts.push(`大限化忌落${ji.fall.join('、')}`)
  }
  if (o.school === 'feixing' && o.liuNianFeihuaChain?.length) {
    const ji = o.liuNianFeihuaChain.find((x) => x.siHua === '忌')
    if (ji?.fall?.length) parts.push(`流年化忌落${ji.fall.join('、')}`)
  }
  if (o.school === 'feixing' && o.liuYueFeihuaChain?.length) {
    const ji = o.liuYueFeihuaChain.find((x) => x.siHua === '忌')
    if (ji?.fall?.length) {
      parts.push(`流月${o.month}月化忌落${ji.fall.join('、')}`)
    }
  }
  if (o.school === 'feixing' && o.liuRiFeihuaChain?.length) {
    const ji = o.liuRiFeihuaChain.find((x) => x.siHua === '忌')
    if (ji?.fall?.length) {
      parts.push(`流日${o.liuRiGanZhi || ''}化忌落${ji.fall.join('、')}`)
    }
  }
  return parts.join(' · ')
}
