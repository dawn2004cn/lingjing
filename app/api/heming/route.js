import OpenAI from 'openai'
import { buildHemingSystemPrompt, buildHemingUserPrompt } from '@/lib/ziwei/heming'
import {
  buildHemingMatrix,
  formatHemingMatrixForPrompt,
  buildHemingFlyFacts,
} from '@/lib/ziwei/heming-matrix'
import { normalizeMarkdown } from '@/lib/markdown/normalize'
import { citationRiskScore, buildZiweiCitationFacts, withZiweiPatterns } from '@/lib/astro/citation-guard'
import { logAccuracyEvent } from '@/lib/astro/accuracy-events'
import { collectZiweiAllowedTerms } from '@/lib/ziwei/rule-reading'
import {
  crossCheckZiweiCalendar,
  formatCrossCheckForPrompt,
} from '@/lib/astro/cross-engine'

const MOCK_TAIL = `

---

*演示数据：未配置 LLM API Key 时，上方结构化互飞仍为算法结果。*`

function normalizeBirth(raw) {
  if (!raw?.birthDate) return null
  return {
    name: raw.name,
    gender: raw.gender || '男',
    calendarType: raw.calendarType || '公历',
    birthDate: raw.birthDate,
    birthHour: raw.birthHour || '',
    birthClock: raw.birthClock,
    isLeapMonth: !!raw.isLeapMonth,
    lateZi: !!raw.lateZi,
    useTrueSolar: !!raw.useTrueSolar,
    province: raw.province,
    city: raw.city,
    daySect: Number(raw.daySect) === 1 ? 1 : 2,
  }
}

function slimCross(report) {
  if (!report) return null
  return {
    status: report.status,
    summary: report.summary,
    daySect: report.daySect,
    engines: report.engines,
    pillars: report.pillars,
  }
}

export async function POST(request) {
  try {
    const { chartA, chartB, question, birthA, birthB } = await request.json()
    if (!chartA || !chartB) {
      return Response.json({ error: '请提供双方命盘' }, { status: 400 })
    }

    const matrix = buildHemingMatrix(chartA, chartB)
    const matrixText = formatHemingMatrixForPrompt(matrix)
    const flyFacts = buildHemingFlyFacts(matrix)
    const allowed = new Set([
      ...collectZiweiAllowedTerms(chartA, []),
      ...collectZiweiAllowedTerms(chartB, []),
    ])
    const fa = buildZiweiCitationFacts(chartA)
    const fb = buildZiweiCitationFacts(chartB)
    const citationFacts = {
      system: 'ziwei',
      starPalaces: { ...(fa.starPalaces || {}) },
      natalSiHua: { ...(fa.natalSiHua || {}), ...(fb.natalSiHua || {}) },
      siHuaFall: { ...(fa.siHuaFall || {}) },
      palaceOpposite: { ...(fa.palaceOpposite || {}), ...(fb.palaceOpposite || {}) },
      patterns: [...new Set([...(fa.patterns || []), ...(fb.patterns || [])])],
    }
    for (const [star, places] of Object.entries(fb.starPalaces || {})) {
      citationFacts.starPalaces[star] = [
        ...new Set([...(citationFacts.starPalaces[star] || []), ...places]),
      ]
    }
    for (const sh of ['禄', '权', '科', '忌']) {
      const merged = [
        ...new Set([
          ...(fa.siHuaFall?.[sh] || []),
          ...(fb.siHuaFall?.[sh] || []),
          ...(flyFacts.aToBFall?.[sh] || []),
          ...(flyFacts.bToAFall?.[sh] || []),
        ]),
      ]
      if (merged.length) citationFacts.siHuaFall[sh] = merged
    }

    let crossCheckA = null
    let crossCheckB = null
    let crossBlock = ''
    try {
      const a = normalizeBirth(birthA)
      const b = normalizeBirth(birthB)
      if (a) {
        crossCheckA = crossCheckZiweiCalendar(a)
        crossBlock += `\n\n### 甲方历法旁证\n${formatCrossCheckForPrompt(crossCheckA)}`
      }
      if (b) {
        crossCheckB = crossCheckZiweiCalendar(b)
        crossBlock += `\n\n### 乙方历法旁证\n${formatCrossCheckForPrompt(crossCheckB)}`
      }
    } catch (e) {
      console.warn('heming cross-check skipped', e)
    }

    const apiKey = process.env.LLM_API_KEY
    const baseURL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
    const model = process.env.LLM_MODEL || 'deepseek-chat'

    const factBundle = `${matrixText}${crossBlock}`

    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      return Response.json({
        matrix,
        polished: false,
        crossCheckA: slimCross(crossCheckA),
        crossCheckB: slimCross(crossCheckB),
        result: normalizeMarkdown(`${factBundle}\n\n## 【缘分总评】\n\n请结合上方互飞、关键宫与历法旁证自行体会；配置 API Key 后可生成完整合盘解读。${MOCK_TAIL}`),
      })
    }

    const client = new OpenAI({ apiKey, baseURL })
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildHemingSystemPrompt() },
        {
          role: 'user',
          content: `${buildHemingUserPrompt(chartA, chartB, question)}\n\n${factBundle}\n\n请严格依据结构化互飞、宫位事实与历法旁证解读；旁证出现 sect_diff 时须说明日柱流派，勿编造未给出的星位。直接输出 Markdown，勿用代码围栏包裹。`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3072,
    })

    let result = completion.choices?.[0]?.message?.content
    let polished = true
    let citationWarning = null

    if (!result) {
      return Response.json({ error: '合盘分析暂不可用', matrix }, { status: 500 })
    }

    result = normalizeMarkdown(result)
    const risk = citationRiskScore(result, allowed, citationFacts)
    const fellBack = risk.score >= 4
    logAccuracyEvent({
      kind: 'citation',
      system: 'heming',
      score: risk.score,
      fallback: fellBack,
      detail: risk.unknown,
    })
    if (fellBack) {
      citationWarning = risk.unknown
      result = normalizeMarkdown(
        `${factBundle}\n\n## 【缘分总评】\n\n模型解读疑似引入未在双盘出现的词（${risk.unknown.join('、')}），已回退结构化事实。\n\n请以互飞矩阵、关键宫对照与历法旁证为准。`,
      )
      polished = false
    }

    return Response.json({
      result,
      matrix,
      polished,
      citationWarning,
      crossCheckA: slimCross(crossCheckA),
      crossCheckB: slimCross(crossCheckB),
    })
  } catch (err) {
    console.error('Heming error:', err)
    return Response.json(
      { error: err.message || '合盘失败' },
      { status: 500 },
    )
  }
}
