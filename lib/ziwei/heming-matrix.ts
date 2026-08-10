/**
 * 合盘结构化：关键宫对照 + 生年四化互飞落宫 + 再飞一跳语义图
 */

import type { ZiweiChart, SiHua } from './types'
import { BRANCHES, STEMS } from './constants'
import { getSiHuaByStem } from './sihua'

const KEY_PALACE_KEYS = ['命', '夫妻', '福德'] as const

export interface PalaceBrief {
  name: string
  ganZhi: string
  majors: string[]
  siHuaTags: string[]
}

export interface FlyNextHop {
  siHua: SiHua
  star: string
  /** 再飞星在对方盘落宫 */
  fallOnOther: string | null
}

export interface FlyHit {
  siHua: SiHua
  star: string
  /** 化星在己盘宫位 */
  selfPalace: string | null
  /** 化星在对方盘宫位 */
  otherPalace: string | null
  /** 对方落宫之对宫 */
  otherOpposite: string | null
  /** 是否落对方命/夫妻/福德 */
  otherIsKey: boolean
  /** 落对方宫后，该宫宫干再飞一跳（最多 4） */
  nextHopOnOther: FlyNextHop[]
}

export interface HemingMatrix {
  keyPalaces: { name: string; a: PalaceBrief | null; b: PalaceBrief | null }[]
  /** 甲年生干四化 → 落乙盘 */
  aToB: FlyHit[]
  /** 乙年生干四化 → 落甲盘 */
  bToA: FlyHit[]
  summaryLines: string[]
  /** 互飞语义图短摘要（关键宫落点 + 忌化再飞） */
  graphLines: string[]
}

function findPalace(chart: ZiweiChart, name: string) {
  const key = name.replace('宫', '')
  return (
    chart.palaces.find((p) => p.name === name || p.name === key) ||
    chart.palaces.find((p) => p.name.includes(key))
  )
}

function briefPalace(chart: ZiweiChart, name: string): PalaceBrief | null {
  const p = findPalace(chart, name)
  if (!p) return null
  const majors = p.stars.filter((s) => s.type === 'major')
  return {
    name: p.name,
    ganZhi: `${STEMS[p.stem] || ''}${BRANCHES[p.branch] || ''}`,
    majors: majors.map((s) => s.name),
    siHuaTags: majors.filter((s) => s.siHua).map((s) => `${s.name}化${s.siHua}`),
  }
}

function findStarPalace(chart: ZiweiChart, star: string) {
  return chart.palaces.find(
    (x) =>
      x.stars.some((s) => s.name === star) ||
      (x.borrowedStars || []).includes(star),
  )
}

function findStarPalaceName(chart: ZiweiChart, star: string): string | null {
  return findStarPalace(chart, star)?.name ?? null
}

function oppositePalaceName(chart: ZiweiChart, palaceName: string | null): string | null {
  if (!palaceName) return null
  const p = findPalace(chart, palaceName)
  if (!p || typeof p.branch !== 'number') return null
  return chart.palaces.find((x) => x.branch === (p.branch + 6) % 12)?.name ?? null
}

function isKeyPalace(name: string | null): boolean {
  if (!name) return false
  return KEY_PALACE_KEYS.some((k) => name.includes(k))
}

/** 落对方某宫后，用该宫宫干再飞四化，看再飞星落对方何处 */
function nextHopFromPalace(target: ZiweiChart, palaceName: string | null): FlyNextHop[] {
  if (!palaceName) return []
  const p = findPalace(target, palaceName)
  if (!p) return []
  const transforms = getSiHuaByStem(p.stem)
  const hops: FlyNextHop[] = []
  for (const siHua of ['禄', '权', '科', '忌'] as SiHua[]) {
    const star = transforms[siHua]
    if (!star) continue
    hops.push({
      siHua,
      star,
      fallOnOther: findStarPalaceName(target, star),
    })
  }
  return hops
}

function flyFromTo(source: ZiweiChart, target: ZiweiChart): FlyHit[] {
  const stem = source.lunarInfo.yearStem
  const transforms = getSiHuaByStem(stem)
  return (['禄', '权', '科', '忌'] as SiHua[]).map((siHua) => {
    const star = transforms[siHua] || ''
    const otherPalace = star ? findStarPalaceName(target, star) : null
    return {
      siHua,
      star,
      selfPalace: star ? findStarPalaceName(source, star) : null,
      otherPalace,
      otherOpposite: oppositePalaceName(target, otherPalace),
      otherIsKey: isKeyPalace(otherPalace),
      nextHopOnOther: nextHopFromPalace(target, otherPalace),
    }
  })
}

function flyNote(label: string, hits: FlyHit[]): string[] {
  return hits
    .filter((h) => h.star && h.otherPalace)
    .map((h) => {
      const tone =
        h.siHua === '忌'
          ? '需留意'
          : h.siHua === '禄'
            ? '偏助益'
            : '可关注'
      const key = h.otherIsKey ? '·关键宫' : ''
      return `${label}${h.siHua}（${h.star}）入对方${h.otherPalace}${key}（${tone}）`
    })
}

function graphNote(label: string, hits: FlyHit[]): string[] {
  const lines: string[] = []
  for (const h of hits) {
    if (!h.star || !h.otherPalace) continue
    if (h.otherIsKey || h.siHua === '忌') {
      const opp = h.otherOpposite ? `→对宫${h.otherOpposite}` : ''
      lines.push(`${label}化${h.siHua}${h.star}→对方${h.otherPalace}${opp}`)
    }
    if (h.siHua === '忌' && h.nextHopOnOther.length) {
      const hop = h.nextHopOnOther
        .slice(0, 2)
        .map((n) => `${n.star}化${n.siHua}→${n.fallOnOther || '—'}`)
        .join('、')
      lines.push(`${label}化忌落宫再飞：${hop}`)
    }
  }
  return lines
}

export function buildHemingMatrix(chartA: ZiweiChart, chartB: ZiweiChart): HemingMatrix {
  const names = ['命宫', '夫妻宫', '福德宫', '官禄宫', '财帛宫']
  const keyPalaces = names.map((name) => ({
    name,
    a: briefPalace(chartA, name),
    b: briefPalace(chartB, name),
  }))

  const aToB = flyFromTo(chartA, chartB)
  const bToA = flyFromTo(chartB, chartA)

  const summaryLines = [
    `甲年干 ${STEMS[chartA.lunarInfo.yearStem]} · 乙年干 ${STEMS[chartB.lunarInfo.yearStem]}`,
    ...flyNote('甲→乙·化', aToB).slice(0, 4),
    ...flyNote('乙→甲·化', bToA).slice(0, 4),
  ]

  const graphLines = [
    ...graphNote('甲→乙', aToB),
    ...graphNote('乙→甲', bToA),
  ]

  return { keyPalaces, aToB, bToA, summaryLines, graphLines }
}

export function formatHemingMatrixForPrompt(m: HemingMatrix): string {
  const lines: string[] = ['## 合盘结构化事实（勿改动）', '', '### 关键宫对照']
  for (const row of m.keyPalaces) {
    const a = row.a
      ? `${row.a.ganZhi} ${row.a.majors.join('、') || '空'}${row.a.siHuaTags.length ? `（${row.a.siHuaTags.join('、')}）` : ''}`
      : '—'
    const b = row.b
      ? `${row.b.ganZhi} ${row.b.majors.join('、') || '空'}${row.b.siHuaTags.length ? `（${row.b.siHuaTags.join('、')}）` : ''}`
      : '—'
    lines.push(`- ${row.name}：甲「${a}」｜乙「${b}」`)
  }
  lines.push('', '### 四化互飞')
  const fmt = (hits: FlyHit[], dir: string) => {
    for (const h of hits) {
      const key = h.otherIsKey ? '（关键宫）' : ''
      const opp = h.otherOpposite ? `；对宫${h.otherOpposite}` : ''
      lines.push(
        `- ${dir} 化${h.siHua} ${h.star || '—'}：己盘${h.selfPalace || '—'} → 对方${h.otherPalace || '未入盘/杂曜外'}${key}${opp}`,
      )
      if (h.nextHopOnOther.length && h.otherPalace) {
        const hop = h.nextHopOnOther
          .map((n) => `${n.star}化${n.siHua}→${n.fallOnOther || '—'}`)
          .join('、')
        lines.push(`  · 落宫再飞：${hop}`)
      }
    }
  }
  fmt(m.aToB, '甲→乙')
  fmt(m.bToA, '乙→甲')
  if (m.graphLines.length) {
    lines.push('', '### 互飞语义图（关键落点 / 忌化再飞）')
    for (const g of m.graphLines) lines.push(`- ${g}`)
  }
  return lines.join('\n')
}

/** 合盘互飞事实索引：供 citation 校验「化X入对方Y宫」类陈述 */
export function buildHemingFlyFacts(matrix: HemingMatrix): {
  aToBFall: Partial<Record<SiHua, string[]>>
  bToAFall: Partial<Record<SiHua, string[]>>
  keyFalls: string[]
} {
  const pack = (hits: FlyHit[]) => {
    const out: Partial<Record<SiHua, string[]>> = {}
    for (const h of hits) {
      if (!h.otherPalace) continue
      const list = out[h.siHua] || (out[h.siHua] = [])
      if (!list.includes(h.otherPalace)) list.push(h.otherPalace)
      if (h.otherOpposite && !list.includes(h.otherOpposite)) {
        /* opposite is not a fall of the same hua; skip */
      }
    }
    return out
  }
  const keyFalls: string[] = []
  for (const h of [...matrix.aToB, ...matrix.bToA]) {
    if (h.otherIsKey && h.otherPalace) {
      keyFalls.push(`${h.siHua}:${h.otherPalace}`)
    }
  }
  return {
    aToBFall: pack(matrix.aToB),
    bToAFall: pack(matrix.bToA),
    keyFalls,
  }
}
