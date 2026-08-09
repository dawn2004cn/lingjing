/**
 * 钟点 ↔ iztro timeIndex（0–12）
 * 0=早子(00:00–01:00), 1=丑…11=亥, 12=晚子(23:00–00:00)
 */

export const TIME_INDEX_LABELS: { index: number; name: string; range: string }[] = [
  { index: 0, name: '早子时', range: '00:00-01:00' },
  { index: 1, name: '丑时', range: '01:00-03:00' },
  { index: 2, name: '寅时', range: '03:00-05:00' },
  { index: 3, name: '卯时', range: '05:00-07:00' },
  { index: 4, name: '辰时', range: '07:00-09:00' },
  { index: 5, name: '巳时', range: '09:00-11:00' },
  { index: 6, name: '午时', range: '11:00-13:00' },
  { index: 7, name: '未时', range: '13:00-15:00' },
  { index: 8, name: '申时', range: '15:00-17:00' },
  { index: 9, name: '酉时', range: '17:00-19:00' },
  { index: 10, name: '戌时', range: '19:00-21:00' },
  { index: 11, name: '亥时', range: '21:00-23:00' },
  { index: 12, name: '晚子时', range: '23:00-00:00' },
]

/** 将小时:分钟映射为 iztro timeIndex */
export function clockToTimeIndex(hour: number, minute = 0): number {
  const total = ((hour % 24) + 24) % 24 + minute / 60
  if (total >= 23) return 12 // 晚子
  if (total < 1) return 0 // 早子
  // 1-3→1, 3-5→2, ... 21-23→11
  return Math.floor((total + 1) / 2)
}

/** 时辰选项文案 → timeIndex；兼容旧「子时 23:00-01:00」 */
export function parseTimeIndexFromHourLabel(birthHour: string, lateZi?: boolean): number {
  const t = (birthHour || '').trim()
  if (!t) return 0

  if (t.startsWith('早子')) return 0
  if (t.startsWith('晚子')) return 12
  // 旧版笼统「子时」：默认早子，若 lateZi 则晚子
  if (t.startsWith('子时')) return lateZi ? 12 : 0

  const named = TIME_INDEX_LABELS.find((x) => t.startsWith(x.name))
  if (named) return named.index

  // HH:MM 或 HH
  const hm = t.match(/^(\d{1,2})(?::(\d{2}))?/)
  if (hm) {
    return clockToTimeIndex(parseInt(hm[1], 10), hm[2] ? parseInt(hm[2], 10) : 0)
  }
  return 0
}

/** timeIndex → 地支 0–11（子…亥）；早晚子均为 0 */
export function timeIndexToBranch(timeIndex: number): number {
  if (timeIndex === 12 || timeIndex === 0) return 0
  return timeIndex
}

/** 代表钟点（用于真太阳时校正的起点） */
export function timeIndexToClock(timeIndex: number): { hour: number; minute: number } {
  if (timeIndex === 0) return { hour: 0, minute: 30 }
  if (timeIndex === 12) return { hour: 23, minute: 30 }
  // 丑=1 → 2:00 中点
  const hour = timeIndex * 2
  return { hour: hour === 24 ? 0 : hour, minute: 0 }
}

export function formatTimeIndexLabel(timeIndex: number): string {
  const item = TIME_INDEX_LABELS.find((x) => x.index === timeIndex)
  return item ? `${item.name} (${item.range})` : `时辰${timeIndex}`
}
