/**
 * 太乙神数 — 积年与十六神将简局（JS 实现；完整古法见 Python sidecar）
 */

import { Solar } from 'lunar-javascript'

/** 上元甲子积年锚点（简化常数，与常见公开算法对齐量级） */
const TAIYI_EPOCH_YEAR = -2697
const TAIYI_YUAN = 10155240

const SHEN_JIANG = [
  '太乙', '文昌', '始击', '主算', '客算', '定算',
  '天目', '地目', '计神', '君基', '臣基', '民基',
  '五福', '大游', '小游', '四神',
]

const GONG16 = [
  '乾', '亥', '壬', '子', '癸', '丑', '艮', '寅',
  '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午',
]

export interface TaiyiInput {
  date?: string
  clock?: string
  /** 0年 1月 2日 3时 */
  jiStyle?: 0 | 1 | 2 | 3
  question?: string
  matter?: string
}

export interface TaiyiChart {
  question?: string
  matter?: string
  jiStyle: number
  jiLabel: string
  jiNian: number
  yangDun: boolean
  ju: number
  placements: { name: string; gong: string }[]
  zhuSuan: number
  keSuan: number
  engine: string
  researchNote: string
}

export function buildTaiyiChart(input: TaiyiInput): TaiyiChart {
  const date = input.date || new Date().toISOString().slice(0, 10)
  const [y, m, d] = date.split('-').map(Number)
  const [hh] = (input.clock || '12:00').split(':').map(Number)
  const solar = Solar.fromYmd(y, m, d)
  const jiStyle = (Number(input.jiStyle) || 0) as 0 | 1 | 2 | 3
  const jiLabel = ['年计', '月计', '日计', '時計'][jiStyle]

  // 积年简化
  let jiNian = TAIYI_YUAN + (y - 1984)
  if (jiStyle >= 1) jiNian += m
  if (jiStyle >= 2) jiNian += d
  if (jiStyle >= 3) jiNian += Math.floor((hh || 12) / 2)

  const yangDun = jiNian % 2 === 0
  const ju = (jiNian % 72) + 1
  const base = jiNian % 16

  const placements = SHEN_JIANG.map((name, i) => ({
    name,
    gong: GONG16[(base + i * (yangDun ? 1 : -1) + 160) % 16],
  }))

  const zhuSuan = (jiNian % 9) + 1
  const keSuan = ((jiNian * 3) % 9) + 1

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    matter: typeof input.matter === 'string' ? input.matter : undefined,
    jiStyle,
    jiLabel,
    jiNian,
    yangDun,
    ju,
    placements,
    zhuSuan,
    keSuan,
    engine: 'lingjing-taiyi-lite@1',
    researchNote:
      '太乙侧重国运/天时/大势，非日常一事一占。完整统宗/金镜法可通过 services/py-engine 调用 kintaiyi。',
  }
}

export function formatTaiyiForPrompt(chart: TaiyiChart): string {
  return [
    '## 太乙神数简局（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    chart.matter ? `- 事项类型：${chart.matter}` : null,
    `- 引擎：${chart.engine} · ${chart.jiLabel}`,
    `- 积年：${chart.jiNian} · ${chart.yangDun ? '阳遁' : '阴遁'} · 局数 ${chart.ju}`,
    `- 主算：${chart.zhuSuan} · 客算：${chart.keSuan}`,
    ...chart.placements.slice(0, 8).map((p) => `- ${p.name}：${p.gong}`),
    `- 说明：${chart.researchNote}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildTaiyiRuleReading(chart: TaiyiChart): string {
  return [
    formatTaiyiForPrompt(chart),
    '',
    '## 规则断语',
    `- 主客算对比：主${chart.zhuSuan} / 客${chart.keSuan}；主大于客偏主动方有势（简判）。`,
    '',
    '## 解读边界',
    '- 本盘为教学/研究级简局，不作军事或政治决策依据。',
  ].join('\n')
}

export function collectTaiyiAllowedTerms(chart: TaiyiChart): Set<string> {
  const s = new Set<string>([chart.jiLabel, ...SHEN_JIANG, ...GONG16])
  chart.placements.forEach((p) => {
    s.add(p.name)
    s.add(p.gong)
  })
  return s
}
