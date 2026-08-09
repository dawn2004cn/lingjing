/**
 * 金口诀 — 四位起课（人元·贵神·将神·地分）自研实现
 * 完整古法可旁证 services/py-engine → kinjinkou（MIT）
 */

import { Solar } from 'lunar-javascript'

const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const GAN = '甲乙丙丁戊己庚辛壬癸'

const YUE_JIANG_BY_JIEQI: Record<string, string> = {
  雨水: '亥', 惊蛰: '亥', 春分: '戌', 清明: '戌',
  谷雨: '酉', 立夏: '酉', 小满: '申', 芒种: '申',
  夏至: '未', 小暑: '未', 大暑: '午', 立秋: '午',
  处暑: '巳', 白露: '巳', 秋分: '辰', 寒露: '辰',
  霜降: '卯', 立冬: '卯', 小雪: '寅', 大雪: '寅',
  冬至: '丑', 小寒: '丑', 大寒: '子', 立春: '子',
}

const YUE_JIANG_FALLBACK = ['亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌']

const TIAN_JIANG = [
  '贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙',
  '天空', '白虎', '太常', '玄武', '太阴', '天后',
]

const WX_ZHI: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

const WX_GAN: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

/** 天将简义（金口贵神） */
const JIANG_MEANING: Record<string, string> = {
  贵人: '贵人提携、文书印信、正当途径',
  螣蛇: '虚惊怪异、反复纠缠、心神不宁',
  朱雀: '口舌文书、信息往来、争辩是非',
  六合: '和合交易、媒约合作、私下成事',
  勾陈: '田土牵连、迟滞纠缠、牢狱羁绊',
  青龙: '喜庆财帛、酒食婚姻、阳谋进取',
  天空: '虚假不实、空亡无着、僧道玄门',
  白虎: '血光伤灾、官非孝服、刚猛冲突',
  太常: '衣食宴会、寻常稳定、医药酒食',
  玄武: '盗贼欺诈、暗昧阴谋、走失遗失',
  太阴: '阴私隐蔽、女子相关、阴谋筹划',
  天后: '阴人恩泽、舟车雨泽、柔顺庇护',
}

function siWeiJudgment(chart: {
  guiShen: { name: string; zhi: string; wx: string }
  jiangShen: { zhi: string; wx: string }
  diFen: { zhi: string; wx: string }
  renYuan: { gan: string; wx: string }
  xunKong: string
}): { lines: string[]; summary: string } {
  const bodyYong = wxRelation(chart.jiangShen.wx, chart.diFen.wx)
  const guiMeaning = JIANG_MEANING[chart.guiShen.name] || '人事机括'
  const lines = [
    `贵神【${chart.guiShen.name}】：${guiMeaning}`,
    `将神(${chart.jiangShen.wx})对地分(${chart.diFen.wx})为用对体：${bodyYong}`,
    `人元${chart.renYuan.gan}(${chart.renYuan.wx})看天时动机；与地分关系为${wxRelation(chart.renYuan.wx, chart.diFen.wx)}`,
  ]
  const kongHit: string[] = []
  if (chart.xunKong.includes(chart.diFen.zhi)) kongHit.push('地分')
  if (chart.xunKong.includes(chart.jiangShen.zhi)) kongHit.push('将神')
  if (chart.xunKong.includes(chart.guiShen.zhi)) kongHit.push('贵神位')
  if (kongHit.length) lines.push(`旬空临${kongHit.join('、')}，事易落空或暂缓`)

  let summary = '四位平稳，循序推进。'
  if (bodyYong === '克') summary = '用克体，事主动进取，宜把握主动权。'
  else if (bodyYong === '被克') summary = '用被体克，阻力在己或环境，宜缓图。'
  else if (bodyYong === '生') summary = '用生体，得外力助，事较易成。'
  else if (bodyYong === '被生') summary = '体生用，耗力求成，防付出过当。'
  if (kongHit.length) summary += ` 兼看空亡（${kongHit.join('、')}）。`
  return { lines, summary }
}

/** 日干 → 子上起遁干 */
const DUN_START: Record<string, string> = {
  甲: '甲', 己: '甲',
  乙: '丙', 庚: '丙',
  丙: '戊', 辛: '戊',
  丁: '庚', 壬: '庚',
  戊: '壬', 癸: '壬',
}

function zhiIndex(z: string) {
  return ZHI.indexOf(z)
}

function guiRenZhi(dayGan: string, night: boolean): string {
  const dayMap: Record<string, string> = {
    甲: '丑', 戊: '丑', 庚: '丑', 乙: '子', 己: '子',
    丙: '亥', 丁: '亥', 壬: '巳', 癸: '巳', 辛: '午',
  }
  const nightMap: Record<string, string> = {
    甲: '未', 戊: '未', 庚: '未', 乙: '申', 己: '申',
    丙: '酉', 丁: '酉', 壬: '卯', 癸: '卯', 辛: '寅',
  }
  return (night ? nightMap : dayMap)[dayGan] || '丑'
}

function buildTianPan(yueJiang: string, shiZhi: string): string[] {
  const start = zhiIndex(shiZhi)
  const jiangStart = zhiIndex(yueJiang)
  const pan: string[] = new Array(12)
  for (let i = 0; i < 12; i++) {
    pan[(start + i) % 12] = ZHI[(jiangStart + i) % 12]
  }
  return pan
}

function dunGanOnZhi(dayGan: string, zhi: string): string {
  const startGan = DUN_START[dayGan] || '甲'
  const gi = GAN.indexOf(startGan)
  const zi = zhiIndex(zhi)
  return GAN[(gi + zi) % 10]
}

function wxRelation(a: string, b: string) {
  if (a === b) return '比和'
  if (SHENG[a] === b) return '生'
  if (SHENG[b] === a) return '被生'
  if (KE[a] === b) return '克'
  if (KE[b] === a) return '被克'
  return '—'
}

export interface JinkouInput {
  date?: string
  clock?: string
  /** 地分：子…亥；缺省用时支 */
  difen?: string
  dayNight?: 'day' | 'night' | 'auto'
  question?: string
}

export interface JinkouChart {
  question?: string
  pillars: string
  jieQi: string
  yueJiang: string
  shiZhi: string
  difen: string
  dayNight: string
  guiRen: string
  /** 四位 */
  renYuan: { gan: string; wx: string }
  guiShen: { name: string; zhi: string; wx: string }
  jiangShen: { zhi: string; wx: string }
  diFen: { zhi: string; wx: string }
  relations: string[]
  /** 四位细断 */
  judgment: { lines: string[]; summary: string }
  xunKong: string
  engine: string
}

export function buildJinkouChart(input: JinkouInput): JinkouChart {
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
  const yueJiang =
    YUE_JIANG_BY_JIEQI[jieQi] ||
    YUE_JIANG_FALLBACK[(Math.abs(lunar.getMonth()) - 1 + 12) % 12]
  const shiZhi = timeGz[1]
  const difen =
    typeof input.difen === 'string' && ZHI.includes(input.difen) ? input.difen : shiZhi

  const night =
    input.dayNight === 'night'
      ? true
      : input.dayNight === 'day'
        ? false
        : (hh || 12) < 6 || (hh || 12) >= 18
  const guiRen = guiRenZhi(dayGz[0], night)
  const tianPan = buildTianPan(yueJiang, shiZhi)
  const jiangZhi = tianPan[zhiIndex(difen)]
  const grIdx = zhiIndex(guiRen)
  const guiShenName = TIAN_JIANG[
    night ? (grIdx - zhiIndex(difen) + 12) % 12 : (zhiIndex(difen) - grIdx + 12) % 12
  ]
  const renGan = dunGanOnZhi(dayGz[0], difen)

  const renYuan = { gan: renGan, wx: WX_GAN[renGan] }
  const guiShen = { name: guiShenName, zhi: difen, wx: WX_ZHI[difen] }
  const jiangShen = { zhi: jiangZhi, wx: WX_ZHI[jiangZhi] }
  const diFen = { zhi: difen, wx: WX_ZHI[difen] }

  const relations = [
    `人元(${renYuan.wx})对贵神(${guiShen.wx})：${wxRelation(renYuan.wx, guiShen.wx)}`,
    `贵神(${guiShen.wx})对将神(${jiangShen.wx})：${wxRelation(guiShen.wx, jiangShen.wx)}`,
    `将神(${jiangShen.wx})对地分(${diFen.wx})：${wxRelation(jiangShen.wx, diFen.wx)}`,
    `人元(${renYuan.wx})对地分(${diFen.wx})：${wxRelation(renYuan.wx, diFen.wx)}`,
  ]

  const gi = GAN.indexOf(dayGz[0])
  const zi = ZHI.indexOf(dayGz[1])
  const xunStart = ((zi - gi) % 12 + 12) % 12
  const xunKong = `${ZHI[(xunStart + 10) % 12]}${ZHI[(xunStart + 11) % 12]}`
  const judgment = siWeiJudgment({ renYuan, guiShen, jiangShen, diFen, xunKong })

  return {
    question: typeof input.question === 'string' ? input.question : undefined,
    pillars,
    jieQi,
    yueJiang,
    shiZhi,
    difen,
    dayNight: night ? '夜贵' : '昼贵',
    guiRen,
    renYuan,
    guiShen,
    jiangShen,
    diFen,
    relations,
    judgment,
    xunKong,
    engine: 'lingjing-jinkou@2',
  }
}

export function formatJinkouForPrompt(chart: JinkouChart): string {
  return [
    '## 金口诀四位（算法事实）',
    chart.question ? `- 问事：${chart.question}` : null,
    `- 引擎：${chart.engine}`,
    `- 四柱：${chart.pillars}`,
    `- 节气：${chart.jieQi || '—'} · 月将：${chart.yueJiang} · 时支：${chart.shiZhi}`,
    `- 地分：${chart.difen} · ${chart.dayNight}贵人：${chart.guiRen} · 旬空：${chart.xunKong}`,
    `- 人元：${chart.renYuan.gan}（${chart.renYuan.wx}）`,
    `- 贵神：${chart.guiShen.name}临${chart.guiShen.zhi}（${chart.guiShen.wx}）`,
    `- 将神：${chart.jiangShen.zhi}（${chart.jiangShen.wx}）`,
    `- 地分：${chart.diFen.zhi}（${chart.diFen.wx}）`,
    ...chart.relations.map((r) => `- ${r}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildJinkouRuleReading(chart: JinkouChart): string {
  return [
    formatJinkouForPrompt(chart),
    '',
    '## 四位细断',
    ...chart.judgment.lines.map((l) => `- ${l}`),
    '',
    '## 规则断语',
    `- ${chart.judgment.summary}`,
    `- 以将神为用、地分为体；贵神看人事，人元看天时/动机。`,
    `- 空亡 ${chart.xunKong}。`,
    '',
    '## 解读边界',
    '- 四位干支神将与细断为算法输出；完整流派断法可对接 py-engine/kinjinkou。',
    '- 金口诀为六壬简式，重大事项请人工复核。',
  ].join('\n')
}

export function collectJinkouAllowedTerms(chart: JinkouChart): Set<string> {
  return new Set([
    chart.difen,
    chart.yueJiang,
    chart.guiRen,
    chart.renYuan.gan,
    chart.guiShen.name,
    chart.jiangShen.zhi,
    chart.xunKong,
    ...TIAN_JIANG,
    '人元',
    '贵神',
    '将神',
    '地分',
    chart.judgment.summary,
  ])
}
