/**
 * 从生辰输入计算可入库的精度触发标志（与排盘/提示口径一致）
 */

import { parseClockString, probeTimeBoundary } from '@/lib/astro/boundary'
import { buildBaziChart, type BaziFormInput } from '@/lib/bazi/engine'
import { probeJieQiFromChart } from '@/lib/astro/jieqi-boundary'
import { parseTimeIndexFromHourLabel, timeIndexToClock } from '@/lib/astro/time-index'
import { crossCheckBaziInput, type CrossStatus, type CrossEngineReport } from '@/lib/astro/cross-engine'

export interface PrecisionFlags {
  /** 距时辰交界 ≤20 分钟 */
  boundaryHour: boolean
  /** 距换月/换年节气 ≤90 分钟 */
  boundaryJieqi: boolean
  /** 开启真太阳时且校正后跨时辰或跨日 */
  trueSolarShift: boolean
  /** 跨引擎交叉状态 */
  crossStatus: CrossStatus
  /** 可选：完整交叉报告（复算用） */
  crossReport?: CrossEngineReport
}

export function birthInputFromRecord(r: {
  gender?: string
  calendar_type?: string
  calendarType?: string
  birth_date?: string
  birthDate?: string
  birth_hour?: string
  birthHour?: string
  birth_clock?: string | null
  birthClock?: string | null
  is_leap_month?: number | boolean
  isLeapMonth?: boolean
  use_true_solar?: number | boolean
  useTrueSolar?: boolean
  province?: string | null
  city?: string | null
  day_sect?: number
  daySect?: number
}): Parameters<typeof computePrecisionFlags>[0] {
  return {
    gender: r.gender,
    calendarType: r.calendarType || r.calendar_type,
    birthDate: r.birthDate || r.birth_date || '',
    birthHour: r.birthHour || r.birth_hour,
    birthClock: r.birthClock ?? r.birth_clock,
    isLeapMonth: !!(r.isLeapMonth ?? r.is_leap_month),
    useTrueSolar: !!(r.useTrueSolar ?? r.use_true_solar),
    province: r.province,
    city: r.city,
    daySect: Number(r.daySect ?? r.day_sect) === 1 ? 1 : 2,
  }
}

export function computePrecisionFlags(input: {
  gender?: string
  calendarType?: string
  birthDate: string
  birthHour?: string
  birthClock?: string | null
  isLeapMonth?: boolean
  useTrueSolar?: boolean
  province?: string | null
  city?: string | null
  daySect?: number
  /** 为 true 时附带完整交叉报告 */
  withReport?: boolean
}): PrecisionFlags {
  let boundaryHour = false
  let boundaryJieqi = false
  let trueSolarShift = false
  let crossStatus: CrossStatus = 'skipped'
  let crossReport: CrossEngineReport | undefined

  const clock = parseClockString(input.birthClock || '')
  let hour: number | undefined
  let minute: number | undefined
  if (clock) {
    hour = clock.hour
    minute = clock.minute
  } else if (input.birthHour) {
    const idx = parseTimeIndexFromHourLabel(input.birthHour, false)
    const c = timeIndexToClock(idx)
    hour = c.hour
    minute = c.minute
  }

  if (hour != null && minute != null) {
    boundaryHour = probeTimeBoundary(hour, minute, 20).nearBoundary
  }

  try {
    const birth: BaziFormInput = {
      gender: input.gender || '男',
      calendarType: input.calendarType || '公历',
      birthDate: input.birthDate,
      birthHour: input.birthHour || '子时',
      birthClock: input.birthClock || undefined,
      isLeapMonth: !!input.isLeapMonth,
      useTrueSolar: !!input.useTrueSolar,
      province: input.province || undefined,
      city: input.city || undefined,
      daySect: Number(input.daySect) === 1 ? 1 : 2,
    }
    const chart = buildBaziChart(birth)
    const jq = probeJieQiFromChart(chart, birth, 90)
    boundaryJieqi = !!jq?.nearBoundary
    if (chart.trueSolar) {
      trueSolarShift = !!(chart.trueSolar.changedTimeIndex || chart.trueSolar.changedDate)
    }
    const report = crossCheckBaziInput(birth)
    crossStatus = report.status
    if (input.withReport) crossReport = report
  } catch {
    // 历法解析失败时不记节气边界 / 交叉
  }

  return { boundaryHour, boundaryJieqi, trueSolarShift, crossStatus, crossReport }
}
