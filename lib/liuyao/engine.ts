/**
 * 六爻纳甲排盘 — 自研（对照公开纳甲表，避免 GPL 依赖）
 */

import { Solar } from 'lunar-javascript'

/** 六爻值：6老阴 7少阳 8少阴 9老阳 */
export type YaoValue = 6 | 7 | 8 | 9

const BAGUA_LINES: Record<string, [number, number, number]> = {
  乾: [1, 1, 1],
  兑: [0, 1, 1],
  离: [1, 0, 1],
  震: [0, 0, 1],
  巽: [1, 1, 0],
  坎: [0, 1, 0],
  艮: [1, 0, 0],
  坤: [0, 0, 0],
}

const BAGUA_ORDER = ['坤', '震', '坎', '兑', '艮', '离', '巽', '乾'] as const

/** 八卦纳甲（干支，自下而上） */
const NAJIA: Record<string, string[]> = {
  乾: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
  兑: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
  离: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
  震: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
  巽: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
  坎: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
  艮: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
  坤: ['乙未', '乙巳', '乙卯', '乙丑', '乙亥', '乙酉'],
}

const WX_GAN: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const WX_ZHI: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

/** 八卦宫五行 */
const PALACE_WX: Record<string, string> = {
  乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土',
}

const LIUQIN_MAP: Record<string, string> = {
  同我: '兄弟',
  我生: '子孙',
  我克: '妻财',
  克我: '官鬼',
  生我: '父母',
}

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

const ALL_LIUQIN = ['父母', '兄弟', '子孙', '妻财', '官鬼'] as const

const LIUSHOU = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const

/** 地支六合 */
const LIUHE: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}

const ZHI12 = '子丑寅卯辰巳午未申酉戌亥'

function isChongZhi(a: string, b: string) {
  return (ZHI12.indexOf(a) + 6) % 12 === ZHI12.indexOf(b)
}

function yueRiMarks(branch: string, monthZhi: string, dayZhi: string): string[] {
  const marks: string[] = []
  if (branch === monthZhi) marks.push('月建')
  if (branch === dayZhi) marks.push('日建')
  if (LIUHE[branch] === monthZhi) marks.push('月合')
  if (LIUHE[branch] === dayZhi) marks.push('日合')
  if (isChongZhi(branch, monthZhi)) marks.push('月冲')
  if (isChongZhi(branch, dayZhi)) marks.push('日冲')
  return marks
}

/** 京氏八宫：本宫→一世…五世→游魂→归魂（共 8 卦） */
const JING_GONG: Record<string, string[]> = {
  乾: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
  离: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  震: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  巽: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  坎: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  艮: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  坤: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
}

/** 世爻位：本宫六、一世一…五世五、游魂四、归魂三；应=世±3 */
const SHI_BY_GEN = [6, 1, 2, 3, 4, 5, 4, 3] as const

function resolveGong(benName: string): { palace: string; gen: number; shi: number; ying: number } {
  for (const [palace, list] of Object.entries(JING_GONG)) {
    const gen = list.indexOf(benName)
    if (gen >= 0) {
      const shi = SHI_BY_GEN[gen]
      const ying = ((shi + 2 - 1) % 6) + 1
      return { palace, gen, shi, ying }
    }
  }
  // 未命中时回落下卦宫、世六
  return { palace: '坤', gen: 0, shi: 6, ying: 3 }
}

const HEX64: Record<string, string> = {}
;(() => {
  const upperNames = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
  const table = [
    ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
    ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
    ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
    ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
    ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
    ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
    ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
    ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
  ]
  for (let u = 0; u < 8; u++) {
    for (let l = 0; l < 8; l++) {
      HEX64[`${upperNames[u]}-${upperNames[l]}`] = table[u][l]
    }
  }
})()

function linesToGua(lines: number[]): string {
  const key = lines.join('')
  for (const [name, arr] of Object.entries(BAGUA_LINES)) {
    if (arr.join('') === key) return name
  }
  return '坤'
}

function liuqin(selfWx: string, otherWx: string): string {
  if (selfWx === otherWx) return LIUQIN_MAP['同我']
  if (SHENG[selfWx] === otherWx) return LIUQIN_MAP['我生']
  if (KE[selfWx] === otherWx) return LIUQIN_MAP['我克']
  if (KE[otherWx] === selfWx) return LIUQIN_MAP['克我']
  if (SHENG[otherWx] === selfWx) return LIUQIN_MAP['生我']
  return '—'
}

/** 旬空：日柱所在旬空亡两支 */
function xunKong(dayGanZhi: string): string {
  const GAN = '甲乙丙丁戊己庚辛壬癸'
  const ZHI = '子丑寅卯辰巳午未申酉戌亥'
  const gi = GAN.indexOf(dayGanZhi[0])
  const zi = ZHI.indexOf(dayGanZhi[1])
  if (gi < 0 || zi < 0) return '—'
  const xunStart = ((zi - gi) % 12 + 12) % 12
  const k1 = ZHI[(xunStart + 10) % 12]
  const k2 = ZHI[(xunStart + 11) % 12]
  return `${k1}${k2}`
}

export interface LiuyaoInput {
  /** 自下而上 6 个爻值 */
  yaoValues?: YaoValue[]
  method?: 'manual' | 'time' | 'coin'
  date?: string
  clock?: string
  question?: string
}

export interface YaoLine {
  position: number
  value: YaoValue
  yinYang: '阳' | '阴'
  changing: boolean
  ganZhi: string
  wx: string
  liuqin: string
  animal: string
  mark: string
  /** 月建/日建/合冲等 */
  yueRi: string[]
  /** 变爻纳甲（动爻才有） */
  bianGanZhi?: string
  bianWx?: string
  bianLiuqin?: string
  /** 本爻下伏神 */
  fuShen?: { ganZhi: string; wx: string; liuqin: string }
}

export interface LiuyaoChart {
  method: string
  question?: string
  dayGanZhi: string
  monthGanZhi: string
  xunKong: string
  benName: string
  zhiName: string
  upper: string
  lower: string
  palace: string
  palaceWx: string
  lines: YaoLine[]
  fuShenList: { position: number; ganZhi: string; wx: string; liuqin: string }[]
  shi: number
  ying: number
  changingPositions: number[]
}

function timeToYaos(date: string, clock: string): YaoValue[] {
  /** 可复现伪随机：同日期钟点 → 同六爻；非古典「年月日时求余」起卦 */
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = clock.split(':').map(Number)
  const seed = y * 10000 + m * 100 + d + (hh || 0) * 60 + (mm || 0)
  const out: YaoValue[] = []
  let s = seed
  for (let i = 0; i < 6; i++) {
    s = (s * 1103515245 + 12345) >>> 0
    const r = s % 8
    out.push((6 + (r % 4)) as YaoValue)
  }
  return out
}

function coinYaos(seed = Date.now()): YaoValue[] {
  let s = seed >>> 0
  const out: YaoValue[] = []
  for (let i = 0; i < 6; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    // 三枚铜钱：3背=9, 2背=7, 1背=8, 0背=6
    const backs = s % 4
    out.push(([6, 8, 7, 9] as YaoValue[])[backs])
  }
  return out
}

export function buildLiuyaoChart(input: LiuyaoInput): LiuyaoChart {
  const methodRaw = input.method || (input.yaoValues ? 'manual' : 'time')
  let yaos = input.yaoValues
  if (!yaos || yaos.length !== 6) {
    if (methodRaw === 'coin') yaos = coinYaos()
    else {
      const date = input.date || new Date().toISOString().slice(0, 10)
      const clock = input.clock || '12:00'
      yaos = timeToYaos(date, clock)
    }
  }

  const method =
    methodRaw === 'time'
      ? 'time（可复现伪随机）'
      : methodRaw === 'coin'
        ? 'coin（铜钱模拟）'
        : 'manual'

  const date = input.date || new Date().toISOString().slice(0, 10)
  const [y, m, d] = date.split('-').map(Number)
  const [hh] = (input.clock || '12:00').split(':').map(Number)
  const solar = Solar.fromYmdHms(y, m, d, hh || 12, 0, 0)
  const lunar = solar.getLunar()
  const dayGanZhi = lunar.getDayInGanZhi()
  const monthGanZhi = lunar.getMonthInGanZhi()
  const monthZhi = monthGanZhi[1]
  const dayZhi = dayGanZhi[1]
  const dayGan = dayGanZhi[0]
  const animalStart = '甲乙丙丁戊己'.indexOf(dayGan)
  const startIdx = animalStart >= 0 ? animalStart % 6 : 0

  const benLines = yaos.map((v) => (v === 7 || v === 9 ? 1 : 0))
  const zhiLinesArr = yaos.map((v) => {
    if (v === 9) return 0
    if (v === 6) return 1
    return v === 7 ? 1 : 0
  })

  const lower = linesToGua(benLines.slice(0, 3) as [number, number, number])
  const upper = linesToGua(benLines.slice(3, 6) as [number, number, number])
  const zhiLower = linesToGua(zhiLinesArr.slice(0, 3) as [number, number, number])
  const zhiUpper = linesToGua(zhiLinesArr.slice(3, 6) as [number, number, number])
  const benName = HEX64[`${upper}-${lower}`] || `${upper}${lower}`
  const zhiName = HEX64[`${zhiUpper}-${zhiLower}`] || `${zhiUpper}${zhiLower}`

  const { palace, shi, ying } = resolveGong(benName)
  const palaceWx = PALACE_WX[palace] || '土'
  const najiaLower = NAJIA[lower] || NAJIA['坤']
  const najiaUpper = NAJIA[upper] || NAJIA['坤']
  const zhiNajiaLower = NAJIA[zhiLower] || NAJIA['坤']
  const zhiNajiaUpper = NAJIA[zhiUpper] || NAJIA['坤']
  const kong = xunKong(dayGanZhi)

  const pureNajia = NAJIA[palace] || NAJIA['坤']
  const pureLiuqin = pureNajia.map((gz) => liuqin(palaceWx, WX_ZHI[gz[1]] || '土'))

  const changingPositions: number[] = []
  const lines: YaoLine[] = yaos.map((value, i) => {
    const position = i + 1
    const changing = value === 6 || value === 9
    if (changing) changingPositions.push(position)
    const ganZhi = position <= 3 ? najiaLower[position - 1] : najiaUpper[position - 1]
    const branchWx = WX_ZHI[ganZhi[1]] || '土'
    const lq = liuqin(palaceWx, branchWx)
    const yueRi = yueRiMarks(ganZhi[1], monthZhi, dayZhi)
    let mark = ''
    if (position === shi) mark = '世'
    if (position === ying) mark = mark ? '世应' : '应'
    if (kong.includes(ganZhi[1])) mark = mark ? `${mark}空` : '空'
    if (yueRi.length) mark = mark ? `${mark}${yueRi.join('')}` : yueRi.join('')

    const line: YaoLine = {
      position,
      value,
      yinYang: value === 7 || value === 9 ? '阳' : '阴',
      changing,
      ganZhi,
      wx: branchWx,
      liuqin: lq,
      animal: LIUSHOU[(startIdx + i) % 6],
      mark,
      yueRi,
    }
    if (changing) {
      const bgz = position <= 3 ? zhiNajiaLower[position - 1] : zhiNajiaUpper[position - 1]
      const bwx = WX_ZHI[bgz[1]] || '土'
      line.bianGanZhi = bgz
      line.bianWx = bwx
      line.bianLiuqin = liuqin(palaceWx, bwx)
    }
    return line
  })

  const present = new Set(lines.map((l) => l.liuqin))
  const fuShenList: LiuyaoChart['fuShenList'] = []
  for (const lqName of ALL_LIUQIN) {
    if (present.has(lqName)) continue
    const idx = pureLiuqin.indexOf(lqName)
    if (idx < 0) continue
    const gz = pureNajia[idx]
    const wx = WX_ZHI[gz[1]] || '土'
    const position = idx + 1
    const item = { position, ganZhi: gz, wx, liuqin: lqName }
    fuShenList.push(item)
    if (lines[idx] && !lines[idx].fuShen) {
      lines[idx].fuShen = { ganZhi: gz, wx, liuqin: lqName }
      lines[idx].mark = lines[idx].mark ? `${lines[idx].mark}伏` : '伏'
    }
  }

  return {
    method,
    question: typeof input.question === 'string' ? input.question : undefined,
    dayGanZhi,
    monthGanZhi,
    xunKong: kong,
    benName,
    zhiName,
    upper,
    lower,
    palace,
    palaceWx,
    lines,
    fuShenList,
    shi,
    ying,
    changingPositions,
  }
}

export function formatLiuyaoForPrompt(chart: LiuyaoChart): string {
  const rows = chart.lines
    .slice()
    .reverse()
    .map((l) => {
      const bian = l.bianGanZhi ? `→${l.bianGanZhi}${l.bianLiuqin || ''}` : ''
      const fu = l.fuShen ? `伏${l.fuShen.ganZhi}${l.fuShen.liuqin}` : ''
      return `| ${l.position} | ${l.value} | ${l.yinYang}${l.changing ? '动' : ''} | ${l.ganZhi}${bian} | ${l.liuqin} | ${l.animal} | ${l.mark || '—'} | ${fu || '—'} |`
    })
  const fuLines =
    chart.fuShenList.length > 0
      ? chart.fuShenList.map((f) => `- 伏神：第${f.position}爻下 ${f.ganZhi} ${f.liuqin}（${f.wx}）`)
      : ['- 伏神：无（六亲俱全）']
  return [
    '## 六爻盘面（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 起卦：${chart.method}；月柱 ${chart.monthGanZhi}；日柱 ${chart.dayGanZhi}；旬空 ${chart.xunKong}`,
    `- 本卦：${chart.benName}（上${chart.upper}下${chart.lower}）· 宫：${chart.palace}（${chart.palaceWx}）`,
    `- 之卦：${chart.zhiName}`,
    `- 世爻：第${chart.shi}爻 · 应爻：第${chart.ying}爻`,
    `- 动爻：${chart.changingPositions.length ? chart.changingPositions.join('、') : '无'}`,
    ...fuLines,
    '',
    '| 爻位 | 值 | 阴阳 | 纳甲 | 六亲 | 六兽 | 标记 | 伏神 |',
    '|---|---|---|---|---|---|---|---|',
    ...rows,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildLiuyaoRuleReading(chart: LiuyaoChart): string {
  const yueRiHits = chart.lines
    .filter((l) => l.yueRi.length)
    .map((l) => `第${l.position}爻${l.ganZhi}（${l.yueRi.join('、')}）`)
  return [
    formatLiuyaoForPrompt(chart),
    '',
    '## 规则断语',
    `- 以世爻为我、应爻为事/对方；动爻为变化关键；缺六亲看伏神。`,
    chart.changingPositions.length
      ? `- 动爻在 ${chart.changingPositions.join('、')}，重点参看之卦 ${chart.zhiName} 与变爻纳甲。`
      : '- 六爻安静，以本卦静断为主。',
    chart.fuShenList.length
      ? `- 有伏神 ${chart.fuShenList.map((f) => f.liuqin).join('、')}，事机隐伏。`
      : null,
    yueRiHits.length
      ? `- 日月建合冲：${yueRiHits.join('；')}。月建为提纲，日建为用神旺衰参照；冲则动摇，合则牵绊。`
      : `- 月柱 ${chart.monthGanZhi}、日柱 ${chart.dayGanZhi}：本卦爻支未见直接月建/日建/六合冲标记。`,
    '',
    '## 解读边界',
    '- 卦名、纳甲、六亲、世应、伏神、日月建合冲为算法输出，润色不得改写。',
    chart.method.includes('伪随机')
      ? '- 时间起卦为可复现伪随机映射（同输入同卦），非古典年月日时求余起卦；正式占断请用铜钱或手动装卦。'
      : null,
  ]
    .filter((x) => x != null)
    .join('\n')
}

export function collectLiuyaoAllowedTerms(chart: LiuyaoChart): Set<string> {
  const s = new Set<string>([
    chart.benName,
    chart.zhiName,
    chart.upper,
    chart.lower,
    chart.palace,
    chart.palaceWx,
    chart.dayGanZhi,
    chart.monthGanZhi,
    chart.xunKong,
  ])
  chart.lines.forEach((l) => {
    s.add(l.ganZhi)
    s.add(l.liuqin)
    s.add(l.animal)
    s.add(l.wx)
    if (l.bianGanZhi) s.add(l.bianGanZhi)
    if (l.bianLiuqin) s.add(l.bianLiuqin)
    if (l.fuShen) {
      s.add(l.fuShen.ganZhi)
      s.add(l.fuShen.liuqin)
    }
  })
  chart.fuShenList.forEach((f) => {
    s.add(f.ganZhi)
    s.add(f.liuqin)
  })
  ;['世', '应', '父母', '兄弟', '子孙', '妻财', '官鬼', '伏神', '月建', '日建', '月合', '日合', '月冲', '日冲'].forEach(
    (t) => s.add(t),
  )
  return s
}
