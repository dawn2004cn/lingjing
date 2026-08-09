import {
  buildChartWithPatterns,
} from '@/lib/ziwei'
import {
  buildYunshiReport,
  buildLifeKLine,
  buildDaXianKLine,
} from '@/lib/ziwei/yunshi'
import { crossCheckZiweiCalendar } from '@/lib/astro/cross-engine'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      name,
      gender,
      calendarType,
      birthDate,
      birthHour,
      birthClock,
      isLeapMonth,
      useTrueSolar,
      province,
      city,
      daySect,
      year,
    } = body

    if (!birthDate || (!birthHour && !birthClock)) {
      return Response.json({ error: '请填写出生日期与时辰' }, { status: 400 })
    }

    const birth = {
      name,
      gender: gender || '男',
      calendarType: calendarType || '公历',
      birthDate,
      birthHour: birthHour || '',
      birthClock,
      isLeapMonth: !!isLeapMonth,
      useTrueSolar: !!useTrueSolar,
      province,
      city,
      daySect: Number(daySect) === 1 ? 1 : 2,
    }

    const targetYear = Number(year) || new Date().getFullYear()
    const { chart, patterns } = buildChartWithPatterns(birth)

    const report = buildYunshiReport(chart, targetYear)
    const lifeLine = buildLifeKLine(chart, {
      fromYear: chart.birthInfo.year,
      toYear: chart.birthInfo.year + 80,
      step: 1,
    })
    const daXianLine = buildDaXianKLine(chart)
    const cross = crossCheckZiweiCalendar(birth)

    return Response.json({
      chartMeta: {
        name: chart.birthInfo.name,
        mingGongBranch: chart.mingGongBranch,
        wuxingJuName: chart.wuxingJuName,
        birthYear: chart.birthInfo.year,
        daySect: birth.daySect,
      },
      patterns: patterns.slice(0, 6).map((p) => ({ name: p.name, level: p.level })),
      report,
      lifeLine: lifeLine.filter((_, i) => i % 2 === 0),
      daXianLine,
      crossCheck: {
        status: cross.status,
        summary: cross.summary,
        daySect: cross.daySect,
        engines: cross.engines,
        pillars: cross.pillars,
      },
    })
  } catch (err) {
    console.error('Yunshi error:', err)
    return Response.json({ error: err.message || '运势计算失败' }, { status: 500 })
  }
}
