import { probeTimeBoundary, parseClockString } from '@/lib/astro/boundary'
import { buildBaziChart } from '@/lib/bazi/engine'
import { probeJieQiFromChart } from '@/lib/astro/jieqi-boundary'
import { parseTimeIndexFromHourLabel, timeIndexToClock } from '@/lib/astro/time-index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      birthDate,
      birthHour = '',
      birthClock = '',
      calendarType = '公历',
      isLeapMonth = false,
      gender = '男',
    } = body

    if (!birthDate) {
      return Response.json({ error: '缺少出生日期' }, { status: 400 })
    }

    const tips = []
    let timeBoundary = null
    let jieQiBoundary = null

    const clock = parseClockString(birthClock)
    let hour
    let minute
    if (clock) {
      hour = clock.hour
      minute = clock.minute
    } else if (birthHour) {
      const idx = parseTimeIndexFromHourLabel(birthHour, !!body.lateZi)
      const c = timeIndexToClock(idx)
      hour = c.hour
      minute = c.minute
      tips.push('未填精确钟点：时辰交界与节气距离按时辰代表点估算')
    } else {
      return Response.json({ tips: ['请先填写时辰或精确钟点'], timeBoundary: null, jieQiBoundary: null })
    }

    const probe = probeTimeBoundary(hour, minute, 20)
    timeBoundary = {
      nearBoundary: probe.nearBoundary,
      minutesToBoundary: probe.minutesToBoundary,
      currentLabel: probe.currentLabel,
      alternateLabel: probe.alternateLabel,
      message: probe.message,
    }
    if (probe.nearBoundary) {
      tips.push(`时辰交界：距 ${probe.currentLabel} / ${probe.alternateLabel} 约 ${probe.minutesToBoundary} 分钟，排盘将做双盘对照`)
    }

    try {
      const chart = buildBaziChart({
        gender,
        calendarType,
        birthDate,
        birthHour: birthHour || '子时',
        birthClock: birthClock || undefined,
        isLeapMonth: !!isLeapMonth,
        useTrueSolar: !!body.useTrueSolar,
        province: body.province,
        city: body.city,
        daySect: Number(body.daySect) === 1 ? 1 : 2,
      })
      jieQiBoundary = probeJieQiFromChart(
        chart,
        {
          gender,
          calendarType,
          birthDate,
          birthHour: birthHour || '子时',
          birthClock: birthClock || undefined,
          isLeapMonth: !!isLeapMonth,
          daySect: Number(body.daySect) === 1 ? 1 : 2,
        },
        90,
      )
      if (jieQiBoundary?.nearBoundary) {
        tips.push(
          `节气交界：距「${jieQiBoundary.jieQi?.name}」约 ${jieQiBoundary.minutesToJieQi} 分钟（${jieQiBoundary.jieQi?.iso}）${jieQiBoundary.yearPillarChanged ? '，年柱可能切换' : ''}${jieQiBoundary.monthPillarChanged ? '，月柱可能切换' : ''}`,
        )
      } else if (jieQiBoundary?.jieQi && jieQiBoundary.minutesToJieQi <= 24 * 60) {
        tips.push(`最近换月/换年节气「${jieQiBoundary.jieQi.name}」在 ${jieQiBoundary.jieQi.iso}（约 ${jieQiBoundary.minutesToJieQi} 分钟外）`)
      }
    } catch (e) {
      tips.push(`历法解析暂不可用：${e.message || e}`)
    }

    return Response.json({
      tips,
      timeBoundary,
      jieQiBoundary: jieQiBoundary
        ? {
            nearBoundary: jieQiBoundary.nearBoundary,
            minutesToJieQi: jieQiBoundary.minutesToJieQi,
            message: jieQiBoundary.message,
            jieQi: jieQiBoundary.jieQi,
            pillarsBefore: jieQiBoundary.pillarsBefore,
            pillarsAfter: jieQiBoundary.pillarsAfter,
            yearPillarChanged: jieQiBoundary.yearPillarChanged,
            monthPillarChanged: jieQiBoundary.monthPillarChanged,
            dualRecommended: jieQiBoundary.dualRecommended,
          }
        : null,
    })
  } catch (err) {
    console.error('hints error', err)
    return Response.json({ error: err.message || '提示失败' }, { status: 500 })
  }
}
