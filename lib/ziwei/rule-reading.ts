/**
 * 紫微规则解读层：只陈述盘面事实，供 LLM 润色或直接展示
 */

import { BRANCHES, STEMS } from './constants'
import type { Pattern } from './patterns'
import type { ZiweiChart } from './types'
import { buildOverlay, formatOverlaySummary, natalYearStemName, formatLaiYinLine, type ZiweiSchool } from './overlay'

function majorsOf(chart: ZiweiChart, palaceName: string): string {
  const p = chart.palaces.find((x) => x.name === palaceName)
  if (!p) return '无'
  const majors = p.stars.filter((s) => s.type === 'major')
  if (!majors.length) {
    if (p.borrowedStars?.length) {
      return `空宫，借对宫${p.borrowedFromName}：${p.borrowedStars.join('、')}`
    }
    return '空宫'
  }
  return majors
    .map((s) => `${s.name}${s.siHua ? `化${s.siHua}` : ''}${s.brightness === 'bright' ? '庙' : s.brightness === 'dim' ? '陷' : ''}`)
    .join('、')
}

export function buildZiweiRuleReading(
  chart: ZiweiChart,
  patterns: Pattern[],
  opts?: { year?: number; school?: ZiweiSchool },
): string {
  const g = chart.birthInfo.gender === 'male' ? '乾造' : '坤造'
  const year = opts?.year ?? new Date().getFullYear()
  const school: ZiweiSchool = opts?.school === 'feixing' ? 'feixing' : 'ni'
  const overlay = buildOverlay(chart, year, { school })
  const lines: string[] = []

  lines.push('## 命盘总览（规则事实）')
  lines.push(
    `- ${chart.birthInfo.name || '未提供'}（${g}）· ${chart.wuxingJuName} · 命宫${BRANCHES[chart.mingGongBranch]} · 身宫${BRANCHES[chart.shenGongBranch]}`,
  )
  lines.push(
    `- 公历 ${chart.birthInfo.year}-${chart.birthInfo.month}-${chart.birthInfo.day} · 农历 ${chart.lunarInfo.lunarYear}年${chart.lunarInfo.isLeapMonth ? '闰' : ''}${chart.lunarInfo.lunarMonth}月${chart.lunarInfo.lunarDay}日`,
  )
  lines.push(`- 流派口径：${school === 'feixing' ? '飞星（大限宫干四化/自化可启用）' : '倪师（大限看宫位，不另飞大限四化）'}`)
  lines.push(`- 命宫主星：${majorsOf(chart, '命宫')}`)
  lines.push(`- 身宫所在：${chart.palaces.find((p) => p.isShenGong)?.name || '—'}`)

  lines.push('')
  lines.push('## 六宫要点')
  for (const name of ['命宫', '福德', '官禄', '财帛', '夫妻', '疾厄']) {
    lines.push(`- **${name}**：${majorsOf(chart, name)}`)
  }

  if (patterns.length) {
    lines.push('')
    lines.push('## 已判定格局')
    for (const p of patterns.slice(0, 10)) {
      const level =
        p.level === 'excellent' ? '上' : p.level === 'good' ? '佳' : p.level === 'caution' ? '慎' : '平'
      lines.push(`- 【${level}】${p.name}：${p.description}`)
    }
  }

  lines.push('')
  lines.push('## 当前运限')
  lines.push(`- ${formatOverlaySummary(overlay)}`)
  if (overlay.daXianName) {
    if (school === 'feixing' && overlay.daXianSiHua) {
      const d = overlay.daXianSiHua.transforms
      lines.push(`- 大限宫主星：${majorsOf(chart, overlay.daXianName)}`)
      lines.push(
        `- 大限四化（宫干${overlay.daXianSiHua.stemName}）：禄${d.禄} 权${d.权} 科${d.科} 忌${d.忌}`,
      )
      if (overlay.selfSihuaPalaceCount != null) {
        lines.push(`- 本命盘自化宫位数：${overlay.selfSihuaPalaceCount}`)
      }
      if (overlay.selfSihua?.length) {
        const brief = overlay.selfSihua
          .slice(0, 6)
          .map((p) => `${p.palaceName}(${p.items.map((i) => `自化${i.siHua}${i.starName}`).join('、')})`)
          .join('；')
        lines.push(`- 自化明细：${brief}`)
      }
      if (overlay.laiYin?.length) {
        lines.push(
          `- 本命年干${natalYearStemName(chart)}四化来因宫：${formatLaiYinLine(overlay.laiYin)}`,
        )
        const ji = overlay.laiYin.find((x) => x.siHua === '忌')
        if (ji) {
          lines.push(
            `- 化忌来因宫（重点）：${ji.starName}化忌 ← ${ji.from.length ? ji.from.join('、') : '未命中'}`,
          )
        }
      }
    } else {
      lines.push(
        `- 大限宫主星：${majorsOf(chart, overlay.daXianName)}（只论宫位星曜，不另飞大限四化）`,
      )
    }
  }

  lines.push('')
  lines.push('## 解读边界')
  lines.push('- 以上星位、格局、运限均为算法输出，润色时不得改动或新增星曜。')
  lines.push(
    school === 'feixing'
      ? '- 飞星口径已输出大限宫干四化、自化与本命四化来因宫；复杂飞化链仍建议人工复核。'
      : '- 默认倪师口径：不使用宫干自化、大限四化作主断；可传 ziweiSchool=feixing 切换。',
  )
  lines.push('- 语气宜克制正向，不作恐吓式断言。')

  return lines.join('\n')
}

/** 从命盘提取可引用的词汇，用于粗检幻觉 */
export function collectZiweiAllowedTerms(chart: ZiweiChart, patterns: Pattern[]): Set<string> {
  const terms = new Set<string>()
  chart.palaces.forEach((p) => {
    terms.add(p.name)
    terms.add(BRANCHES[p.branch])
    terms.add(STEMS[p.stem])
    p.stars.forEach((s) => terms.add(s.name))
  })
  patterns.forEach((p) => terms.add(p.name))
  ;['禄', '权', '科', '忌', '庙', '旺', '陷'].forEach((x) => terms.add(x))
  return terms
}
