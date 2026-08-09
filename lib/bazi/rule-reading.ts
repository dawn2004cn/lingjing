/**
 * 八字规则解读层
 */

import type { BaziChart } from './engine'
import type { YongShenResult } from './yongshen'

export function buildBaziRuleReading(chart: BaziChart): string {
  const g = chart.gender === 'male' ? '乾造' : '坤造'
  const p = chart.pillars
  const y = chart.yongShen
  const lines: string[] = []

  lines.push('## 八字确认（规则事实）')
  lines.push(`- ${chart.name || '未提供'}（${g}）`)
  lines.push(
    `- 公历 ${chart.solar.year}-${chart.solar.month}-${chart.solar.day} ${String(chart.solar.hour).padStart(2, '0')}:${String(chart.solar.minute).padStart(2, '0')}`,
  )
  lines.push(`- 农历 ${chart.lunar}`)
  lines.push(
    `- 四柱：${p.year.ganZhi} · ${p.month.ganZhi} · ${p.day.ganZhi} · ${p.time.ganZhi}`,
  )
  lines.push(`- 日主：${chart.dayMaster}`)

  lines.push('')
  lines.push('## 柱位明细')
  lines.push('| 柱 | 干支 | 十神 | 藏干 | 纳音 |')
  lines.push('|---|---|---|---|---|')
  for (const [label, col] of [
    ['年', p.year],
    ['月', p.month],
    ['日', p.day],
    ['时', p.time],
  ] as const) {
    lines.push(
      `| ${label} | ${col.ganZhi} | ${col.shiShenGan || '—'} | ${col.hideGan.join('') || '—'} | ${col.naYin} |`,
    )
  }

  lines.push('')
  lines.push('## 五行与喜用')
  lines.push(
    `- 五行：金${chart.wuXing['金']} 木${chart.wuXing['木']} 水${chart.wuXing['水']} 火${chart.wuXing['火']} 土${chart.wuXing['土']}`,
  )
  if (y) {
    lines.push(`- 日主强弱简判：${y.strength}（分 ${y.score}）`)
    lines.push(`- 喜用：${y.xiYong.join('、')}；忌神倾向：${y.jiShen.join('、') || '—'}`)
    lines.push(`- ${y.note}`)
  }

  if (chart.daYun?.length) {
    lines.push('')
    lines.push('## 大运')
    if (chart.yunStart) {
      lines.push(
        `- 起运：出生后约 ${chart.yunStart.years}年${chart.yunStart.months}月${chart.yunStart.days}日`,
      )
    }
    const currentYear = new Date().getFullYear()
    for (const d of chart.daYun.slice(0, 8)) {
      if (!d.ganZhi) continue
      const mark =
        currentYear >= d.startYear && currentYear < d.startYear + 10 ? ' ← 当前' : ''
      lines.push(`- ${d.startAge}岁起（${d.startYear}）· ${d.ganZhi}${mark}`)
    }
  }

  lines.push('')
  lines.push('## 解读边界')
  lines.push('- 四柱、藏干、纳音、大运均为算法输出，润色时不得改动干支。')
  lines.push('- 喜用神为简判规则，非完整调候/格局定论，表述宜留有余地。')
  if (chart.daySect) {
    lines.push(`- ${chart.daySect.note}`)
  }

  return lines.join('\n')
}

export function collectBaziAllowedTerms(chart: BaziChart): Set<string> {
  const terms = new Set<string>()
  Object.values(chart.pillars).forEach((p) => {
    terms.add(p.ganZhi)
    terms.add(p.gan)
    terms.add(p.zhi)
    terms.add(p.naYin)
    p.hideGan.forEach((h) => terms.add(h))
    if (p.shiShenGan) terms.add(p.shiShenGan)
  })
  ;['金', '木', '水', '火', '土'].forEach((x) => terms.add(x))
  chart.daYun?.forEach((d) => {
    if (d.ganZhi) terms.add(d.ganZhi)
  })
  const y: YongShenResult | undefined = chart.yongShen
  y?.xiYong.forEach((x) => terms.add(x))
  y?.jiShen.forEach((x) => terms.add(x))
  return terms
}
