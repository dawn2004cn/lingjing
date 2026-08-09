/**
 * 奇门遁甲 — 时家拆补法自研实现（可与外部库旁证）
 */

import { Solar } from 'lunar-javascript'

const GONG_ORDER = [1, 8, 3, 4, 9, 2, 7, 6] as const // 洛书飞序（阳遁）
const GONG_NAMES: Record<number, string> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  5: '中',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
}

const DI_PAN_YANG = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙']
const EIGHT_DOORS = ['休', '生', '伤', '杜', '景', '死', '惊', '开']
const NINE_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']
const EIGHT_GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']

/** 节气 → 阴阳遁与局数起点（拆补简化表） */
const JIEQI_JU: Record<string, { yang: boolean; ju: number }> = {
  冬至: { yang: true, ju: 1 },
  小寒: { yang: true, ju: 2 },
  大寒: { yang: true, ju: 3 },
  立春: { yang: true, ju: 8 },
  雨水: { yang: true, ju: 9 },
  惊蛰: { yang: true, ju: 1 },
  春分: { yang: true, ju: 3 },
  清明: { yang: true, ju: 4 },
  谷雨: { yang: true, ju: 5 },
  立夏: { yang: true, ju: 4 },
  小满: { yang: true, ju: 5 },
  芒种: { yang: true, ju: 6 },
  夏至: { yang: false, ju: 9 },
  小暑: { yang: false, ju: 8 },
  大暑: { yang: false, ju: 7 },
  立秋: { yang: false, ju: 2 },
  处暑: { yang: false, ju: 1 },
  白露: { yang: false, ju: 9 },
  秋分: { yang: false, ju: 7 },
  寒露: { yang: false, ju: 6 },
  霜降: { yang: false, ju: 5 },
  立冬: { yang: false, ju: 6 },
  小雪: { yang: false, ju: 5 },
  大雪: { yang: false, ju: 4 },
}

function xunShou(dayGanZhi: string): string {
  const GAN = '甲乙丙丁戊己庚辛壬癸'
  const ZHI = '子丑寅卯辰巳午未申酉戌亥'
  const gan = dayGanZhi[0]
  const zhi = dayGanZhi[1]
  const gi = GAN.indexOf(gan)
  const zi = ZHI.indexOf(zhi)
  const diff = ((zi - gi) % 12 + 12) % 12
  const xunZhi = ZHI[diff]
  return `甲${xunZhi}`
}

export interface QimenInput {
  date?: string
  clock?: string
  /** 强制局数 1–9 */
  ju?: number
  yangDun?: boolean
  question?: string
}

export interface QimenPalace {
  gong: number
  name: string
  diGan: string
  tianGan: string
  door: string
  star: string
  god: string
}

export interface QimenChart {
  method: string
  question?: string
  pillars: string
  jieQi: string
  yangDun: boolean
  ju: number
  xunShou: string
  zhiFuGong: number
  palaces: QimenPalace[]
  engine: string
}

export function buildQimenChart(input: QimenInput): QimenChart {
  const date = input.date || new Date().toISOString().slice(0, 10)
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (input.clock || '12:00').split(':').map(Number)
  const solar = Solar.fromYmdHms(y, m, d, hh || 12, mm || 0, 0)
  const lunar = solar.getLunar()
  const pillars = [
    lunar.getYearInGanZhi(),
    lunar.getMonthInGanZhi(),
    lunar.getDayInGanZhi(),
    lunar.getTimeInGanZhi(),
  ].join(' ')

  const jq = lunar.getPrevJieQi(true)
  const jqName = jq?.getName?.() || '冬至'
  const base = JIEQI_JU[jqName] || { yang: true, ju: 1 }
  const yangDun = input.yangDun != null ? !!input.yangDun : base.yang
  // 三元：日干支旬简化为上中下元偏移
  const dayGz = lunar.getDayInGanZhi()
  const yuan = (dayGz.charCodeAt(0) + dayGz.charCodeAt(1)) % 3
  let ju = input.ju != null ? Number(input.ju) : ((base.ju - 1 + yuan) % 9) + 1
  if (ju < 1 || ju > 9) ju = 1

  const xs = xunShou(dayGz)
  // 值符落宫：阳遁从坎起局
  const zhiFuGong = yangDun ? ju : 10 - ju
  const diStart = yangDun ? ju - 1 : (9 - ju)
  const diGans: Record<number, string> = {}
  for (let i = 0; i < 9; i++) {
    const g = ((yangDun ? ju - 1 + i : ju - 1 - i) + 9) % 9 + 1
    diGans[g] = DI_PAN_YANG[i]
  }

  // 时干落宫找值使
  const timeGan = lunar.getTimeInGanZhi()[0]
  let shiGanGong = 1
  for (const [g, gan] of Object.entries(diGans)) {
    if (gan === timeGan || (timeGan === '甲' && gan === '戊')) {
      shiGanGong = Number(g)
      break
    }
  }

  const palaces: QimenPalace[] = []
  for (let g = 1; g <= 9; g++) {
    const offset = yangDun
      ? (g - zhiFuGong + 9) % 9
      : (zhiFuGong - g + 9) % 9
    const door = EIGHT_DOORS[offset % 8]
    const star = NINE_STARS[offset % 9]
    const god = EIGHT_GODS[offset % 8]
    const tianIdx = yangDun
      ? (diStart + offset) % 9
      : (diStart - offset + 9) % 9
    palaces.push({
      gong: g,
      name: GONG_NAMES[g],
      diGan: diGans[g] || '—',
      tianGan: DI_PAN_YANG[tianIdx] || '—',
      door: g === 5 ? '—' : door,
      star,
      god: g === 5 ? '—' : god,
    })
  }

  return {
    method: '时家拆补',
    question: typeof input.question === 'string' ? input.question : undefined,
    pillars,
    jieQi: jqName,
    yangDun,
    ju,
    xunShou: xs,
    zhiFuGong,
    palaces,
    engine: 'lingjing-qimen-chaibu@1',
  }
}

export function formatQimenForPrompt(chart: QimenChart): string {
  const rows = chart.palaces.map(
    (p) =>
      `| ${p.gong}${p.name} | ${p.diGan} | ${p.tianGan} | ${p.star} | ${p.door} | ${p.god} |`,
  )
  return [
    '## 奇门遁甲盘面（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine} · ${chart.method}`,
    `- 四柱：${chart.pillars}`,
    `- 节气：${chart.jieQi} · ${chart.yangDun ? '阳遁' : '阴遁'}${chart.ju}局`,
    `- 旬首：${chart.xunShou} · 值符宫：${chart.zhiFuGong}`,
    '',
    '| 宫 | 地盘 | 天盘 | 九星 | 八门 | 八神 |',
    '|---|---|---|---|---|---|',
    ...rows,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildQimenRuleReading(chart: QimenChart): string {
  const zf = chart.palaces.find((p) => p.gong === chart.zhiFuGong)
  return [
    formatQimenForPrompt(chart),
    '',
    '## 规则断语',
    `- 值符在${zf?.name || chart.zhiFuGong}宫，星${zf?.star || '—'}、门${zf?.door || '—'}。`,
    '- 用神随问事取宫：求财看生门，求官看开门，逃亡看杜门等。',
    '',
    '## 解读边界',
    '- 局数、阴阳遁、九宫神星门干为算法输出，润色不得改写。',
    '- 本引擎为拆补时家自研实现，重大决策请人工复核。',
  ].join('\n')
}

export function collectQimenAllowedTerms(chart: QimenChart): Set<string> {
  const s = new Set<string>([
    chart.jieQi,
    chart.xunShou,
    ...chart.pillars.split(' '),
    chart.yangDun ? '阳遁' : '阴遁',
  ])
  chart.palaces.forEach((p) => {
    s.add(p.name)
    s.add(p.diGan)
    s.add(p.tianGan)
    s.add(p.star)
    s.add(p.door)
    s.add(p.god)
  })
  return s
}

/** 结构完整性旁证 */
export function auditQimenIntegrity(chart: QimenChart) {
  const gongs = new Set(chart.palaces.map((p) => p.gong))
  const ok = gongs.size === 9 && chart.ju >= 1 && chart.ju <= 9
  return {
    status: ok ? 'ok' : 'fail',
    summary: ok ? '奇门九宫结构完整' : '奇门盘面结构异常',
    palaceCount: gongs.size,
    ju: chart.ju,
  }
}
