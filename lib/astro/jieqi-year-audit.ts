/**
 * 十二节（换月）自动校验：给定公历年，断言每个节气交界前后月柱变化
 */

import { Solar } from 'lunar-javascript'
import { buildBaziChart } from '@/lib/bazi/engine'
import { tymePillarsAt } from '@/lib/astro/cross-engine'
import { MONTH_CHANGE_JIEQI } from '@/lib/astro/jieqi-boundary'

export interface Jie12CaseResult {
  name: string
  iso: string
  before: string
  after: string
  yearChanged: boolean
  monthChanged: boolean
  tymeBefore: string
  tymeAfter: string
  tymeMonthChanged: boolean
  /** 交界前一刻主引擎与 tyme 默认是否完全一致 */
  tymeAlignedBefore: boolean
  tymeAlignedAfter: boolean
  /** 与 tyme 流派2（23时后不换日）是否一致 */
  tymeSect2AlignedBefore: boolean
  tymeSect2AlignedAfter: boolean
  /** 仅因日柱流派导致与 tyme 默认不一致 */
  sectDiffOnly: boolean
}

function snapAt(year: number, month: number, day: number, hour: number, minute: number): string {
  const c = buildBaziChart({
    gender: '男',
    calendarType: '公历',
    birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    birthHour: '子时',
    birthClock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  })
  return [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, c.pillars.time.ganZhi].join(' ')
}

function monthGz(snap: string): string {
  return snap.split(' ')[1] || ''
}

function yearGz(snap: string): string {
  return snap.split(' ')[0] || ''
}

function shiftMinute(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  delta: number,
) {
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

/** 从某日农历节气表收集该公历年内十二节 */
export function listMonthJieQiInYear(year: number): { name: string; solar: ReturnType<typeof Solar.fromYmd> }[] {
  const lunar = Solar.fromYmd(year, 6, 15).getLunar()
  const table = lunar.getJieQiTable()
  const out: { name: string; solar: ReturnType<typeof Solar.fromYmd> }[] = []
  for (const name of MONTH_CHANGE_JIEQI) {
    const solar = table[name]
    if (!solar) continue
    if (solar.getYear() !== year) continue
    out.push({ name, solar })
  }
  return out.sort((a, b) => a.solar.toYmdHms().localeCompare(b.solar.toYmdHms()))
}

export function auditMonthJieQiYear(year: number): Jie12CaseResult[] {
  return listMonthJieQiInYear(year).map(({ name, solar }) => {
    const y = solar.getYear()
    const m = solar.getMonth()
    const d = solar.getDay()
    const h = solar.getHour()
    const mi = solar.getMinute()
    const before = shiftMinute(y, m, d, h, mi, -1)
    const after = shiftMinute(y, m, d, h, mi, 1)
    const beforeSnap = snapAt(before.year, before.month, before.day, before.hour, before.minute)
    const afterSnap = snapAt(after.year, after.month, after.day, after.hour, after.minute)
    const tymeBefore = tymePillarsAt(before.year, before.month, before.day, before.hour, before.minute)
    const tymeAfter = tymePillarsAt(after.year, after.month, after.day, after.hour, after.minute)
    const tymeSect2Before = tymePillarsAt(before.year, before.month, before.day, before.hour, before.minute, 'sect2')
    const tymeSect2After = tymePillarsAt(after.year, after.month, after.day, after.hour, after.minute, 'sect2')
    const tymeAlignedBefore = beforeSnap === tymeBefore
    const tymeAlignedAfter = afterSnap === tymeAfter
    const tymeSect2AlignedBefore = beforeSnap === tymeSect2Before
    const tymeSect2AlignedAfter = afterSnap === tymeSect2After
    return {
      name,
      iso: solar.toYmdHms(),
      before: beforeSnap,
      after: afterSnap,
      yearChanged: yearGz(beforeSnap) !== yearGz(afterSnap),
      monthChanged: monthGz(beforeSnap) !== monthGz(afterSnap),
      tymeBefore,
      tymeAfter,
      tymeMonthChanged: monthGz(tymeBefore) !== monthGz(tymeAfter),
      tymeAlignedBefore,
      tymeAlignedAfter,
      tymeSect2AlignedBefore,
      tymeSect2AlignedAfter,
      sectDiffOnly:
        (!tymeAlignedBefore || !tymeAlignedAfter)
        && tymeSect2AlignedBefore
        && tymeSect2AlignedAfter,
    }
  })
}
