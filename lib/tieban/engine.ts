/**
 * 铁版神数 — 结构排盘演示（无商业条文库）
 * 条文匹配仅在授权后启用。
 */

import { buildBaziChart, type BaziFormInput } from '@/lib/bazi/engine'

export interface TiebanInput extends BaziFormInput {
  question?: string
}

export interface TiebanChart {
  question?: string
  pillars: string
  dayMaster: string
  xianTianMingShu: number
  benMingShu: number
  kaoKe: string
  piGua: string
  engine: string
  disclaimer: string
  versesAvailable: boolean
}

function hashPillars(gz: string): number {
  let h = 0
  for (let i = 0; i < gz.length; i++) h = (h * 31 + gz.charCodeAt(i)) >>> 0
  return h
}

const PI_GUA = [
  '复', '临', '泰', '大壮', '夬', '乾', '姤', '遁', '否', '观', '剥', '坤',
]

export function buildTiebanChart(input: TiebanInput): TiebanChart {
  const bazi = buildBaziChart(input)
  const p = bazi.pillars
  const pillars = `${p.year.ganZhi} ${p.month.ganZhi} ${p.day.ganZhi} ${p.time.ganZhi}`
  const h = hashPillars(pillars + (bazi.gender || ''))
  const xianTianMingShu = (h % 12) + 1
  const benMingShu = (h % 12000) + 1
  const kaoKe = ['初刻', '二刻', '三刻', '四刻'][h % 4]
  const piGua = PI_GUA[h % 12]

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    pillars,
    dayMaster: bazi.dayMaster,
    xianTianMingShu,
    benMingShu,
    kaoKe,
    piGua,
    engine: 'lingjing-tieban-structure@1',
    disclaimer:
      '铁版神数断语条文多涉著作权。本模块仅演示考刻/本命数/辟卦等结构排盘，不提供条文匹配，不作命运断定。',
    versesAvailable: false,
  }
}

export function formatTiebanForPrompt(chart: TiebanChart): string {
  return [
    '## 铁版神数结构盘（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 四柱：${chart.pillars} · 日主 ${chart.dayMaster}`,
    `- 先天命数：${chart.xianTianMingShu}`,
    `- 本命数：${chart.benMingShu}`,
    `- 考刻：${chart.kaoKe}`,
    `- 十二辟卦：${chart.piGua}`,
    `- 条文库：${chart.versesAvailable ? '已授权' : '未启用'}`,
    `- 免责：${chart.disclaimer}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildTiebanRuleReading(chart: TiebanChart): string {
  return [
    formatTiebanForPrompt(chart),
    '',
    '## 规则说明',
    '- 仅输出结构字段，无断语条文。',
    '- 授权条文库接入后，方可按本命数匹配流年断语。',
    '',
    '## 解读边界',
    '- 禁止模型编造铁版条文编号或诗句并伪称古籍。',
  ].join('\n')
}

export function collectTiebanAllowedTerms(chart: TiebanChart): Set<string> {
  return new Set([
    ...chart.pillars.split(' '),
    chart.dayMaster,
    chart.kaoKe,
    chart.piGua,
    '先天命数',
    '本命数',
    '考刻',
  ])
}
