/**
 * 紫微盘面完整性 + 历法自洽旁证
 * （尚无第二安星引擎时，先做可证伪的结构/历法校验）
 */

import type { ZiweiChart } from '@/lib/ziwei/types'
import { BRANCHES } from '@/lib/ziwei/constants'
import { Lunar, Solar } from 'lunar-javascript'

const FOURTEEN_MAJORS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
]

export type ZiweiIntegrityStatus = 'ok' | 'warn' | 'fail'

export interface ZiweiIntegrityReport {
  status: ZiweiIntegrityStatus
  summary: string
  majorCount: number
  missingMajors: string[]
  duplicateMajors: string[]
  mingConsistent: boolean
  calendarAligned: boolean | null
  notes: string[]
}

export function auditZiweiChartIntegrity(
  chart: ZiweiChart,
  opts?: {
    /** 表单解析后的公历日（校正前或后，与 chart.birthInfo 对照） */
    expectSolar?: { year: number; month: number; day: number }
  },
): ZiweiIntegrityReport {
  const notes: string[] = []
  const counts = new Map<string, number>()
  for (const p of chart.palaces || []) {
    for (const s of p.stars || []) {
      if (s.type !== 'major') continue
      counts.set(s.name, (counts.get(s.name) || 0) + 1)
    }
  }

  const missingMajors = FOURTEEN_MAJORS.filter((n) => !counts.has(n))
  const duplicateMajors = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n)
  const majorCount = [...counts.values()].reduce((a, b) => a + b, 0)

  const mingPalace = (chart.palaces || []).find((p) => p.isMingGong)
  const mingConsistent =
    !!mingPalace &&
    mingPalace.branch === chart.mingGongBranch &&
    BRANCHES[chart.mingGongBranch] != null

  if (!mingConsistent) notes.push('命宫标记与 mingGongBranch 不一致')
  if (missingMajors.length) notes.push(`缺主星：${missingMajors.join('、')}`)
  if (duplicateMajors.length) notes.push(`主星重复：${duplicateMajors.join('、')}`)
  if (majorCount !== 14) notes.push(`主星出现次数合计 ${majorCount}（期望 14）`)

  let calendarAligned: boolean | null = null
  if (opts?.expectSolar && chart.birthInfo) {
    const a = opts.expectSolar
    const b = chart.birthInfo
    calendarAligned = a.year === b.year && a.month === b.month && a.day === b.day
    if (!calendarAligned) {
      notes.push(
        `历法日不一致：期望 ${a.year}-${a.month}-${a.day} / 盘面 ${b.year}-${b.month}-${b.day}`,
      )
    } else {
      // 与 lunar-javascript 公历→农历往返自洽
      try {
        const solar = Solar.fromYmd(b.year, b.month, b.day)
        const lunar = solar.getLunar()
        const back = Lunar.fromYmd(
          lunar.getYear(),
          lunar.getMonth(),
          lunar.getDay(),
        ).getSolar()
        if (back.getYear() !== b.year || back.getMonth() !== b.month || back.getDay() !== b.day) {
          calendarAligned = false
          notes.push('公历↔农历往返不一致')
        }
      } catch (e: any) {
        notes.push(`农历往返校验失败：${e?.message || e}`)
      }
    }
  }

  let status: ZiweiIntegrityStatus = 'ok'
  if (missingMajors.length || duplicateMajors.length || !mingConsistent || majorCount !== 14) {
    status = 'fail'
  } else if (calendarAligned === false) {
    status = 'warn'
  }

  const summary =
    status === 'ok'
      ? '紫微盘面完整性通过（十四主星齐全、命宫自洽）'
      : status === 'warn'
        ? '紫微盘面结构通过，历法对照有告警'
        : '紫微盘面完整性未通过，请人工复核'

  return {
    status,
    summary,
    majorCount,
    missingMajors,
    duplicateMajors,
    mingConsistent,
    calendarAligned,
    notes,
  }
}

export function formatZiweiIntegrityForPrompt(report: ZiweiIntegrityReport): string {
  const lines = [
    '## 紫微盘面完整性（算法事实）',
    `- 状态：${report.status}`,
    `- ${report.summary}`,
    `- 十四主星计数：${report.majorCount}`,
  ]
  for (const n of report.notes.slice(0, 6)) lines.push(`- ${n}`)
  if (report.status === 'fail') {
    lines.push('- 警告：盘面结构异常，解读须标注待复核，不得假装确定。')
  }
  return lines.join('\n')
}
