/**
 * 真太阳时校正（经度差 + 均时差）
 * 中国民用时默认东八区，标准经线 120°E。
 * 默认使用 Jean Meeus 天文均时差（true-solar-time）；失败时回退 Spencer 近似。
 * 仅当校正后跨越时辰/日期时才会改变排盘结果。
 */

import { getTrueSolarTimeDetail } from 'true-solar-time'
import { clockToTimeIndex, timeIndexToClock, formatTimeIndexLabel } from './time-index'
import { findCityLongitude } from '@/lib/ziwei/cities'

const CST_MERIDIAN = 120 // 东八区标准经线

export type EotMethod = 'meeus' | 'spencer'

export interface TrueSolarInput {
  year: number
  month: number
  day: number
  /** 民用钟点 */
  hour: number
  minute: number
  longitude: number
  /** 是否叠加均时差，默认 true */
  useEquationOfTime?: boolean
  /** 强制均时差算法；默认优先 meeus */
  eotMethod?: EotMethod
}

export interface TrueSolarResult {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  timeIndex: number
  longitudeCorrectionMin: number
  equationOfTimeMin: number
  totalCorrectionMin: number
  changedTimeIndex: boolean
  changedDate: boolean
  originalTimeIndex: number
  label: string
  /** 实际采用的均时差算法 */
  eotMethod: EotMethod
}

/** Spencer 近似均时差（分钟）— 回退用 */
export function approximateEquationOfTimeMinutes(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day))
  const start = Date.UTC(year, 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000)
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 1)
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(B) -
      0.032077 * Math.sin(B) -
      0.014615 * Math.cos(2 * B) -
      0.040849 * Math.sin(2 * B))
  )
}

function addMinutes(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  deltaMin: number,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const dt = new Date(y, m - 1, d, h, min, 0)
  const whole = Math.trunc(deltaMin)
  const fracSec = Math.round((deltaMin - whole) * 60)
  dt.setMinutes(dt.getMinutes() + whole)
  dt.setSeconds(dt.getSeconds() + fracSec)
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
    hour: dt.getHours(),
    minute: dt.getMinutes(),
    second: dt.getSeconds(),
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function buildResult(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  corrected: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  longitudeCorrectionMin: number,
  equationOfTimeMin: number,
  eotMethod: EotMethod,
): TrueSolarResult {
  const originalTimeIndex = clockToTimeIndex(hour, minute)
  const timeIndex = clockToTimeIndex(corrected.hour, corrected.minute)
  const totalCorrectionMin = longitudeCorrectionMin + equationOfTimeMin
  return {
    ...corrected,
    timeIndex,
    longitudeCorrectionMin: round1(longitudeCorrectionMin),
    equationOfTimeMin: round1(equationOfTimeMin),
    totalCorrectionMin: round1(totalCorrectionMin),
    changedTimeIndex: timeIndex !== originalTimeIndex,
    changedDate:
      corrected.year !== year || corrected.month !== month || corrected.day !== day,
    originalTimeIndex,
    label: formatTimeIndexLabel(timeIndex),
    eotMethod,
  }
}

function viaSpencer(
  input: TrueSolarInput,
  useEquationOfTime: boolean,
): TrueSolarResult {
  const { year, month, day, hour, minute, longitude } = input
  const longitudeCorrectionMin = (longitude - CST_MERIDIAN) * 4
  const equationOfTimeMin = useEquationOfTime
    ? approximateEquationOfTimeMinutes(year, month, day)
    : 0
  const corrected = addMinutes(year, month, day, hour, minute, longitudeCorrectionMin + equationOfTimeMin)
  return buildResult(
    year, month, day, hour, minute, corrected,
    longitudeCorrectionMin, equationOfTimeMin, 'spencer',
  )
}

function viaMeeus(input: TrueSolarInput, useEquationOfTime: boolean): TrueSolarResult | null {
  try {
    const { year, month, day, hour, minute, longitude } = input
    const civil = new Date(year, month - 1, day, hour, minute, 0)
    const detail = getTrueSolarTimeDetail(civil, longitude, { standardLongitude: CST_MERIDIAN })
    const lng = detail.lngOffset
    const eot = useEquationOfTime ? detail.eot : 0
    const t = detail.date
    // 若关闭均时差，只用经度修正重算
    if (!useEquationOfTime) {
      const corrected = addMinutes(year, month, day, hour, minute, lng)
      return buildResult(year, month, day, hour, minute, corrected, lng, 0, 'meeus')
    }
    const corrected = {
      year: t.getFullYear(),
      month: t.getMonth() + 1,
      day: t.getDate(),
      hour: t.getHours(),
      minute: t.getMinutes(),
      second: t.getSeconds(),
    }
    return buildResult(year, month, day, hour, minute, corrected, lng, eot, 'meeus')
  } catch {
    return null
  }
}

export function correctTrueSolarTime(input: TrueSolarInput): TrueSolarResult {
  const useEquationOfTime = input.useEquationOfTime !== false
  const prefer = input.eotMethod || 'meeus'

  if (prefer === 'spencer') {
    return viaSpencer(input, useEquationOfTime)
  }

  return viaMeeus(input, useEquationOfTime) || viaSpencer(input, useEquationOfTime)
}

export function resolveLongitude(opts: {
  longitude?: number
  province?: string
  city?: string
}): number | null {
  if (typeof opts.longitude === 'number' && !Number.isNaN(opts.longitude)) {
    return opts.longitude
  }
  if (opts.province && opts.city) {
    return findCityLongitude(opts.province, opts.city)
  }
  return null
}

/** 由 timeIndex 取代表钟点再校正 */
export function correctFromTimeIndex(opts: {
  year: number
  month: number
  day: number
  timeIndex: number
  longitude: number
  useEquationOfTime?: boolean
  eotMethod?: EotMethod
}): TrueSolarResult {
  const clock = timeIndexToClock(opts.timeIndex)
  return correctTrueSolarTime({
    year: opts.year,
    month: opts.month,
    day: opts.day,
    hour: clock.hour,
    minute: clock.minute,
    longitude: opts.longitude,
    useEquationOfTime: opts.useEquationOfTime,
    eotMethod: opts.eotMethod,
  })
}
