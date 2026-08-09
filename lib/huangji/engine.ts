/**
 * 皇极经世 — 元会运世定位（研究级）
 */

export interface HuangjiInput {
  year?: number
  month?: number
  day?: number
  hour?: number
  question?: string
}

export interface HuangjiChart {
  question?: string
  year: number
  yuan: number
  hui: number
  yun: number
  shi: number
  yearInShi: number
  guaHint: string
  engine: string
  researchNote: string
}

/** 一元 129600 年；以公元前 67017 年为常见公开起点简化 */
const YUAN_START = -67017
const YUAN_LEN = 129600
const HUI_LEN = 10800
const YUN_LEN = 360
const SHI_LEN = 30

const HUI_NAMES = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
]

const GUA64 = [
  '复', '颐', '屯', '益', '震', '噬嗑', '随', '无妄',
  '明夷', '贲', '既济', '家人', '丰', '革', '同人', '临',
]

export function buildHuangjiChart(input: HuangjiInput): HuangjiChart {
  const year = Number(input.year) || new Date().getFullYear()
  const offset = year - YUAN_START
  const yuan = Math.floor(offset / YUAN_LEN) + 1
  const inYuan = ((offset % YUAN_LEN) + YUAN_LEN) % YUAN_LEN
  const hui = Math.floor(inYuan / HUI_LEN) + 1
  const inHui = inYuan % HUI_LEN
  const yun = Math.floor(inHui / YUN_LEN) + 1
  const inYun = inHui % YUN_LEN
  const shi = Math.floor(inYun / SHI_LEN) + 1
  const yearInShi = (inYun % SHI_LEN) + 1
  const guaHint = GUA64[(hui + yun + shi) % GUA64.length]

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    year,
    yuan,
    hui,
    yun,
    shi,
    yearInShi,
    guaHint,
    engine: 'lingjing-huangji@1',
    researchNote:
      '皇极经世以元会运世描述长时段气运，偏历史年表与宏观研究，非一事一占主路径。完整卦象链可对接 kinwangji sidecar。',
  }
}

export function formatHuangjiForPrompt(chart: HuangjiChart): string {
  return [
    '## 皇极经世定位（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 公历年：${chart.year}`,
    `- 第 ${chart.yuan} 元 · 第 ${chart.hui} 会（${HUI_NAMES[(chart.hui - 1) % 12]}）`,
    `- 第 ${chart.yun} 运 · 第 ${chart.shi} 世 · 世内第 ${chart.yearInShi} 年`,
    `- 提示卦象：${chart.guaHint}`,
    `- 说明：${chart.researchNote}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildHuangjiRuleReading(chart: HuangjiChart): string {
  return [
    formatHuangjiForPrompt(chart),
    '',
    '## 规则断语',
    `- 当前处于${HUI_NAMES[(chart.hui - 1) % 12]}会第${chart.yun}运第${chart.shi}世，提示卦「${chart.guaHint}」。`,
    '',
    '## 解读边界',
    '- 研究级宏观定位，不作为个人短期吉凶断言依据。',
  ].join('\n')
}

export function collectHuangjiAllowedTerms(chart: HuangjiChart): Set<string> {
  return new Set([
    chart.guaHint,
    ...HUI_NAMES,
    '元',
    '会',
    '运',
    '世',
    String(chart.year),
  ])
}
