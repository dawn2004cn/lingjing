/**
 * 节气边界探测：换年（立春）/ 换月（十二节）精确时刻前后的柱位对照
 */

import { Solar } from 'lunar-javascript'
import { buildBaziChart, type BaziFormInput, type BaziChart } from '@/lib/bazi/engine'
import { parseClockString } from '@/lib/astro/boundary'
import { clockToTimeIndex, formatTimeIndexLabel } from '@/lib/astro/time-index'

/** 十二节（换月）：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒 */
export const MONTH_CHANGE_JIEQI = new Set([
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
])

export interface JieQiMoment {
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  iso: string
  changesYear: boolean
  changesMonth: boolean
}

export interface JieQiBoundaryProbe {
  nearBoundary: boolean
  minutesToJieQi: number
  toward: 'prev' | 'next'
  jieQi: JieQiMoment | null
  message: string
  /** 交界前一刻四柱（分钟精度） */
  pillarsBefore: string | null
  /** 交界后一刻四柱 */
  pillarsAfter: string | null
  yearPillarChanged: boolean
  monthPillarChanged: boolean
  /** 当前排盘所用四柱 */
  pillarsCurrent: string | null
  /** 若近交界且当前柱与另一侧不同，提示对照 */
  dualRecommended: boolean
}

function toMoment(name: string, solar: { getYear: () => number; getMonth: () => number; getDay: () => number; getHour: () => number; getMinute: () => number; getSecond: () => number; toYmdHms: () => string }): JieQiMoment {
  return {
    name,
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
    second: solar.getSecond(),
    iso: solar.toYmdHms(),
    changesYear: name === '立春',
    changesMonth: MONTH_CHANGE_JIEQI.has(name),
  }
}

function absMinutesBetween(
  a: { year: number; month: number; day: number; hour: number; minute: number },
  b: { year: number; month: number; day: number; hour: number; minute: number },
): number {
  const ta = Date.UTC(a.year, a.month - 1, a.day, a.hour, a.minute) / 60000
  const tb = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute) / 60000
  return Math.abs(ta - tb)
}

function snapPillars(chart: BaziChart): string {
  const p = chart.pillars
  return [p.year.ganZhi, p.month.ganZhi, p.day.ganZhi, p.time.ganZhi].join(' ')
}

function chartAtClock(
  base: Pick<BaziFormInput, 'gender' | 'name'>,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): BaziChart {
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const birthClock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const timeIndex = clockToTimeIndex(hour, minute)
  return buildBaziChart({
    ...base,
    gender: base.gender || '男',
    calendarType: '公历',
    birthDate,
    birthHour: formatTimeIndexLabel(timeIndex),
    birthClock,
  })
}

function addClockMinutes(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  delta: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const dt = new Date(year, month - 1, day, hour, minute, 0)
  dt.setMinutes(dt.getMinutes() + delta)
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
    hour: dt.getHours(),
    minute: dt.getMinutes(),
  }
}

/** 取出生时刻附近的上一个/下一个节气（精确到秒的 Solar） */
export function findAdjacentJieQi(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): { prev: JieQiMoment | null; next: JieQiMoment | null } {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar()
  const prevJq = lunar.getPrevJieQi(false)
  const nextJq = lunar.getNextJieQi(false)
  const prevSolar = prevJq?.getSolar?.()
  const nextSolar = nextJq?.getSolar?.()
  return {
    prev: prevSolar && prevJq ? toMoment(prevJq.getName(), prevSolar) : null,
    next: nextSolar && nextJq ? toMoment(nextJq.getName(), nextSolar) : null,
  }
}

/**
 * @param thresholdMin 距换月/换年节气多少分钟内视为敏感，默认 90
 */
export function probeJieQiBoundary(
  input: BaziFormInput,
  resolvedSolar: { year: number; month: number; day: number; hour: number; minute: number },
  thresholdMin = 90,
): JieQiBoundaryProbe {
  const { year, month, day, hour, minute } = resolvedSolar
  const { prev, next } = findAdjacentJieQi(year, month, day, hour, minute)

  const candidates: { jq: JieQiMoment; toward: 'prev' | 'next'; dist: number }[] = []
  if (prev && (prev.changesMonth || prev.changesYear)) {
    candidates.push({
      jq: prev,
      toward: 'prev',
      dist: absMinutesBetween(resolvedSolar, prev),
    })
  }
  if (next && (next.changesMonth || next.changesYear)) {
    candidates.push({
      jq: next,
      toward: 'next',
      dist: absMinutesBetween(resolvedSolar, next),
    })
  }

  // 若邻近的气（非节）也要报告距离，但 dual 只对换月节有意义
  if (!candidates.length && (prev || next)) {
    const fallback = [prev && { jq: prev, toward: 'prev' as const }, next && { jq: next, toward: 'next' as const }]
      .filter(Boolean)
      .map((x) => ({
        jq: x!.jq,
        toward: x!.toward,
        dist: absMinutesBetween(resolvedSolar, x!.jq),
      }))
      .sort((a, b) => a.dist - b.dist)
    const nearest = fallback[0]
    return {
      nearBoundary: false,
      minutesToJieQi: nearest?.dist ?? 99999,
      toward: nearest?.toward ?? 'next',
      jieQi: nearest?.jq ?? null,
      message: nearest
        ? `距节气「${nearest.jq.name}」约 ${nearest.dist} 分钟（非换月节点或未达敏感阈值）。`
        : '未找到邻近节气。',
      pillarsBefore: null,
      pillarsAfter: null,
      yearPillarChanged: false,
      monthPillarChanged: false,
      pillarsCurrent: null,
      dualRecommended: false,
    }
  }

  candidates.sort((a, b) => a.dist - b.dist)
  const best = candidates[0]
  if (!best) {
    return {
      nearBoundary: false,
      minutesToJieQi: 99999,
      toward: 'next',
      jieQi: null,
      message: '未找到邻近换月/换年节气。',
      pillarsBefore: null,
      pillarsAfter: null,
      yearPillarChanged: false,
      monthPillarChanged: false,
      pillarsCurrent: null,
      dualRecommended: false,
    }
  }

  const nearBoundary = best.dist <= thresholdMin && (best.jq.changesMonth || best.jq.changesYear)
  const beforeClock = addClockMinutes(best.jq.year, best.jq.month, best.jq.day, best.jq.hour, best.jq.minute, -1)
  const afterClock = addClockMinutes(best.jq.year, best.jq.month, best.jq.day, best.jq.hour, best.jq.minute, 1)

  let pillarsBefore: string | null = null
  let pillarsAfter: string | null = null
  let pillarsCurrent: string | null = null
  let yearPillarChanged = false
  let monthPillarChanged = false

  if (nearBoundary || best.jq.changesYear) {
    try {
      const beforeChart = chartAtClock(input, beforeClock.year, beforeClock.month, beforeClock.day, beforeClock.hour, beforeClock.minute)
      const afterChart = chartAtClock(input, afterClock.year, afterClock.month, afterClock.day, afterClock.hour, afterClock.minute)
      const currentChart = chartAtClock(input, year, month, day, hour, minute)
      pillarsBefore = snapPillars(beforeChart)
      pillarsAfter = snapPillars(afterChart)
      pillarsCurrent = snapPillars(currentChart)
      yearPillarChanged = beforeChart.pillars.year.ganZhi !== afterChart.pillars.year.ganZhi
      monthPillarChanged = beforeChart.pillars.month.ganZhi !== afterChart.pillars.month.ganZhi
    } catch {
      // ignore chart errors at edge dates
    }
  }

  const kind = best.jq.changesYear ? '换年（立春）' : best.jq.changesMonth ? '换月' : '节气'
  const message = nearBoundary
    ? `距${kind}节气「${best.jq.name}」约 ${best.dist} 分钟（精确 ${best.jq.iso}）。年柱${yearPillarChanged ? '会变' : '不变'}，月柱${monthPillarChanged ? '会变' : '不变'}。建议对照交界前后四柱，勿只采一侧。`
    : `距最近换月/换年节气「${best.jq.name}」约 ${best.dist} 分钟（${best.jq.iso}），暂不在敏感区。`

  return {
    nearBoundary,
    minutesToJieQi: best.dist,
    toward: best.toward,
    jieQi: best.jq,
    message,
    pillarsBefore,
    pillarsAfter,
    yearPillarChanged,
    monthPillarChanged,
    pillarsCurrent,
    dualRecommended: !!(nearBoundary && pillarsBefore && pillarsAfter && pillarsBefore !== pillarsAfter),
  }
}

export function formatJieQiForPrompt(probe: JieQiBoundaryProbe): string {
  if (!probe.jieQi) return ''
  if (!probe.nearBoundary && !probe.dualRecommended) return ''
  const lines = [
    '## 节气交界对照（算法事实）',
    probe.message,
    `- 节气：${probe.jieQi.name} @ ${probe.jieQi.iso}`,
  ]
  if (probe.pillarsBefore && probe.pillarsAfter) {
    lines.push(`- 交界前一刻：${probe.pillarsBefore}`)
    lines.push(`- 交界后一刻：${probe.pillarsAfter}`)
    if (probe.pillarsCurrent) lines.push(`- 当前排盘：${probe.pillarsCurrent}`)
  }
  lines.push('- 润色时须提示：节气交界处以精确时刻为准，日期标签「立春日」不等于整日已换年柱。')
  return lines.join('\n')
}

/** 从 BaziChart.solar 探测（需精确钟点才有意义） */
export function probeJieQiFromChart(chart: BaziChart, input: BaziFormInput, thresholdMin = 90): JieQiBoundaryProbe | null {
  const clock = parseClockString(input.birthClock)
  // 无精确钟点时，用已解析 solar 的 hour/minute（时辰中点）仍可提示距离，但标注精度有限
  const resolved = {
    year: chart.solar.year,
    month: chart.solar.month,
    day: chart.solar.day,
    hour: chart.solar.hour,
    minute: chart.solar.minute,
  }
  const probe = probeJieQiBoundary(input, resolved, thresholdMin)
  if (!clock) {
    return {
      ...probe,
      message: `${probe.message}（未填精确钟点，距离按时辰代表点估算，敏感结论请补 HH:MM。）`,
      dualRecommended: false,
      nearBoundary: false,
    }
  }
  return probe
}
