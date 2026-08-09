/**
 * 八字确定性排盘 — 基于 lunar-javascript
 */

import { Solar, Lunar } from 'lunar-javascript'
import { parseTimeIndexFromHourLabel, timeIndexToClock, clockToTimeIndex } from '@/lib/astro/time-index'
import {
  correctFromTimeIndex,
  correctTrueSolarTime,
  resolveLongitude,
  type TrueSolarResult,
} from '@/lib/astro/true-solar'
import { judgeYongShen, type YongShenResult } from './yongshen'

export interface BaziPillar {
  ganZhi: string
  gan: string
  zhi: string
  hideGan: string[]
  naYin: string
  shiShenGan?: string
  diShi?: string
}

export interface DaYunItem {
  index: number
  ganZhi: string
  startYear: number
  startAge: number
  endYear: number
  endAge: number
}

export interface BaziChart {
  solar: { year: number; month: number; day: number; hour: number; minute: number }
  lunar: string
  gender: 'male' | 'female'
  name?: string
  timeIndex: number
  pillars: {
    year: BaziPillar
    month: BaziPillar
    day: BaziPillar
    time: BaziPillar
  }
  dayMaster: string
  wuXing: Record<string, number>
  trueSolar?: TrueSolarResult | null
  yongShen?: YongShenResult
  yunStart?: { years: number; months: number; days: number }
  daYun?: DaYunItem[]
  /** 23:00 后日柱流派说明（仅当两派不同时出现） */
  daySect?: {
    sect: 1 | 2
    dayPillarUsed: string
    dayPillarAlt: string
    note: string
  } | null
}

export interface BaziFormInput {
  name?: string
  gender: string
  calendarType?: string
  birthDate: string
  birthHour: string
  birthClock?: string // HH:MM 可选，优先于时辰档
  isLeapMonth?: boolean
  lateZi?: boolean
  useTrueSolar?: boolean
  province?: string
  city?: string
  longitude?: number
  /**
   * 日柱流派：1 = 23:00后换日柱；2 = 23:00后不换日柱（默认，对齐 tyme 流派2）
   */
  daySect?: 1 | 2
}

function ganZhiParts(gz: string): { gan: string; zhi: string } {
  return { gan: gz.slice(0, 1), zhi: gz.slice(1, 2) }
}

function countWuXing(pillars: BaziChart['pillars']): Record<string, number> {
  const map: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }
  const ganWX: Record<string, string> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  }
  const zhiWX: Record<string, string> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
  }
  for (const p of Object.values(pillars)) {
    if (ganWX[p.gan]) map[ganWX[p.gan]]++
    if (zhiWX[p.zhi]) map[zhiWX[p.zhi]]++
  }
  return map
}

function toSolarYmd(
  birthDate: string,
  calendarType: string,
  isLeapMonth: boolean,
): { year: number; month: number; day: number } {
  const [y, m, d] = birthDate.split('-').map(Number)
  if ([y, m, d].some((n) => Number.isNaN(n))) {
    throw new Error('出生日期格式无效')
  }
  if (calendarType === '农历') {
    const lunarMonth = isLeapMonth ? -Math.abs(m) : m
    const lunar = Lunar.fromYmd(y, lunarMonth, d)
    const solar = lunar.getSolar()
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
  }
  return { year: y, month: m, day: d }
}

export function buildBaziChart(input: BaziFormInput): BaziChart {
  const calendarType = input.calendarType || '公历'
  const solarBase = toSolarYmd(input.birthDate, calendarType, !!input.isLeapMonth)

  let timeIndex = parseTimeIndexFromHourLabel(input.birthHour, input.lateZi)
  let hour = 12
  let minute = 0

  if (input.birthClock && /^\d{1,2}:\d{2}$/.test(input.birthClock)) {
    const [h, mi] = input.birthClock.split(':').map(Number)
    hour = h
    minute = mi
    timeIndex = clockToTimeIndex(h, mi)
  } else {
    const clock = timeIndexToClock(timeIndex)
    hour = clock.hour
    minute = clock.minute
  }

  let trueSolar: TrueSolarResult | null = null
  let y = solarBase.year
  let m = solarBase.month
  let d = solarBase.day

  if (input.useTrueSolar) {
    const lon = resolveLongitude({
      longitude: input.longitude,
      province: input.province,
      city: input.city,
    })
    if (lon != null) {
      if (input.birthClock) {
        trueSolar = correctTrueSolarTime({
          year: y, month: m, day: d, hour, minute, longitude: lon,
        })
      } else {
        trueSolar = correctFromTimeIndex({
          year: y, month: m, day: d, timeIndex, longitude: lon,
        })
      }
      y = trueSolar.year
      m = trueSolar.month
      d = trueSolar.day
      hour = trueSolar.hour
      minute = trueSolar.minute
      timeIndex = trueSolar.timeIndex
    }
  }

  // 晚子时：lunar-javascript 用 23 点；早子用 0 点
  let solarHour = hour
  let solarMinute = minute
  if (!input.birthClock) {
    if (timeIndex === 12) { solarHour = 23; solarMinute = 30 }
    else if (timeIndex === 0) { solarHour = 0; solarMinute = 30 }
  }

  const solar = Solar.fromYmdHms(y, m, d, solarHour, solarMinute, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()
  const daySectChoice: 1 | 2 = input.daySect === 1 ? 1 : 2
  // 显式锁定日柱流派；默认 2（23:00–23:59 不跨日），与 tyme4ts LunarSect2 对齐
  if (typeof ec.setSect === 'function') ec.setSect(daySectChoice)

  const yearGz = ec.getYear()
  const monthGz = ec.getMonth()
  const dayGz = ec.getDay()
  const timeGz = ec.getTime()

  const dayExact1 = typeof (lunar as any).getDayInGanZhiExact === 'function'
    ? (lunar as any).getDayInGanZhiExact()
    : dayGz
  const dayExact2 = typeof (lunar as any).getDayInGanZhiExact2 === 'function'
    ? (lunar as any).getDayInGanZhiExact2()
    : dayGz
  const daySectNote =
    solarHour >= 23 && dayExact1 !== dayExact2
      ? {
          sect: daySectChoice,
          dayPillarUsed: dayGz,
          dayPillarAlt: daySectChoice === 2 ? dayExact1 : dayExact2,
          note:
            daySectChoice === 2
              ? '23:00后日柱采用流派2（不跨日）。流派1会取次日日柱。'
              : '23:00后日柱采用流派1（换日）。流派2会保持当日日柱。',
        }
      : null

  const mk = (
    gz: string,
    hide: string[],
    naYin: string,
    shiShen?: string,
    diShi?: string,
  ): BaziPillar => {
    const { gan, zhi } = ganZhiParts(gz)
    return { ganZhi: gz, gan, zhi, hideGan: hide || [], naYin, shiShenGan: shiShen, diShi }
  }

  const pillars = {
    year: mk(yearGz, ec.getYearHideGan() || [], ec.getYearNaYin(), ec.getYearShiShenGan(), ec.getYearDiShi()),
    month: mk(monthGz, ec.getMonthHideGan() || [], ec.getMonthNaYin(), ec.getMonthShiShenGan(), ec.getMonthDiShi()),
    day: mk(dayGz, ec.getDayHideGan() || [], ec.getDayNaYin(), ec.getDayShiShenGan(), ec.getDayDiShi()),
    time: mk(timeGz, ec.getTimeHideGan() || [], ec.getTimeNaYin(), ec.getTimeShiShenGan(), ec.getTimeDiShi()),
  }

  const genderCode = input.gender === '女' || input.gender === 'female' ? 0 : 1
  const yun = ec.getYun(genderCode)
  const daYun: DaYunItem[] = (yun.getDaYun() || []).slice(0, 10).map((d) => ({
    index: d.getIndex(),
    ganZhi: d.getGanZhi() || '',
    startYear: d.getStartYear(),
    startAge: d.getStartAge(),
    endYear: d.getEndYear(),
    endAge: d.getEndAge(),
  }))

  const wuXing = countWuXing(pillars)
  const yongShen = judgeYongShen({
    dayGan: pillars.day.gan,
    monthZhi: pillars.month.zhi,
    wuXing,
  })

  return {
    solar: { year: y, month: m, day: d, hour: solarHour, minute: solarMinute },
    lunar: lunar.toString(),
    gender: genderCode === 0 ? 'female' : 'male',
    name: input.name?.trim() || undefined,
    timeIndex,
    pillars,
    dayMaster: pillars.day.gan,
    wuXing,
    trueSolar,
    yongShen,
    yunStart: {
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
    },
    daYun,
    daySect: daySectNote,
  }
}

export function formatBaziForPrompt(chart: BaziChart): string {
  const g = chart.gender === 'male' ? '乾造' : '坤造'
  const p = chart.pillars
  const lines = [
    '## 八字排盘（算法生成，请勿改动柱位）',
    `- 姓名：${chart.name || '未提供'}（${g}）`,
    `- 公历：${chart.solar.year}-${chart.solar.month}-${chart.solar.day} ${String(chart.solar.hour).padStart(2, '0')}:${String(chart.solar.minute).padStart(2, '0')}`,
    `- 农历：${chart.lunar}`,
    `- 日主：${chart.dayMaster}`,
    '',
    '| 柱 | 干支 | 十神 | 藏干 | 纳音 |',
    '|---|---|---|---|---|',
    `| 年 | ${p.year.ganZhi} | ${p.year.shiShenGan || ''} | ${p.year.hideGan.join('')} | ${p.year.naYin} |`,
    `| 月 | ${p.month.ganZhi} | ${p.month.shiShenGan || ''} | ${p.month.hideGan.join('')} | ${p.month.naYin} |`,
    `| 日 | ${p.day.ganZhi} | ${p.day.shiShenGan || ''} | ${p.day.hideGan.join('')} | ${p.day.naYin} |`,
    `| 时 | ${p.time.ganZhi} | ${p.time.shiShenGan || ''} | ${p.time.hideGan.join('')} | ${p.time.naYin} |`,
    '',
    `五行统计：金${chart.wuXing['金']} 木${chart.wuXing['木']} 水${chart.wuXing['水']} 火${chart.wuXing['火']} 土${chart.wuXing['土']}`,
  ]
  if (chart.trueSolar) {
    lines.push(
      `- 真太阳时：校正 ${chart.trueSolar.totalCorrectionMin} 分钟（${chart.trueSolar.eotMethod || 'meeus'}）；时辰 ${chart.trueSolar.label}${chart.trueSolar.changedTimeIndex ? '（已跨时辰）' : '（未跨时辰）'}`,
    )
  }
  if (chart.daySect) {
    lines.push(`- 日柱流派：${chart.daySect.note}（本盘 ${chart.daySect.dayPillarUsed}；另一派为 ${chart.daySect.dayPillarAlt}）`)
  }
  if (chart.yongShen) {
    lines.push(
      `- 喜用简判：日主${chart.yongShen.strength}；喜 ${chart.yongShen.xiYong.join('、')}；忌 ${chart.yongShen.jiShen.join('、')}`,
    )
  }
  if (chart.daYun?.length) {
    const list = chart.daYun
      .filter((d) => d.ganZhi)
      .slice(0, 6)
      .map((d) => `${d.startAge}岁${d.ganZhi}`)
      .join(' → ')
    lines.push(`- 大运：${list}`)
  }
  return lines.join('\n')
}
