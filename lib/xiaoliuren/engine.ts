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

/** 事项类型 → 六神专断（在通用歌诀之上叠加） */
const MATTER_VERDICT: Record<string, Record<(typeof LIU_SHEN)[number]['name'], string>> = {
  求财: {
    大安: '财路稳，宜守本业与正当渠道，勿贪意外之财。',
    留连: '款项拖延，账目未清；宜催收而非新投。',
    速喜: '财来较快，有成色；签约宜趁热。',
    赤口: '因财生非，防被坑或争利伤和。',
    小吉: '小有进账，积少成多；大宗尚需再议。',
    空亡: '求财落空或回本艰难，宜止损观望。',
  },
  出行: {
    大安: '出行平安，可择熟路与固定日程。',
    留连: '行程耽搁、改期或滞留；备冗余时间。',
    速喜: '出行顺利，有喜讯或顺利抵达。',
    赤口: '途中口舌、检查或冲突；慎冲动。',
    小吉: '大体平安，小有波折无大碍。',
    空亡: '不宜远行，或行而无功、音信难通。',
  },
  婚姻: {
    大安: '感情稳定，宜守成与坦诚沟通。',
    留连: '进展缓慢、拉锯；不宜逼婚逼分。',
    速喜: '有喜讯、定情或复合之机。',
    赤口: '口角争执，防第三者闲话。',
    小吉: '有进展但不圆满，宜循序。',
    空亡: '缘分落空或名存实亡，宜冷静。',
  },
  官非: {
    大安: '官事可解，宜走正规程序。',
    留连: '案件拖延，勿急躁催办。',
    速喜: '有转机、胜诉或调解成功之象。',
    赤口: '口舌升级，防加剧对立。',
    小吉: '小有利好，尚未彻底了结。',
    空亡: '证据不足或无果，勿硬碰。',
  },
  疾病: {
    大安: '身体尚稳，调养可复；勿乱投医。',
    留连: '病程缠绵，宜耐心治疗。',
    速喜: '好转较快，药石有应。',
    赤口: '炎症、外伤或医患口舌；慎急症。',
    小吉: '小恙可愈，大病仍需复查。',
    空亡: '诊断不明或疗效落空，宜二诊。',
  },
  寻人: {
    大安: '人未远动，可在常住处寻。',
    留连: '人未归或仍在路上，消息迟。',
    速喜: '人将至或很快有音信。',
    赤口: '寻人易起争执，防误会对质。',
    小吉: '有线索但不完整，可继续跟。',
    空亡: '音信稀少，短期难见人。',
  },
}

const MATTER_ALIASES: { key: string; words: string[] }[] = [
  { key: '求财', words: ['求财', '财运', '生意', '投资', '买卖', '合同'] },
  { key: '出行', words: ['出行', '旅行', '出差', '搬家', '迁'] },
  { key: '婚姻', words: ['婚姻', '感情', '恋爱', '桃花', '复合'] },
  { key: '官非', words: ['官非', '诉讼', '官司', '纠纷', '报警'] },
  { key: '疾病', words: ['疾病', '健康', '生病', '就医', '手术'] },
  { key: '寻人', words: ['寻人', '找人', '归期', '音信', '失联'] },
]

export function resolveMatterKey(matter?: string, question?: string): string | null {
  const text = `${matter || ''} ${question || ''}`
  for (const row of MATTER_ALIASES) {
    if (row.words.some((w) => text.includes(w))) return row.key
  }
  return null
}

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
  matterKey: string | null
  matterHint: string | null
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
  const matterKey = resolveMatterKey(input.matter, input.question)
  const matterHint =
    matterKey && MATTER_VERDICT[matterKey]
      ? MATTER_VERDICT[matterKey][shiGong.name]
      : null

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    matter: typeof input.matter === 'string' ? input.matter : undefined,
    matterKey,
    matterHint,
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
    chart.matterKey ? `- 事项归类：${chart.matterKey}` : null,
    `- 历法：${chart.lunarLabel}`,
    `- 月宫：${chart.yueGong.name}（${chart.yueGong.wx}/${chart.yueGong.level}）`,
    `- 日宫：${chart.riGong.name}（${chart.riGong.wx}/${chart.riGong.level}）`,
    `- 时宫（主断）：${chart.shiGong.name}（${chart.shiGong.wx}/${chart.shiGong.level}）`,
    `- 歌诀：${chart.main.verdict}`,
    chart.matterHint ? `- 事项专断：${chart.matterHint}` : null,
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
    chart.matterHint
      ? `- 就「${chart.matterKey}」言之：${chart.matterHint}`
      : '- 未识别事项类型时，以时宫通用歌诀为主；可填求财/出行/婚姻等。',
    '- 月宫看起意，日宫看过程，时宫看结果。',
    '',
    '## 解读边界',
    '- 六神落宫与事项专断为算法输出，润色不得改写宫名。',
  ].join('\n')
}

export function collectXiaoliurenAllowedTerms(chart: XiaoliurenChart): Set<string> {
  const s = new Set([
    chart.yueGong.name,
    chart.riGong.name,
    chart.shiGong.name,
    chart.main.wx,
    ...LIU_SHEN.map((x) => x.name),
  ])
  if (chart.matterKey) s.add(chart.matterKey)
  return s
}
