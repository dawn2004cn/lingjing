/**
 * 子平格局简判（规则事实层，非完整定格）
 */

import type { BaziChart } from './engine'

export interface ZipingPattern {
  name: string
  level: '正格' | '特殊' | '提示'
  description: string
}

const GAN_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const ZHI_WX: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function monthOrderWx(zhi: string): string {
  return ZHI_WX[zhi] || '土'
}

/** 日主与月令关系粗分正格倾向 */
export function detectZipingPatterns(chart: BaziChart): ZipingPattern[] {
  const out: ZipingPattern[] = []
  const dm = chart.dayMaster
  const dmWx = GAN_WX[dm]
  const monthZhi = chart.pillars.month.zhi
  const monthWx = monthOrderWx(monthZhi)
  const yong = chart.yongShen

  if (!dmWx) return out

  // 月令旺衰提示
  if (monthWx === dmWx) {
    out.push({
      name: '月令同党',
      level: '正格',
      description: `日主${dm}（${dmWx}）与月支${monthZhi}（${monthWx}）同气，身旺倾向，宜泄耗克。`,
    })
  } else if (SHENG[monthWx] === dmWx) {
    out.push({
      name: '月令生身',
      level: '正格',
      description: `月支${monthZhi}生助日主，印星得令倾向。`,
    })
  } else if (SHENG[dmWx] === monthWx) {
    out.push({
      name: '月令泄身',
      level: '正格',
      description: `月支${monthZhi}为日主所生，食伤得令倾向。`,
    })
  } else if (KE[dmWx] === monthWx) {
    out.push({
      name: '月令受克',
      level: '正格',
      description: `日主克月令（财星得令倾向）。`,
    })
  } else if (KE[monthWx] === dmWx) {
    out.push({
      name: '月令克身',
      level: '正格',
      description: `月支克日主，官杀得令倾向。`,
    })
  }

  // 从格粗检：日主极弱且同党极少
  const same = (chart.wuXing[dmWx] || 0)
  const total = Object.values(chart.wuXing).reduce((a, b) => a + b, 0) || 1
  if (yong?.strength === '偏弱' && same / total < 0.15) {
    out.push({
      name: '从势倾向（简判）',
      level: '特殊',
      description: '同党占比极低且日主偏弱，存在从格讨论空间；须结合月令透干与制化，本简判不作定论。',
    })
  }

  // 化气粗检：天干五合
  const gans = [
    chart.pillars.year.gan,
    chart.pillars.month.gan,
    chart.pillars.day.gan,
    chart.pillars.time.gan,
  ]
  const HE: [string, string, string][] = [
    ['甲', '己', '土'],
    ['乙', '庚', '金'],
    ['丙', '辛', '水'],
    ['丁', '壬', '木'],
    ['戊', '癸', '火'],
  ]
  for (const [a, b, to] of HE) {
    if (gans.includes(a) && gans.includes(b)) {
      out.push({
        name: `${a}${b}合化倾向`,
        level: '提示',
        description: `盘中见${a}${b}合，古典有化${to}之说；是否真化须看月令与争合，此处仅标记合象。`,
      })
    }
  }

  if (yong) {
    out.push({
      name: '喜用简判',
      level: '提示',
      description: `喜用倾向：${yong.xiYong.join('、') || '—'}；忌神倾向：${yong.jiShen.join('、') || '—'}。`,
    })
    if (yong.tiaoHou) {
      out.push({
        name: '调候简判',
        level: '提示',
        description: `${yong.tiaoHou.season}（月支${yong.tiaoHou.monthZhi}）：${yong.tiaoHou.tip}。${yong.tiaoHou.note}`,
      })
    }
  }

  if (!out.length) {
    out.push({
      name: '普通正格（待细推）',
      level: '正格',
      description: '未触发特殊标记，按月令用神与喜忌常规推演。',
    })
  }

  return out
}

export function formatZipingForPrompt(patterns: ZipingPattern[]): string {
  const lines = ['## 子平格局简判（算法事实）']
  for (const p of patterns) {
    lines.push(`- 【${p.level}】${p.name}：${p.description}`)
  }
  lines.push('- 以上为规则简判，润色时不得改写格局名称与干支依据。')
  return lines.join('\n')
}
