/**
 * 时辰边界检测：距交界 ≤ threshold 分钟时提示双盘对照
 */

import { clockToTimeIndex, formatTimeIndexLabel, TIME_INDEX_LABELS } from './time-index'

/** 时辰切换点（一天内的分钟数，从 0:00 起） */
const BOUNDARIES_MIN = [
  0, // 晚子→早子 / 日界
  60, // 早子→丑 01:00
  180, // 丑→寅 03:00
  300,
  420,
  540,
  660,
  780,
  900,
  1020,
  1140,
  1260,
  1380, // 亥→晚子 23:00
]

export interface BoundaryProbe {
  nearBoundary: boolean
  minutesToBoundary: number
  currentIndex: number
  prevIndex: number
  nextIndex: number
  /** 更近的一侧相邻时辰 */
  alternateIndex: number
  currentLabel: string
  alternateLabel: string
  message: string
}

function wrapDayMinutes(m: number): number {
  return ((m % 1440) + 1440) % 1440
}

function neighborIndices(timeIndex: number): { prev: number; next: number } {
  // 顺序：0,1,2,...,11,12,0
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const i = order.indexOf(timeIndex)
  const prev = order[(i - 1 + order.length) % order.length]
  const next = order[(i + 1) % order.length]
  return { prev, next }
}

/** 距最近边界的分钟数（向前/向后取较小） */
export function minutesToNearestBoundary(hour: number, minute: number): {
  distance: number
  toward: 'prev' | 'next'
} {
  const now = wrapDayMinutes(hour * 60 + minute)
  let best = { distance: 999, toward: 'next' as 'prev' | 'next' }
  for (const b of BOUNDARIES_MIN) {
    const forward = wrapDayMinutes(b - now)
    const backward = wrapDayMinutes(now - b)
    if (forward <= best.distance) best = { distance: forward, toward: 'next' }
    if (backward < best.distance) best = { distance: backward, toward: 'prev' }
  }
  return best
}

/**
 * @param thresholdMin 默认 20 分钟内视为边界敏感
 */
export function probeTimeBoundary(
  hour: number,
  minute: number,
  thresholdMin = 20,
): BoundaryProbe {
  const currentIndex = clockToTimeIndex(hour, minute)
  const { prev, next } = neighborIndices(currentIndex)
  const { distance, toward } = minutesToNearestBoundary(hour, minute)
  const alternateIndex = toward === 'prev' ? prev : next
  const nearBoundary = distance <= thresholdMin

  return {
    nearBoundary,
    minutesToBoundary: distance,
    currentIndex,
    prevIndex: prev,
    nextIndex: next,
    alternateIndex,
    currentLabel: formatTimeIndexLabel(currentIndex),
    alternateLabel: formatTimeIndexLabel(alternateIndex),
    message: nearBoundary
      ? `距时辰交界约 ${distance} 分钟（当前 ${TIME_INDEX_LABELS.find((x) => x.index === currentIndex)?.name}，邻近 ${TIME_INDEX_LABELS.find((x) => x.index === alternateIndex)?.name}）。建议对照双盘，勿只采一盘定论。`
      : `距时辰交界约 ${distance} 分钟，暂不在敏感区。`,
  }
}

export function parseClockString(birthClock?: string): { hour: number; minute: number } | null {
  if (!birthClock || !/^\d{1,2}:\d{2}$/.test(birthClock)) return null
  const [h, m] = birthClock.split(':').map(Number)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { hour: h, minute: m }
}
