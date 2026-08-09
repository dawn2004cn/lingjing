/**
 * 八字喜用神简判（规则层，非完整调候/格局论）
 * 依据：日主五行强弱（同类+生我 vs 克我+我生+我克）与月令粗判。
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

export interface YongShenResult {
  dayMaster: string
  dayElement: WuXing
  strength: '强' | '偏强' | '中和' | '偏弱' | '弱'
  score: number
  xiYong: WuXing[]
  jiShen: WuXing[]
  note: string
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
    // 宜泄耗克
    xiYong = [WO_SHENG[dayElement], WO_KE[dayElement], KE_WO[dayElement]]
    jiShen = [dayElement, SHENG_WO[dayElement]]
  } else if (strength === '弱' || strength === '偏弱') {
    xiYong = [dayElement, SHENG_WO[dayElement]]
    jiShen = [KE_WO[dayElement], WO_KE[dayElement], WO_SHENG[dayElement]]
  } else {
    xiYong = [SHENG_WO[dayElement], WO_SHENG[dayElement]]
    jiShen = [KE_WO[dayElement]]
  }

  // 去重保序
  xiYong = [...new Set(xiYong)]
  jiShen = [...new Set(jiShen)].filter((x) => !xiYong.includes(x))

  const note =
    strength === '强' || strength === '偏强'
      ? `日主${input.dayGan}（${dayElement}）${strength}，宜食伤泄秀、财官制约，忌再补身。`
      : strength === '弱' || strength === '偏弱'
        ? `日主${input.dayGan}（${dayElement}）${strength}，宜印比扶身，忌再泄耗克伐。`
        : `日主${input.dayGan}（${dayElement}）大致中和，喜流通有情，忌一边倒。`

  return {
    dayMaster: input.dayGan,
    dayElement,
    strength,
    score: Math.round(score * 10) / 10,
    xiYong,
    jiShen,
    note,
  }
}

export function ganZhiToWuXing(gan: string, zhi: string): { gan: WuXing | ''; zhi: WuXing | '' } {
  return { gan: GAN_WX[gan] || '', zhi: ZHI_WX[zhi] || '' }
}
