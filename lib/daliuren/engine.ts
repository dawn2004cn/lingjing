/**
 * 大六壬 — 月将加时、四课、三传（九宗门简化实现）
 */

import { Solar } from 'lunar-javascript'

const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const GAN = '甲乙丙丁戊己庚辛壬癸'

/** 月将：按节气（中气）定将 */
const JIEQI_YUE_JIANG: Record<string, string> = {
  雨水: '亥', 惊蛰: '亥',
  春分: '戌', 清明: '戌',
  谷雨: '酉', 立夏: '酉',
  小满: '申', 芒种: '申',
  夏至: '未', 小暑: '未',
  大暑: '午', 立秋: '午',
  处暑: '巳', 白露: '巳',
  秋分: '辰', 寒露: '辰',
  霜降: '卯', 立冬: '卯',
  小雪: '寅', 大雪: '寅',
  冬至: '丑', 小寒: '丑',
  大寒: '子', 立春: '子',
}

/** 月将：节气月兜底（寅月亥将） */
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
  jieQi: string
  yueJiang: string
  shiZhi: string
  guiRen: string
  dayNight: string
  xunKong: string
  tianPan: string[]
  diPan: string[]
  tianJiangPan: string[]
  ke: KeItem[]
  sanChuan: { chu: string; zhong: string; mo: string; method: string }
  tianJiangOnChuan: string[]
  engine: string
}

function resolveYueJiang(lunarMonth: number, jieQiName?: string): string {
  if (jieQiName && JIEQI_YUE_JIANG[jieQiName]) return JIEQI_YUE_JIANG[jieQiName]
  const idx = (Math.abs(lunarMonth) - 1 + 12) % 12
  return YUE_JIANG[idx]
}

function xunKong(dayGanZhi: string): string {
  const gi = GAN.indexOf(dayGanZhi[0])
  const zi = ZHI.indexOf(dayGanZhi[1])
  if (gi < 0 || zi < 0) return '—'
  const xunStart = ((zi - gi) % 12 + 12) % 12
  return `${ZHI[(xunStart + 10) % 12]}${ZHI[(xunStart + 11) % 12]}`
}

/** 涉害深度：从上神落宫沿地盘逆/顺数至本家（五行同位）的步数 */
function sheHaiDepth(upper: string, lower: string): number {
  const start = zhiIndex(lower)
  const targetWx = WX_ZHI[upper]
  let best = 12
  for (let step = 0; step < 12; step++) {
    const z = ZHI[(start + step) % 12]
    if (WX_ZHI[z] === targetWx || z === upper) {
      best = Math.min(best, step + 1)
      break
    }
  }
  return best === 12 ? 1 : best
}

function mengZhongJi(z: string): '孟' | '仲' | '季' {
  if ('寅申巳亥'.includes(z)) return '孟'
  if ('子午卯酉'.includes(z)) return '仲'
  return '季'
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

export function takeSanChuan(
  ke: KeItem[],
  tianPan?: string[],
  dayGan?: string,
): { chu: string; zhong: string; mo: string; method: string } {
  const zei: KeItem[] = []
  const keShang: KeItem[] = []
  for (const k of ke) {
    if (isKe(k.lower, k.upper)) zei.push(k)
    if (isKe(k.upper, k.lower)) keShang.push(k)
  }

  const allFu = ke.every((k) => k.upper === k.lower)
  const chong = (a: string, b: string) => (zhiIndex(a) + 6) % 12 === zhiIndex(b)
  const allFan = ke.every((k) => chong(k.upper, k.lower))

  const pickBySheHai = (cands: KeItem[], label: string) => {
    let best = cands[0]
    let bestDepth = -1
    for (const c of cands) {
      const d = sheHaiDepth(c.upper, c.lower)
      if (d > bestDepth) {
        bestDepth = d
        best = c
      } else if (d === bestDepth) {
        // 同深度：孟 > 仲 > 季；再比日干阴阳
        const rank = { 孟: 3, 仲: 2, 季: 1 }
        if (rank[mengZhongJi(c.lower)] > rank[mengZhongJi(best.lower)]) best = c
      }
    }
    return { chu: best.upper, method: `${label}（涉害${bestDepth}重）` }
  }

  let chu: string
  let method: string

  if (allFu) {
    chu = ke[0].upper
    method = '伏吟'
  } else if (allFan) {
    chu = ke[0].upper
    method = '返吟'
  } else if (zei.length === 1) {
    chu = zei[0].upper
    method = '贼克'
  } else if (zei.length > 1) {
    // 比用：与日干比和者优先，否则涉害
    const yangGan = '甲丙戊庚壬'.includes(dayGan || '')
    const bi = zei.filter((c) => {
      const yangZhi = '子寅辰午申戌'.includes(c.upper)
      return yangGan === yangZhi
    })
    if (bi.length === 1) {
      chu = bi[0].upper
      method = '比用'
    } else {
      const picked = pickBySheHai(bi.length ? bi : zei, '比用→涉害')
      chu = picked.chu
      method = picked.method
    }
  } else if (keShang.length === 1) {
    chu = keShang[0].upper
    method = '克贼'
  } else if (keShang.length > 1) {
    const picked = pickBySheHai(keShang, '涉害')
    chu = picked.chu
    method = picked.method
  } else {
    const yao =
      (isKe(ke[0].upper, ke[2].upper) && ke[0]) ||
      (isKe(ke[2].upper, ke[0].upper) && ke[2]) ||
      null
    if (yao) {
      chu = yao.upper
      method = '遥克'
    } else if (ke[0].upper === ke[1].upper && ke[0].upper === ke[2].upper) {
      chu = ke[0].upper
      method = '八专/别责（简化）'
    } else {
      chu = ke[0].upper
      method = '昴星（简化取日上）'
    }
  }

  let zhong: string
  let mo: string
  if (tianPan && tianPan.length === 12) {
    zhong = shangShen(tianPan, chu)
    mo = shangShen(tianPan, zhong)
  } else {
    zhong = ke[1]?.upper || addZhi(chu, 4)
    mo = ke[2]?.upper || addZhi(chu, 8)
  }
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

  const jq = lunar.getPrevJieQi(true)
  const jieQi = jq?.getName?.() || ''
  const yueJiang = resolveYueJiang(lunar.getMonth(), jieQi)
  const shiZhi = timeGz[1]
  const night =
    input.dayNight === 'night'
      ? true
      : input.dayNight === 'day'
        ? false
        : (hh || 12) < 6 || (hh || 12) >= 18
  const guiRen = guiRenZhi(dayGz[0], night)
  const tianPan = buildTianPan(yueJiang, shiZhi)
  const diPan = [...ZHI]
  const kong = xunKong(dayGz)

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

  const sanChuan = takeSanChuan(ke, tianPan, dayGz[0])
  const grIdx = zhiIndex(guiRen)
  const tianJiangPan = diPan.map((z) => {
    const d = night
      ? (grIdx - zhiIndex(z) + 12) % 12
      : (zhiIndex(z) - grIdx + 12) % 12
    return TIAN_JIANG[d]
  })
  const tianJiangOnChuan = [sanChuan.chu, sanChuan.zhong, sanChuan.mo].map(
    (z) => tianJiangPan[zhiIndex(z)],
  )

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    pillars,
    jieQi,
    yueJiang,
    shiZhi,
    guiRen,
    dayNight: night ? '夜贵' : '昼贵',
    xunKong: kong,
    tianPan: [...tianPan],
    diPan,
    tianJiangPan,
    ke,
    sanChuan,
    tianJiangOnChuan,
    engine: 'lingjing-daliuren@2',
  }
}

export function formatDaliurenForPrompt(chart: DaliurenChart): string {
  const jiangRow = chart.diPan
    .map((d, i) => `${d}:${chart.tianPan[i]}/${chart.tianJiangPan[i]}`)
    .join(' ')
  return [
    '## 大六壬课式（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 四柱：${chart.pillars}`,
    `- 节气：${chart.jieQi || '—'} · 月将：${chart.yueJiang} · 时支：${chart.shiZhi}`,
    `- ${chart.dayNight}贵人：${chart.guiRen} · 旬空：${chart.xunKong}`,
    `- 天地将盘：${jiangRow}`,
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
    `- 贵人${chart.guiRen}临${chart.dayNight}；空亡看 ${chart.xunKong}。`,
    '',
    '## 解读边界',
    '- 四课三传、月将贵人、天将盘为算法输出；别责八专边缘课体仍可能简化，重大事项请人工复核。',
  ].join('\n')
}

export function collectDaliurenAllowedTerms(chart: DaliurenChart): Set<string> {
  const s = new Set<string>([
    chart.yueJiang,
    chart.shiZhi,
    chart.guiRen,
    chart.jieQi,
    chart.xunKong,
    chart.sanChuan.chu,
    chart.sanChuan.zhong,
    chart.sanChuan.mo,
    chart.sanChuan.method,
    ...chart.tianJiangOnChuan,
    ...chart.tianJiangPan,
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
