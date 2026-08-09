/**
 * 梅花易数 — 自研确定性起卦
 * 时间起卦 / 数字起卦 / 本互变 / 体用五行
 */

import { Solar } from 'lunar-javascript'

export const BAGUA = [
  { n: 1, name: '乾', nature: '天', wx: '金' },
  { n: 2, name: '兑', nature: '泽', wx: '金' },
  { n: 3, name: '离', nature: '火', wx: '火' },
  { n: 4, name: '震', nature: '雷', wx: '木' },
  { n: 5, name: '巽', nature: '风', wx: '木' },
  { n: 6, name: '坎', nature: '水', wx: '水' },
  { n: 7, name: '艮', nature: '山', wx: '土' },
  { n: 8, name: '坤', nature: '地', wx: '土' },
] as const

/** 上卦索引 0–7 × 下卦 0–7 → 六十四卦名（简化表，按先天序） */
const HEX_NAMES: string[][] = (() => {
  const names = [
    ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
    ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
    ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
    ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
    ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
    ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
    ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
    ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
  ]
  return names
})()

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function mod8(n: number) {
  const r = n % 8
  return r === 0 ? 8 : ((r % 8) + 8) % 8 || 8
}

function mod6(n: number) {
  const r = n % 6
  return r === 0 ? 6 : ((r % 6) + 6) % 6 || 6
}

function baguaByN(n: number) {
  return BAGUA.find((b) => b.n === n) || BAGUA[7]
}

function hexName(upper: number, lower: number) {
  return HEX_NAMES[upper - 1]?.[lower - 1] || `${baguaByN(upper).name}${baguaByN(lower).name}`
}

/** 互卦：取 2,3,4 爻为下，3,4,5 为上（按先天八卦数简化：用上下卦重排） */
function huGua(upper: number, lower: number) {
  // 简化：互上 = (upper+lower)%8 映射，保证确定性
  const huUpper = mod8(upper + lower)
  const huLower = mod8(upper * 2 + lower)
  return { upper: huUpper, lower: huLower, name: hexName(huUpper, huLower) }
}

function bianGua(upper: number, lower: number, dongYao: number) {
  // 动爻 1–6：1–3 动下卦，4–6 动上卦（简化翻转卦序）
  let u = upper
  let l = lower
  if (dongYao <= 3) l = mod8(lower + dongYao)
  else u = mod8(upper + (dongYao - 3))
  return { upper: u, lower: l, name: hexName(u, l) }
}

function tiYongRelation(tiWx: string, yongWx: string) {
  if (tiWx === yongWx) return { relation: '比和', verdict: '平稳，宜守成' }
  if (SHENG[tiWx] === yongWx) return { relation: '体生用', verdict: '耗泄，事倍功半，宜谨慎付出' }
  if (SHENG[yongWx] === tiWx) return { relation: '用生体', verdict: '得助，事易成，有贵人' }
  if (KE[tiWx] === yongWx) return { relation: '体克用', verdict: '可进取，能掌控局面' }
  if (KE[yongWx] === tiWx) return { relation: '用克体', verdict: '阻力大，宜缓图或回避' }
  return { relation: '未知', verdict: '—' }
}

export type MeihuaMethod = 'time' | 'number' | 'stroke'

export interface MeihuaInput {
  method?: MeihuaMethod
  /** YYYY-MM-DD */
  date?: string
  /** HH:MM */
  clock?: string
  num1?: number
  num2?: number
  num3?: number
  /** 汉字起卦原文（按笔画） */
  text?: string
  question?: string
}

export interface MeihuaChart {
  method: MeihuaMethod
  question?: string
  upper: ReturnType<typeof baguaByN>
  lower: ReturnType<typeof baguaByN>
  dongYao: number
  ben: { name: string; upper: number; lower: number }
  hu: { name: string; upper: number; lower: number }
  bian: { name: string; upper: number; lower: number }
  /** 体卦：静卦侧；用卦：动卦侧（简化：动爻在下则下为用） */
  ti: ReturnType<typeof baguaByN>
  yong: ReturnType<typeof baguaByN>
  tiYong: { relation: string; verdict: string }
  solarLabel?: string
  strokeInfo?: string
}

/** 常用字笔画（不足字用确定性估算，保证可复现） */
const STROKE_MAP: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 5, 五: 4, 六: 4, 七: 2, 八: 2, 九: 2, 十: 2,
  人: 2, 大: 3, 小: 3, 天: 4, 地: 6, 日: 4, 月: 4, 水: 4, 火: 4, 木: 4,
  金: 8, 土: 3, 山: 3, 石: 5, 田: 5, 心: 4, 手: 4, 口: 3, 目: 5, 耳: 6,
  财: 7, 運: 13, 运: 8, 婚: 11, 姻: 9, 病: 10, 成: 6, 功: 5, 敗: 11,
  败: 8, 問: 11, 问: 6, 事: 8, 求: 7, 測: 12, 测: 9, 吉: 6, 凶: 4, 安: 6,
  靈: 24, 灵: 7, 鏡: 19, 镜: 13, 易: 8, 經: 13, 经: 8, 卦: 8, 爻: 4,
}

export function countStrokes(text: string): { total: number; detail: string } {
  const chars = [...(text || '').replace(/\s/g, '')]
  if (!chars.length) return { total: 1, detail: '空文按 1 画' }
  let total = 0
  const parts: string[] = []
  for (const ch of chars) {
    let n = STROKE_MAP[ch]
    if (n == null) {
      // 确定性估算：CJK 统一区用码位映射，保证同字同画
      const code = ch.codePointAt(0) || 1
      n = (code % 16) + 1
      parts.push(`${ch}≈${n}`)
    } else {
      parts.push(`${ch}${n}`)
    }
    total += n
  }
  return { total, detail: parts.join('+') }
}

export function buildMeihuaChart(input: MeihuaInput): MeihuaChart {
  const rawMethod = input.method || 'time'
  const method: MeihuaMethod =
    rawMethod === 'number' || rawMethod === 'stroke' ? rawMethod : 'time'
  let upperN: number
  let lowerN: number
  let dongYao: number
  let solarLabel: string | undefined
  let strokeInfo: string | undefined

  if (method === 'number') {
    const a = Math.abs(Number(input.num1) || 1)
    const b = Math.abs(Number(input.num2) || a)
    const c = Math.abs(Number(input.num3) || a + b)
    upperN = mod8(a)
    lowerN = mod8(b)
    dongYao = mod6(c)
  } else if (method === 'stroke') {
    const text = String(input.text || input.question || '事')
    const mid = Math.ceil(text.replace(/\s/g, '').length / 2) || 1
    const chars = [...text.replace(/\s/g, '')]
    const upperText = chars.slice(0, mid).join('') || '事'
    const lowerText = chars.slice(mid).join('') || upperText
    const up = countStrokes(upperText)
    const lo = countStrokes(lowerText)
    const all = countStrokes(chars.join(''))
    upperN = mod8(up.total)
    lowerN = mod8(lo.total)
    dongYao = mod6(all.total)
    strokeInfo = `「${text}」上${up.total}画(${up.detail}) 下${lo.total}画(${lo.detail}) 动${all.total}画`
  } else {
    const date = input.date || new Date().toISOString().slice(0, 10)
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = (input.clock || '12:00').split(':').map(Number)
    const solar = Solar.fromYmdHms(y, m, d, hh || 12, mm || 0, 0)
    const lunar = solar.getLunar()
    const yearZhiIndex = (lunar.getYearZhiIndex?.() ?? 0) + 1 // 1–12
    const lunarMonth = Math.abs(lunar.getMonth())
    const lunarDay = lunar.getDay()
    const hourZhi = Math.floor(((hh || 12) + 1) / 2) % 12 + 1
    upperN = mod8(yearZhiIndex + lunarMonth + lunarDay)
    lowerN = mod8(yearZhiIndex + lunarMonth + lunarDay + hourZhi)
    dongYao = mod6(yearZhiIndex + lunarMonth + lunarDay + hourZhi)
    solarLabel = `${y}-${m}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}（农历${lunar.toString()}）`
  }

  const upper = baguaByN(upperN)
  const lower = baguaByN(lowerN)
  const ben = { name: hexName(upperN, lowerN), upper: upperN, lower: lowerN }
  const hu = huGua(upperN, lowerN)
  const bian = bianGua(upperN, lowerN, dongYao)
  // 体用：动爻在下卦（1-3）则下为用上为体，反之上为用下为体
  const ti = dongYao <= 3 ? upper : lower
  const yong = dongYao <= 3 ? lower : upper
  const tiYong = tiYongRelation(ti.wx, yong.wx)

  return {
    method,
    question: typeof input.question === 'string' ? input.question : undefined,
    upper,
    lower,
    dongYao,
    ben,
    hu: { name: hu.name, upper: hu.upper, lower: hu.lower },
    bian: { name: bian.name, upper: bian.upper, lower: bian.lower },
    ti,
    yong,
    tiYong,
    solarLabel,
    strokeInfo,
  }
}

export function formatMeihuaForPrompt(chart: MeihuaChart): string {
  const methodLabel =
    chart.method === 'time' ? '时间' : chart.method === 'stroke' ? '汉字笔画' : '数字'
  return [
    '## 梅花易数盘面（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 起卦法：${methodLabel}`,
    chart.solarLabel ? `- 时间：${chart.solarLabel}` : null,
    chart.strokeInfo ? `- 笔画：${chart.strokeInfo}` : null,
    `- 本卦：${chart.ben.name}（上${chart.upper.name}/下${chart.lower.name}）`,
    `- 动爻：第 ${chart.dongYao} 爻`,
    `- 互卦：${chart.hu.name}`,
    `- 变卦：${chart.bian.name}`,
    `- 体卦：${chart.ti.name}（${chart.ti.wx}）· 用卦：${chart.yong.name}（${chart.yong.wx}）`,
    `- 体用关系：${chart.tiYong.relation} → ${chart.tiYong.verdict}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildMeihuaRuleReading(chart: MeihuaChart): string {
  return [
    formatMeihuaForPrompt(chart),
    '',
    '## 规则断语',
    `- ${chart.tiYong.verdict}`,
    '- 互卦看过程，变卦看结果；体为己、用为事。',
    '',
    '## 解读边界',
    '- 卦名、体用、动爻为算法输出，润色不得改写。',
  ].join('\n')
}

export function collectMeihuaAllowedTerms(chart: MeihuaChart): Set<string> {
  const s = new Set<string>([
    chart.ben.name,
    chart.hu.name,
    chart.bian.name,
    chart.upper.name,
    chart.lower.name,
    chart.ti.name,
    chart.yong.name,
    chart.ti.wx,
    chart.yong.wx,
    chart.tiYong.relation,
  ])
  return s
}
