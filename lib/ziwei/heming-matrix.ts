/**
 * 合盘结构化：关键宫对照 + 生年四化互飞落宫
 */

import type { ZiweiChart, SiHua } from './types'
import { BRANCHES, STEMS } from './constants'
import { getSiHuaByStem } from './sihua'

export interface PalaceBrief {
  name: string
  ganZhi: string
  majors: string[]
  siHuaTags: string[]
}

export interface FlyHit {
  siHua: SiHua
  star: string
  /** 化星在己盘宫位 */
  selfPalace: string | null
  /** 化星在对方盘宫位 */
  otherPalace: string | null
}

export interface HemingMatrix {
  keyPalaces: { name: string; a: PalaceBrief | null; b: PalaceBrief | null }[]
  /** 甲年生干四化 → 落乙盘 */
  aToB: FlyHit[]
  /** 乙年生干四化 → 落甲盘 */
  bToA: FlyHit[]
  summaryLines: string[]
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

function findStarPalaceName(chart: ZiweiChart, star: string): string | null {
  const p = chart.palaces.find((x) => x.stars.some((s) => s.name === star))
  return p?.name ?? null
}

function flyFromTo(source: ZiweiChart, target: ZiweiChart): FlyHit[] {
  const stem = source.lunarInfo.yearStem
  const transforms = getSiHuaByStem(stem)
  return (['禄', '权', '科', '忌'] as SiHua[]).map((siHua) => {
    const star = transforms[siHua] || ''
    return {
      siHua,
      star,
      selfPalace: star ? findStarPalaceName(source, star) : null,
      otherPalace: star ? findStarPalaceName(target, star) : null,
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
      return `${label}${h.siHua}（${h.star}）入对方${h.otherPalace}（${tone}）`
    })
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

  return { keyPalaces, aToB, bToA, summaryLines }
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
      lines.push(
        `- ${dir} 化${h.siHua} ${h.star || '—'}：己盘${h.selfPalace || '—'} → 对方${h.otherPalace || '未入盘/杂曜外'}`,
      )
    }
  }
  fmt(m.aToB, '甲→乙')
  fmt(m.bToA, '乙→甲')
  return lines.join('\n')
}
