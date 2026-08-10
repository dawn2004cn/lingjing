/**
 * 八字喜用神简判 + 调候简判（规则层，非完整定论）
 * 扶抑：日主五行强弱；调候：月令寒暖燥湿取用。
 */

export type WuXing = '金' | '木' | '水' | '火' | '土'

const GAN_WX: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const ZHI_WX: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

/** 生我、我生、克我、我克 */
const SHENG_WO: Record<WuXing, WuXing> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
const WO_SHENG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE_WO: Record<WuXing, WuXing> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }
const WO_KE: Record<WuXing, WuXing> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }

/** 月支大致得令五行 */
const YUE_LING: Record<string, WuXing> = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
}

/** 月令调候（通行简表） */
const TIAOHOU_TABLE: Record<
  string,
  { season: string; need: WuXing[]; avoid: WuXing[]; tip: string }
> = {
  寅: { season: '孟春', need: ['火', '水'], avoid: ['金'], tip: '余寒未尽，宜火解冻、水疏木' },
  卯: { season: '仲春', need: ['水', '金'], avoid: ['火'], tip: '木旺，宜水润金修，防火燥木' },
  辰: { season: '季春', need: ['水', '木'], avoid: ['土'], tip: '土气渐旺，宜水木疏通' },
  巳: { season: '孟夏', need: ['水'], avoid: ['火'], tip: '火气渐盛，调候优先用水润局' },
  午: { season: '仲夏', need: ['水', '金'], avoid: ['火'], tip: '炎热，水为调候要神，金次之' },
  未: { season: '季夏', need: ['水', '金'], avoid: ['火', '土'], tip: '湿热交蒸，宜水金清润' },
  申: { season: '孟秋', need: ['水', '火'], avoid: ['金'], tip: '金寒水冷将至，宜水润火暖' },
  酉: { season: '仲秋', need: ['火', '水'], avoid: ['金'], tip: '金旺气肃，宜火暖水润' },
  戌: { season: '季秋', need: ['火', '水'], avoid: ['土'], tip: '土燥金冷，宜火水调剂' },
  亥: { season: '孟冬', need: ['火'], avoid: ['水'], tip: '水冷金寒，调候优先用火' },
  子: { season: '仲冬', need: ['火'], avoid: ['水'], tip: '严冬，火为调候要神' },
  丑: { season: '季冬', need: ['火', '金'], avoid: ['水', '土'], tip: '寒湿土旺，宜火暖金泄' },
}

export interface TiaoHouResult {
  monthZhi: string
  season: string
  need: WuXing[]
  avoid: WuXing[]
  tip: string
  /** 与扶抑喜用是否冲突（调候要神落在扶抑忌神中） */
  conflictWithFuyi: boolean
  note: string
}

export interface YongShenResult {
  dayMaster: string
  dayElement: WuXing
  strength: '强' | '偏强' | '中和' | '偏弱' | '弱'
  score: number
  xiYong: WuXing[]
  jiShen: WuXing[]
  note: string
  tiaoHou: TiaoHouResult
}

export function judgeTiaoHou(
  monthZhi: string,
  fuyiJiShen: WuXing[] = [],
): TiaoHouResult {
  const row = TIAOHOU_TABLE[monthZhi] || {
    season: '未知',
    need: [] as WuXing[],
    avoid: [] as WuXing[],
    tip: '月令未识别，调候从略',
  }
  const conflictWithFuyi = row.need.some((n) => fuyiJiShen.includes(n))
  const note = conflictWithFuyi
    ? `调候喜 ${row.need.join('、') || '—'}，与扶抑忌神有交叠，取用宜权衡（调候与扶抑不可机械叠加）。`
    : `调候喜 ${row.need.join('、') || '—'}，忌过 ${row.avoid.join('、') || '—'}。`
  return {
    monthZhi,
    season: row.season,
    need: row.need,
    avoid: row.avoid,
    tip: row.tip,
    conflictWithFuyi,
    note,
  }
}

export function judgeYongShen(input: {
  dayGan: string
  monthZhi: string
  wuXing: Record<string, number>
}): YongShenResult {
  const dayElement = GAN_WX[input.dayGan] || '木'
  const counts = input.wuXing
  const same = counts[dayElement] || 0
  const support = counts[SHENG_WO[dayElement]] || 0
  const drain = counts[WO_SHENG[dayElement]] || 0
  const wealth = counts[WO_KE[dayElement]] || 0
  const officer = counts[KE_WO[dayElement]] || 0

  let score = same * 2 + support * 1.5 - drain - wealth * 0.8 - officer
  const ling = YUE_LING[input.monthZhi]
  if (ling === dayElement) score += 2
  else if (ling === SHENG_WO[dayElement]) score += 1
  else if (ling === KE_WO[dayElement]) score -= 1.5

  let strength: YongShenResult['strength']
  if (score >= 4) strength = '强'
  else if (score >= 2) strength = '偏强'
  else if (score >= -1) strength = '中和'
  else if (score >= -3) strength = '偏弱'
  else strength = '弱'

  let xiYong: WuXing[]
  let jiShen: WuXing[]
  if (strength === '强' || strength === '偏强') {
    xiYong = [WO_SHENG[dayElement], WO_KE[dayElement], KE_WO[dayElement]]
    jiShen = [dayElement, SHENG_WO[dayElement]]
  } else if (strength === '弱' || strength === '偏弱') {
    xiYong = [dayElement, SHENG_WO[dayElement]]
    jiShen = [KE_WO[dayElement], WO_KE[dayElement], WO_SHENG[dayElement]]
  } else {
    xiYong = [SHENG_WO[dayElement], WO_SHENG[dayElement]]
    jiShen = [KE_WO[dayElement]]
  }

  xiYong = [...new Set(xiYong)]
  jiShen = [...new Set(jiShen)].filter((x) => !xiYong.includes(x))

  const note =
    strength === '强' || strength === '偏强'
      ? `日主${input.dayGan}（${dayElement}）${strength}，宜食伤泄秀、财官制约，忌再补身。`
      : strength === '弱' || strength === '偏弱'
        ? `日主${input.dayGan}（${dayElement}）${strength}，宜印比扶身，忌再泄耗克伐。`
        : `日主${input.dayGan}（${dayElement}）大致中和，喜流通有情，忌一边倒。`

  const tiaoHou = judgeTiaoHou(input.monthZhi, jiShen)

  return {
    dayMaster: input.dayGan,
    dayElement,
    strength,
    score: Math.round(score * 10) / 10,
    xiYong,
    jiShen,
    note,
    tiaoHou,
  }
}

export function ganZhiToWuXing(gan: string, zhi: string): { gan: WuXing | ''; zhi: WuXing | '' } {
  return { gan: GAN_WX[gan] || '', zhi: ZHI_WX[zhi] || '' }
}
