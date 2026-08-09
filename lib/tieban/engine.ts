/**
 * 铁版神数 — 结构排盘演示（无商业条文库）
 * 条文匹配仅在授权后启用。本命数/考刻由确定性哈希派生，非古典推数法。
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
  /** 明确：数字来自演示哈希，非授权古典推数 */
  numbersAreDemoHash: boolean
  engine: string
  disclaimer: string
  versesAvailable: boolean
  frozenReason: string
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
    numbersAreDemoHash: true,
    engine: 'lingjing-tieban-structure@2',
    disclaimer:
      '铁版神数断语条文多涉著作权。本模块仅演示考刻/本命数/辟卦等结构字段；数字由四柱确定性哈希派生，非古典推数，不作命运断定，禁止编造条文。',
    versesAvailable: false,
    frozenReason: '条文库未授权：断事能力冻结，仅保留结构演示',
  }
}

export function formatTiebanForPrompt(chart: TiebanChart): string {
  return [
    '## 铁版神数结构盘（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 四柱：${chart.pillars} · 日主 ${chart.dayMaster}`,
    `- 先天命数：${chart.xianTianMingShu}（演示哈希）`,
    `- 本命数：${chart.benMingShu}（演示哈希）`,
    `- 考刻：${chart.kaoKe} · 十二辟卦：${chart.piGua}`,
    `- 条文库：未启用（versesAvailable=${chart.versesAvailable}）`,
    `- 冻结原因：${chart.frozenReason}`,
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
    '- 仅输出结构字段，无断语条文，无流年诗句匹配。',
    '- 本命数/考刻为可复现演示哈希，便于联调 UI；获授权后须替换为古典推数并接入条文库。',
    '',
    '## 解读边界',
    '- 禁止模型编造铁版条文编号或诗句并伪称古籍。',
    '- 禁止将演示哈希解读为真实铁版命数或命运断定。',
    `- ${chart.frozenReason}。`,
  ].join('\n')
}

export function auditTiebanIntegrity(chart: TiebanChart) {
  const ok =
    chart.versesAvailable === false &&
    chart.numbersAreDemoHash === true &&
    chart.benMingShu > 0
  return {
    status: ok ? 'ok' : 'fail',
    summary: ok
      ? '铁板结构演示完整；条文匹配已冻结'
      : '铁板状态异常（不应启用未授权条文）',
  }
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
    '演示哈希',
  ])
}
