/**
 * 小六壬 — 月日时三宫顺推
 */

import { Solar } from 'lunar-javascript'

export const LIU_SHEN = [
  { name: '大安', wx: '木', verdict: '身不动时，五谷丰登；凡谋皆吉，求财顺利', level: '吉' },
  { name: '留连', wx: '水', verdict: '人未归时，事有拖延；求谋未成，且宜谨慎', level: '凶' },
  { name: '速喜', wx: '火', verdict: '人即至时，喜事临门；求财有成，讼争得理', level: '吉' },
  { name: '赤口', wx: '金', verdict: '官事凶时，口舌是非；慎防争执，忌见血光', level: '凶' },
  { name: '小吉', wx: '水', verdict: '人来喜时，事半功成；求谋可就，出行平安', level: '吉' },
  { name: '空亡', wx: '土', verdict: '音信稀时，多主落空；求财费力，且待后图', level: '凶' },
] as const

export interface XiaoliurenInput {
  date?: string
  clock?: string
  /** 报数起课：1–6 起宫偏移，可选 */
  count?: number
  question?: string
  matter?: string
}

export interface XiaoliurenChart {
  question?: string
  matter?: string
  lunarLabel: string
  yueGong: (typeof LIU_SHEN)[number]
  riGong: (typeof LIU_SHEN)[number]
  shiGong: (typeof LIU_SHEN)[number]
  /** 主断取时宫 */
  main: (typeof LIU_SHEN)[number]
}

function hourToShichen(hh: number): number {
  // 子=1 … 亥=12
  return Math.floor(((hh + 1) % 24) / 2) + 1
}

export function buildXiaoliurenChart(input: XiaoliurenInput): XiaoliurenChart {
  const date = input.date || new Date().toISOString().slice(0, 10)
  const [y, m, d] = date.split('-').map(Number)
  const [hh] = (input.clock || '12:00').split(':').map(Number)
  const solar = Solar.fromYmd(y, m, d)
  const lunar = solar.getLunar()
  const lunarMonth = Math.abs(lunar.getMonth())
  const lunarDay = lunar.getDay()
  const shichen = hourToShichen(hh || 12)
  const offset = Math.abs(Number(input.count) || 0) % 6

  const yueIdx = (lunarMonth - 1 + offset) % 6
  const riIdx = (yueIdx + lunarDay - 1) % 6
  const shiIdx = (riIdx + shichen - 1) % 6

  const yueGong = LIU_SHEN[yueIdx]
  const riGong = LIU_SHEN[riIdx]
  const shiGong = LIU_SHEN[shiIdx]

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    matter: typeof input.matter === 'string' ? input.matter : undefined,
    lunarLabel: `农历${lunarMonth}月${lunarDay}日 · ${shichen}时辰`,
    yueGong,
    riGong,
    shiGong,
    main: shiGong,
  }
}

export function formatXiaoliurenForPrompt(chart: XiaoliurenChart): string {
  return [
    '## 小六壬课式（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    chart.matter ? `- 事项：${chart.matter}` : null,
    `- 历法：${chart.lunarLabel}`,
    `- 月宫：${chart.yueGong.name}（${chart.yueGong.wx}/${chart.yueGong.level}）`,
    `- 日宫：${chart.riGong.name}（${chart.riGong.wx}/${chart.riGong.level}）`,
    `- 时宫（主断）：${chart.shiGong.name}（${chart.shiGong.wx}/${chart.shiGong.level}）`,
    `- 歌诀：${chart.main.verdict}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildXiaoliurenRuleReading(chart: XiaoliurenChart): string {
  return [
    formatXiaoliurenForPrompt(chart),
    '',
    '## 规则断语',
    `- 主断【${chart.main.name}】：${chart.main.verdict}`,
    '- 月宫看起意，日宫看过程，时宫看结果。',
    '',
    '## 解读边界',
    '- 六神落宫为算法输出，润色不得改写宫名。',
  ].join('\n')
}

export function collectXiaoliurenAllowedTerms(chart: XiaoliurenChart): Set<string> {
  return new Set([
    chart.yueGong.name,
    chart.riGong.name,
    chart.shiGong.name,
    chart.main.wx,
    ...LIU_SHEN.map((s) => s.name),
  ])
}
