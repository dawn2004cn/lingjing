import {
  buildChartWithPatterns,
  formatChartForPrompt,
} from '@/lib/ziwei'
import { buildDualBoundary, formatDualForPrompt } from '@/lib/astro/dual-boundary'
import { crossCheckZiweiCalendar, formatCrossCheckForPrompt } from '@/lib/astro/cross-engine'
import {
  auditZiweiChartIntegrity,
  formatZiweiIntegrityForPrompt,
} from '@/lib/astro/ziwei-integrity'

function serializeDual(dual) {
  if (!dual?.applicable) {
    return dual
      ? { applicable: false, probe: dual.probe }
      : null
  }
  return {
    applicable: true,
    probe: dual.probe,
    ziwei: dual.ziwei
      ? { diff: dual.ziwei.diff }
      : undefined,
    bazi: dual.bazi
      ? {
          pillarsChanged: dual.bazi.pillarsChanged,
          snapA: dual.bazi.snapA,
          snapB: dual.bazi.snapB,
        }
      : undefined,
  }
}

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
      lateZi,
      useTrueSolar,
      province,
      city,
      longitude,
      daySect,
    } = body

    if (!birthDate || (!birthHour && !birthClock)) {
      return Response.json(
        { error: '请完整填写出生日期和出生时辰（或精确钟点）' },
        { status: 400 },
      )
    }
    if (useTrueSolar && !birthClock) {
      return Response.json(
        { error: '开启真太阳时时请填写精确钟点（HH:MM）' },
        { status: 400 },
      )
    }
    if (useTrueSolar && !longitude && (!province || !city)) {
      return Response.json(
        { error: '开启真太阳时时请选择出生省市' },
        { status: 400 },
      )
    }

    const birth = {
      name,
      gender: gender || '男',
      calendarType: calendarType || '公历',
      birthDate,
      birthHour: birthHour || '',
      birthClock,
      isLeapMonth: !!isLeapMonth,
      lateZi: !!lateZi,
      useTrueSolar: !!useTrueSolar,
      province,
      city,
      longitude,
      daySect: Number(daySect) === 1 ? 1 : 2,
    }

    const { chart, patterns, mingSummary, trueSolar, timeIndex } = buildChartWithPatterns(birth)
    let promptText = formatChartForPrompt(chart, patterns, { trueSolar, timeIndex })

    const dual = buildDualBoundary(birth, 'ziwei')
    if (dual?.applicable) {
      promptText += `\n\n${formatDualForPrompt(dual)}`
    }

    const crossCheck = crossCheckZiweiCalendar(birth)
    promptText += `\n\n${formatCrossCheckForPrompt(crossCheck)}`

    const integrity = auditZiweiChartIntegrity(chart, {
      expectSolar: chart.birthInfo
        ? { year: chart.birthInfo.year, month: chart.birthInfo.month, day: chart.birthInfo.day }
        : undefined,
    })
    promptText += `\n\n${formatZiweiIntegrityForPrompt(integrity)}`

    return Response.json({
      chart,
      patterns: patterns.map((p) => ({
        name: p.name,
        level: p.level,
        description: p.description,
        palaces: p.palaces,
        source: p.source,
      })),
      mingSummary,
      promptText,
      timeIndex,
      trueSolar,
      dualBoundary: serializeDual(dual),
      crossCheck,
      integrity,
    })
  } catch (err) {
    console.error('Ziwei chart error:', err)
    return Response.json(
      { error: err.message || '排盘失败，请检查生辰信息' },
      { status: 500 },
    )
  }
}
