/**
 * 边界双盘：同一生辰排出当前时辰与邻近时辰两盘，并摘要差异
 */

import { buildChartWithPatterns, type FormBirthInput } from '@/lib/ziwei'
import { buildBaziChart, type BaziFormInput } from '@/lib/bazi/engine'
import { formatTimeIndexLabel, timeIndexToClock } from '@/lib/astro/time-index'
import { parseClockString, probeTimeBoundary, type BoundaryProbe } from '@/lib/astro/boundary'
import { TIME_INDEX_LABELS } from '@/lib/astro/time-index'

function clockLabel(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function inputWithTimeIndex(base: FormBirthInput, timeIndex: number): FormBirthInput {
  const clock = timeIndexToClock(timeIndex)
  const label = TIME_INDEX_LABELS.find((x) => x.index === timeIndex)
  return {
    ...base,
    birthHour: label ? `${label.name} ${label.range}` : base.birthHour,
    birthClock: clockLabel(clock.hour, clock.minute),
  }
}

export interface DualZiweiDiff {
  mingGongChanged: boolean
  wuxingJuChanged: boolean
  mingMajorsA: string
  mingMajorsB: string
  mingGongA: number
  mingGongB: number
  wuxingJuA: string
  wuxingJuB: string
}

export interface DualBoundaryResult {
  probe: BoundaryProbe
  applicable: boolean
  ziwei?: {
    current: ReturnType<typeof buildChartWithPatterns>
    alternate: ReturnType<typeof buildChartWithPatterns>
    diff: DualZiweiDiff
  }
  bazi?: {
    current: ReturnType<typeof buildBaziChart>
    alternate: ReturnType<typeof buildBaziChart>
    pillarsChanged: boolean
    snapA: string
    snapB: string
  }
}

function majorsAtMing(chart: ReturnType<typeof buildChartWithPatterns>['chart']) {
  const p = chart.palaces.find((x) => x.isMingGong)
  return (
    p?.stars
      .filter((s) => s.type === 'major')
      .map((s) => s.name)
      .join('、') || '空'
  )
}

export function buildDualBoundary(
  input: FormBirthInput & BaziFormInput,
  system: 'ziwei' | 'bazi',
  thresholdMin = 20,
): DualBoundaryResult | null {
  const clock = parseClockString(input.birthClock)
  if (!clock) return null

  const probe = probeTimeBoundary(clock.hour, clock.minute, thresholdMin)
  if (!probe.nearBoundary) {
    return { probe, applicable: false }
  }

  if (system === 'ziwei') {
    const current = buildChartWithPatterns(inputWithTimeIndex(input, probe.currentIndex))
    const alternate = buildChartWithPatterns(inputWithTimeIndex(input, probe.alternateIndex))
    const diff: DualZiweiDiff = {
      mingGongChanged: current.chart.mingGongBranch !== alternate.chart.mingGongBranch,
      wuxingJuChanged: current.chart.wuxingJuName !== alternate.chart.wuxingJuName,
      mingMajorsA: majorsAtMing(current.chart),
      mingMajorsB: majorsAtMing(alternate.chart),
      mingGongA: current.chart.mingGongBranch,
      mingGongB: alternate.chart.mingGongBranch,
      wuxingJuA: current.chart.wuxingJuName,
      wuxingJuB: alternate.chart.wuxingJuName,
    }
    return { probe, applicable: true, ziwei: { current, alternate, diff } }
  }

  const curIn = inputWithTimeIndex(input, probe.currentIndex)
  const altIn = inputWithTimeIndex(input, probe.alternateIndex)
  const current = buildBaziChart(curIn)
  const alternate = buildBaziChart(altIn)
  const snap = (c: typeof current) =>
    [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, c.pillars.time.ganZhi].join(' ')
  const snapA = snap(current)
  const snapB = snap(alternate)
  return {
    probe,
    applicable: true,
    bazi: {
      current,
      alternate,
      pillarsChanged: snapA !== snapB,
      snapA,
      snapB,
    },
  }
}

export function formatDualForPrompt(dual: DualBoundaryResult): string {
  if (!dual.applicable) return ''
  const lines = [
    '## 边界时辰双盘对照（算法事实）',
    dual.probe.message,
    `- 当前：${dual.probe.currentLabel}`,
    `- 邻近：${dual.probe.alternateLabel}`,
  ]
  if (dual.ziwei) {
    const d = dual.ziwei.diff
    lines.push(
      `- 命宫是否变化：${d.mingGongChanged ? '是' : '否'}`,
      `- 五行局是否变化：${d.wuxingJuChanged ? '是' : '否'}`,
      `- 当前命宫主星：${d.mingMajorsA}`,
      `- 邻近命宫主星：${d.mingMajorsB}`,
    )
  }
  if (dual.bazi) {
    lines.push(
      `- 四柱是否变化：${dual.bazi.pillarsChanged ? '是' : '否'}`,
      `- 当前四柱：${dual.bazi.snapA}`,
      `- 邻近四柱：${dual.bazi.snapB}`,
    )
  }
  lines.push('- 解读须提示用户：交界处宜谨慎，可对照两盘，勿武断取一。')
  return lines.join('\n')
}
