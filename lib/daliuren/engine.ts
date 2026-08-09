/**
 * 大六壬 — 月将加时、四课、三传（九宗门简化实现）
 */

import { Solar } from 'lunar-javascript'

const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const GAN = '甲乙丙丁戊己庚辛壬癸'

/** 月将：节气月 → 月将地支索引 0–11（简化：寅月亥将） */
const YUE_JIANG = ['亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌']

const TIAN_JIANG = [
  '贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙',
  '天空', '白虎', '太常', '玄武', '太阴', '天后',
]

/** 寄宫：干 → 支 */
const JI_GONG: Record<string, string> = {
  甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳',
  己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
}

const WX_ZHI: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function zhiIndex(z: string) {
  return ZHI.indexOf(z)
}

function addZhi(z: string, n: number) {
  return ZHI[(zhiIndex(z) + n + 12) % 12]
}

function isKe(a: string, b: string) {
  return KE[WX_ZHI[a]] === WX_ZHI[b]
}

export interface DaliurenInput {
  date?: string
  clock?: string
  /** 昼贵 / 夜贵 */
  dayNight?: 'day' | 'night' | 'auto'
  question?: string
}

export interface KeItem {
  label: string
  upper: string
  lower: string
}

export interface DaliurenChart {
  question?: string
  pillars: string
  yueJiang: string
  shiZhi: string
  guiRen: string
  dayNight: string
  tianPan: string[]
  ke: KeItem[]
  sanChuan: { chu: string; zhong: string; mo: string; method: string }
  tianJiangOnChuan: string[]
  engine: string
}

function resolveYueJiang(lunarMonth: number): string {
  // 正月建寅 → 月将亥
  const idx = (Math.abs(lunarMonth) - 1 + 12) % 12
  return YUE_JIANG[idx]
}

function guiRenZhi(dayGan: string, night: boolean): string {
  // 甲戊庚牛羊；乙己鼠猴乡…
  const dayMap: Record<string, string> = {
    甲: '丑', 戊: '丑', 庚: '丑',
    乙: '子', 己: '子',
    丙: '亥', 丁: '亥',
    壬: '巳', 癸: '巳',
    辛: '午',
  }
  const nightMap: Record<string, string> = {
    甲: '未', 戊: '未', 庚: '未',
    乙: '申', 己: '申',
    丙: '酉', 丁: '酉',
    壬: '卯', 癸: '卯',
    辛: '寅',
  }
  return (night ? nightMap : dayMap)[dayGan] || '丑'
}

function buildTianPan(yueJiang: string, shiZhi: string): string[] {
  // 月将加于时支：时支位上为月将，顺布
  const start = zhiIndex(shiZhi)
  const jiangStart = zhiIndex(yueJiang)
  const pan: string[] = new Array(12)
  for (let i = 0; i < 12; i++) {
    const di = (start + i) % 12
    pan[di] = ZHI[(jiangStart + i) % 12]
  }
  return pan
}

function shangShen(tianPan: string[], diZhi: string): string {
  return tianPan[zhiIndex(diZhi)]
}

export function takeSanChuan(ke: KeItem[]): { chu: string; zhong: string; mo: string; method: string } {
  // 贼克：下克上为贼，上克下为克
  const zei: KeItem[] = []
  const keShang: KeItem[] = []
  for (const k of ke) {
    if (isKe(k.lower, k.upper)) zei.push(k)
    if (isKe(k.upper, k.lower)) keShang.push(k)
  }
  let chu: string
  let method: string
  if (zei.length === 1) {
    chu = zei[0].upper
    method = '贼克'
  } else if (zei.length > 1) {
    chu = zei[0].upper
    method = '比用（多贼取初）'
  } else if (keShang.length === 1) {
    chu = keShang[0].upper
    method = '克贼'
  } else if (keShang.length > 1) {
    chu = keShang[0].upper
    method = '涉害（简化取初）'
  } else {
    // 昴星简化：取日上神
    chu = ke[0].upper
    method = '昴星/别责（简化）'
  }
  // 中末：以初传为地盘，上神为中；再取末
  // 简化：中传 = 初传地支上神在天盘再寄；用四课第二、第三
  const zhong = ke[1]?.upper || addZhi(chu, 4)
  const mo = ke[2]?.upper || addZhi(chu, 8)
  return { chu, zhong, mo, method }
}

export function buildDaliurenChart(input: DaliurenInput): DaliurenChart {
  const date = input.date || new Date().toISOString().slice(0, 10)
  const [y, m, d] = date.split('-').map(Number)
  const [hh] = (input.clock || '12:00').split(':').map(Number)
  const solar = Solar.fromYmdHms(y, m, d, hh || 12, 0, 0)
  const lunar = solar.getLunar()
  const dayGz = lunar.getDayInGanZhi()
  const timeGz = lunar.getTimeInGanZhi()
  const pillars = [
    lunar.getYearInGanZhi(),
    lunar.getMonthInGanZhi(),
    dayGz,
    timeGz,
  ].join(' ')

  const yueJiang = resolveYueJiang(lunar.getMonth())
  const shiZhi = timeGz[1]
  const night =
    input.dayNight === 'night'
      ? true
      : input.dayNight === 'day'
        ? false
        : (hh || 12) < 6 || (hh || 12) >= 18
  const guiRen = guiRenZhi(dayGz[0], night)
  const tianPan = buildTianPan(yueJiang, shiZhi)

  const dayZhi = JI_GONG[dayGz[0]] || dayGz[1]
  const ganYang = shangShen(tianPan, dayZhi)
  const ganYin = shangShen(tianPan, ganYang)
  const zhiYang = shangShen(tianPan, dayGz[1])
  const zhiYin = shangShen(tianPan, zhiYang)

  const ke: KeItem[] = [
    { label: '一课（干阳）', upper: ganYang, lower: dayZhi },
    { label: '二课（干阴）', upper: ganYin, lower: ganYang },
    { label: '三课（支阳）', upper: zhiYang, lower: dayGz[1] },
    { label: '四课（支阴）', upper: zhiYin, lower: zhiYang },
  ]

  const sanChuan = takeSanChuan(ke)
  // 天将：贵人加于贵人位，顺/逆布（昼顺夜逆简化为昼顺）
  const grIdx = zhiIndex(guiRen)
  const tianJiangOnChuan = [sanChuan.chu, sanChuan.zhong, sanChuan.mo].map((z) => {
    const d = (zhiIndex(z) - grIdx + 12) % 12
    return TIAN_JIANG[d]
  })

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    pillars,
    yueJiang,
    shiZhi,
    guiRen,
    dayNight: night ? '夜贵' : '昼贵',
    tianPan: [...tianPan],
    ke,
    sanChuan,
    tianJiangOnChuan,
    engine: 'lingjing-daliuren@1',
  }
}

export function formatDaliurenForPrompt(chart: DaliurenChart): string {
  return [
    '## 大六壬课式（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 四柱：${chart.pillars}`,
    `- 月将：${chart.yueJiang} · 时支：${chart.shiZhi} · ${chart.dayNight}贵人：${chart.guiRen}`,
    ...chart.ke.map((k) => `- ${k.label}：上${k.upper} 下${k.lower}`),
    `- 三传：初${chart.sanChuan.chu} 中${chart.sanChuan.zhong} 末${chart.sanChuan.mo}（${chart.sanChuan.method}）`,
    `- 三传天将：${chart.tianJiangOnChuan.join('、')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildDaliurenRuleReading(chart: DaliurenChart): string {
  return [
    formatDaliurenForPrompt(chart),
    '',
    '## 规则断语',
    `- 取法：${chart.sanChuan.method}；初传为事之发端，末传看归宿。`,
    `- 贵人${chart.guiRen}临${chart.dayNight}。`,
    '',
    '## 解读边界',
    '- 四课三传、月将贵人为算法输出；九宗门边缘课体为简化实现，重大事项请人工复核。',
  ].join('\n')
}

export function collectDaliurenAllowedTerms(chart: DaliurenChart): Set<string> {
  const s = new Set<string>([
    chart.yueJiang,
    chart.shiZhi,
    chart.guiRen,
    chart.sanChuan.chu,
    chart.sanChuan.zhong,
    chart.sanChuan.mo,
    chart.sanChuan.method,
    ...chart.tianJiangOnChuan,
    ...TIAN_JIANG,
  ])
  chart.ke.forEach((k) => {
    s.add(k.upper)
    s.add(k.lower)
  })
  return s
}

export function auditDaliurenIntegrity(chart: DaliurenChart) {
  const ok = chart.ke.length === 4 && !!chart.sanChuan.chu
  return {
    status: ok ? 'ok' : 'fail',
    summary: ok ? '大六壬四课三传结构完整' : '课式结构异常',
  }
}
