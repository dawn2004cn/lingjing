/**
 * 紫微斗数引擎对外封装
 * 排盘算法来源：https://github.com/Renhuai123/ziwei-doushu (MIT)
 */

import { Lunar } from 'lunar-javascript'
import { generateChart } from './algorithm'
import { detectPatterns, getMingGongSummary } from './patterns'
import { BRANCHES, STEMS } from './constants'
import type { BirthInfo, ZiweiChart } from './types'
import type { Pattern } from './patterns'
import {
  parseTimeIndexFromHourLabel,
  clockToTimeIndex,
  timeIndexToClock,
  formatTimeIndexLabel,
  timeIndexToBranch,
} from '@/lib/astro/time-index'
import {
  correctFromTimeIndex,
  correctTrueSolarTime,
  resolveLongitude,
  type TrueSolarResult,
} from '@/lib/astro/true-solar'

export { generateChart } from './algorithm'
export { detectPatterns, getMingGongSummary } from './patterns'
export type { Pattern } from './patterns'
export { BRANCHES, STEMS, SHICHEN } from './constants'
export type { BirthInfo, ZiweiChart, Palace, Star } from './types'

export interface FormBirthInput {
  name?: string
  gender: string
  calendarType?: string
  birthDate: string
  birthHour: string
  /** 精确钟点 HH:MM，优先于时辰档 */
  birthClock?: string
  isLeapMonth?: boolean
  /** 旧版「子时」选晚子 */
  lateZi?: boolean
  useTrueSolar?: boolean
  province?: string
  city?: string
  longitude?: number
  /** 八字旁证日柱流派（紫微主盘不受影响） */
  daySect?: 1 | 2
  /** 紫微运限口径：ni=倪师（默认）；feixing=飞星（大限宫干四化） */
  ziweiSchool?: 'ni' | 'feixing'
}

export interface ChartBuildResult {
  chart: ZiweiChart
  patterns: Pattern[]
  mingSummary: ReturnType<typeof getMingGongSummary>
  trueSolar: TrueSolarResult | null
  timeIndex: number
}

function toSolarYmd(
  birthDate: string,
  calendarType: string,
  isLeapMonth: boolean,
): { year: number; month: number; day: number } {
  const parts = birthDate.split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error('出生日期格式无效，请使用 YYYY-MM-DD')
  }
  let [year, month, day] = parts

  if (calendarType === '农历') {
    const lunarMonth = isLeapMonth ? -Math.abs(month) : month
    const lunar = Lunar.fromYmd(year, lunarMonth, day)
    const solar = lunar.getSolar()
    year = solar.getYear()
    month = solar.getMonth()
    day = solar.getDay()
  }
  return { year, month, day }
}

/**
 * 将灵镜表单字段转为 BirthInfo（含可选真太阳时）。
 * hour 字段写入 iztro timeIndex（0–12）。
 */
export function parseBirthToZiweiInput(input: FormBirthInput): {
  birthInfo: BirthInfo
  trueSolar: TrueSolarResult | null
  timeIndex: number
} {
  const {
    name,
    gender,
    calendarType = '公历',
    birthDate,
    birthHour,
    birthClock,
    isLeapMonth = false,
    lateZi = false,
    useTrueSolar = false,
  } = input

  let { year, month, day } = toSolarYmd(birthDate, calendarType, isLeapMonth)

  let timeIndex = parseTimeIndexFromHourLabel(birthHour, lateZi)
  let hour = 12
  let minute = 0

  if (birthClock && /^\d{1,2}:\d{2}$/.test(birthClock)) {
    const [h, mi] = birthClock.split(':').map(Number)
    hour = h
    minute = mi
    timeIndex = clockToTimeIndex(h, mi)
  } else {
    const clock = timeIndexToClock(timeIndex)
    hour = clock.hour
    minute = clock.minute
  }

  let trueSolar: TrueSolarResult | null = null

  if (useTrueSolar) {
    const lon = resolveLongitude({
      longitude: input.longitude,
      province: input.province,
      city: input.city,
    })
    if (lon != null) {
      if (birthClock) {
        trueSolar = correctTrueSolarTime({
          year, month, day, hour, minute, longitude: lon,
        })
      } else {
        trueSolar = correctFromTimeIndex({
          year, month, day, timeIndex, longitude: lon,
        })
      }
      year = trueSolar.year
      month = trueSolar.month
      day = trueSolar.day
      timeIndex = trueSolar.timeIndex
    }
  }

  const birthInfo: BirthInfo = {
    year,
    month,
    day,
    hour: timeIndex, // iztro 0–12
    gender: gender === '女' || gender === 'female' ? 'female' : 'male',
    name: name?.trim() || undefined,
    province: input.province,
    city: input.city,
    longitude: resolveLongitude({
      longitude: input.longitude,
      province: input.province,
      city: input.city,
    }) ?? undefined,
  }

  return { birthInfo, trueSolar, timeIndex }
}

/** @deprecated 使用 parseBirthToZiweiInput；保留兼容旧调用 */
export function parseHourIndex(birthHour: string): number {
  return timeIndexToBranch(parseTimeIndexFromHourLabel(birthHour))
}

export function buildChartWithPatterns(input: FormBirthInput): ChartBuildResult {
  const { birthInfo, trueSolar, timeIndex } = parseBirthToZiweiInput(input)
  const chart = generateChart(birthInfo)
  const patterns = detectPatterns(chart)
  const mingSummary = getMingGongSummary(chart)
  return { chart, patterns, mingSummary, trueSolar, timeIndex }
}

/** 生成供 LLM 使用的命盘摘要文本（禁止模型自行编造星位） */
export function formatChartForPrompt(
  chart: ZiweiChart,
  patterns: Pattern[],
  extra?: { trueSolar?: TrueSolarResult | null; timeIndex?: number },
): string {
  const lines: string[] = []
  const g = chart.birthInfo.gender === 'male' ? '乾造' : '坤造'
  const ti = extra?.timeIndex ?? chart.birthInfo.hour
  lines.push(`## 基本信息`)
  lines.push(`- 姓名：${chart.birthInfo.name || '未提供'}`)
  lines.push(`- 性别：${g}`)
  lines.push(
    `- 公历：${chart.birthInfo.year}-${chart.birthInfo.month}-${chart.birthInfo.day} ${formatTimeIndexLabel(ti)}`,
  )
  lines.push(
    `- 农历：${chart.lunarInfo.lunarYear}年${chart.lunarInfo.isLeapMonth ? '闰' : ''}${chart.lunarInfo.lunarMonth}月${chart.lunarInfo.lunarDay}日`,
  )
  if (chart.birthInfo.city) {
    lines.push(`- 出生地：${chart.birthInfo.province || ''}${chart.birthInfo.city}`)
  }
  if (extra?.trueSolar) {
    const ts = extra.trueSolar
    lines.push(
      `- 真太阳时：校正 ${ts.totalCorrectionMin} 分钟（${ts.eotMethod || 'meeus'}） → ${ts.year}-${ts.month}-${ts.day} ${formatTimeIndexLabel(ts.timeIndex)}${ts.changedTimeIndex ? '（已跨时辰）' : '（未跨时辰）'}`,
    )
  }
  lines.push(`- 命宫：${BRANCHES[chart.mingGongBranch]}`)
  lines.push(`- 身宫：${BRANCHES[chart.shenGongBranch]}`)
  lines.push(`- 五行局：${chart.wuxingJuName}`)
  lines.push(`- 当前虚岁：${chart.currentAge}`)

  if (chart.currentDaXianIndex >= 0) {
    const dx = chart.daXians[chart.currentDaXianIndex]
    lines.push(`- 当前大限：${dx.startAge}–${dx.endAge}岁 · ${dx.palaceName}`)
  }

  lines.push('')
  lines.push('## 十二宫星曜（请严格依据下列数据解读，勿自行改动星位）')
  for (const p of chart.palaces) {
    const stem = STEMS[p.stem] || ''
    const branch = BRANCHES[p.branch] || ''
    const tags: string[] = []
    if (p.isMingGong) tags.push('命')
    if (p.isShenGong) tags.push('身')
    if (p.isCurrentDaXian) tags.push('限')
    const tagStr = tags.length ? ` [${tags.join('/')}]` : ''
    const majors = p.stars
      .filter((s) => s.type === 'major')
      .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}`)
      .join('、') || '空宫'
    const others = p.stars
      .filter((s) => s.type !== 'major')
      .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}`)
      .join('、')
    lines.push(
      `- ${p.name}（${stem}${branch}）${tagStr}：主星 ${majors}${others ? `；辅曜 ${others}` : ''}`,
    )
  }

  if (patterns.length) {
    lines.push('')
    lines.push('## 已判定格局')
    for (const pat of patterns.slice(0, 12)) {
      lines.push(`- 【${pat.level}】${pat.name}：${pat.description}`)
    }
  }

  return lines.join('\n')
}
