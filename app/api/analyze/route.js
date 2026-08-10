import OpenAI from 'openai'
import {
  buildChartWithPatterns,
  formatChartForPrompt,
} from '@/lib/ziwei'
import { buildZiweiRuleReading, collectZiweiAllowedTerms } from '@/lib/ziwei/rule-reading'
import { buildBaziChart, formatBaziForPrompt } from '@/lib/bazi/engine'
import { buildBaziRuleReading, collectBaziAllowedTerms } from '@/lib/bazi/rule-reading'
import { detectZipingPatterns, formatZipingForPrompt } from '@/lib/bazi/ziping'
import { citationRiskScore, buildZiweiCitationFacts, buildBaziCitationFacts } from '@/lib/astro/citation-guard'
import { normalizeMarkdown } from '@/lib/markdown/normalize'
import { buildDualBoundary, formatDualForPrompt } from '@/lib/astro/dual-boundary'
import {
  crossCheckBaziChart,
  crossCheckZiweiCalendar,
  formatCrossCheckForPrompt,
} from '@/lib/astro/cross-engine'
import { probeJieQiFromChart, formatJieQiForPrompt } from '@/lib/astro/jieqi-boundary'
import {
  auditZiweiChartIntegrity,
  formatZiweiIntegrityForPrompt,
} from '@/lib/astro/ziwei-integrity'
import { logAccuracyEvent } from '@/lib/astro/accuracy-events'
import { getAuthUser } from '@/lib/auth'
import { canUseLlm, consumeLlmQuota } from '@/lib/plan'

const POLISH_SYSTEM = `你是命理文案润色助手。
用户会给出【算法已生成的规则事实解读】。
你的任务：在不改动任何星曜、宫位、干支、格局、大运数据的前提下，润色成更易读的 Markdown。
禁止：新增盘面中不存在的星名/干支；改写四柱或命宫主星；恐吓式断言。
可以：调整段落结构、语气、小标题；补充温和的生活化建议（不伪装成盘面事实）。
格式要求：直接输出 Markdown 正文；不要用 \`\`\`markdown 代码围栏包裹；标题用 ## / ###；列表与表格遵循 GFM。`

function pickBirthFields(body) {
  const daySectRaw = Number(body.daySect)
  return {
    name: body.name,
    gender: body.gender,
    calendarType: body.calendarType,
    birthDate: body.birthDate,
    birthHour: body.birthHour || '',
    birthClock: body.birthClock || '',
    isLeapMonth: !!body.isLeapMonth,
    lateZi: !!body.lateZi,
    useTrueSolar: !!body.useTrueSolar,
    province: body.province || '',
    city: body.city || '',
    longitude: body.longitude,
    daySect: daySectRaw === 1 ? 1 : 2,
    ziweiSchool: body.ziweiSchool === 'feixing' ? 'feixing' : 'ni',
  }
}

function formatHistoryBlock(history) {
  if (!Array.isArray(history) || !history.length) return ''
  const lines = history
    .slice(-6)
    .map((t, i) => {
      const q = typeof t?.question === 'string' ? t.question.trim() : ''
      const a = typeof t?.answer === 'string' ? t.answer.trim() : ''
      if (!q) return ''
      return `### 第${i + 1}轮\n问：${q}\n答：${a || '（无）'}`
    })
    .filter(Boolean)
  if (!lines.length) return ''
  return `\n\n--- 此前追问（供连贯，不得改写盘面） ---\n${lines.join('\n\n')}\n---`
}

function baziChartMeta(chart) {
  return {
    pillars: {
      year: chart.pillars.year.ganZhi,
      month: chart.pillars.month.ganZhi,
      day: chart.pillars.day.ganZhi,
      time: chart.pillars.time.ganZhi,
    },
    dayMaster: chart.dayMaster,
    wuXing: chart.wuXing,
    timeIndex: chart.timeIndex,
    yongShen: chart.yongShen
      ? {
          strength: chart.yongShen.strength,
          xiYong: chart.yongShen.xiYong,
          jiShen: chart.yongShen.jiShen,
          note: chart.yongShen.note,
        }
      : null,
    daYun: (chart.daYun || [])
      .filter((d) => d.ganZhi)
      .slice(0, 8)
      .map((d) => ({
        ganZhi: d.ganZhi,
        startAge: d.startAge,
        startYear: d.startYear,
      })),
    yunStart: chart.yunStart || null,
    trueSolar: chart.trueSolar
      ? {
          totalCorrectionMin: chart.trueSolar.totalCorrectionMin,
          changedTimeIndex: chart.trueSolar.changedTimeIndex,
          changedDate: chart.trueSolar.changedDate,
          label: chart.trueSolar.label,
          originalTimeIndex: chart.trueSolar.originalTimeIndex,
        }
      : null,
    daySect: chart.daySect || null,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const birth = pickBirthFields(body)
    const systemType = body.system || 'bazi'
    const clientChartText = body.chartText

    if (!birth.name || !birth.birthDate || (!birth.birthHour && !birth.birthClock)) {
      return Response.json(
        { error: '请完整填写姓名、出生日期和出生时辰（或精确钟点）' },
        { status: 400 },
      )
    }
    if (birth.useTrueSolar && !birth.birthClock) {
      return Response.json(
        { error: '开启真太阳时时请填写精确钟点（HH:MM）' },
        { status: 400 },
      )
    }
    if (birth.useTrueSolar && !birth.longitude && (!birth.province || !birth.city)) {
      return Response.json(
        { error: '开启真太阳时时请选择出生省市' },
        { status: 400 },
      )
    }

    const isZiwei = systemType === 'ziwei'
    const apiKey = process.env.LLM_API_KEY
    const baseURL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
    const model = process.env.LLM_MODEL || 'deepseek-chat'

    let chartPayload = null
    let chartText = clientChartText
    let ruleReading = ''
    let allowed = new Set()
    let baziChart = null
    let dualBoundary = null
    let crossCheck = null
    let jieQiBoundary = null
    let integrity = null
    let citationFacts = null

    const dual = buildDualBoundary(birth, isZiwei ? 'ziwei' : 'bazi')
    if (dual) {
      dualBoundary = {
        applicable: !!dual.applicable,
        probe: dual.probe,
        ziwei: dual.ziwei ? { diff: dual.ziwei.diff } : undefined,
        bazi: dual.bazi
          ? {
              pillarsChanged: dual.bazi.pillarsChanged,
              snapA: dual.bazi.snapA,
              snapB: dual.bazi.snapB,
            }
          : undefined,
      }
    }

    if (isZiwei) {
      const school = birth.ziweiSchool === 'feixing' ? 'feixing' : 'ni'
      const { chart, patterns, trueSolar, timeIndex } = buildChartWithPatterns(birth)
      if (!chartText) {
        chartText = formatChartForPrompt(chart, patterns, { trueSolar, timeIndex })
      }
      ruleReading = buildZiweiRuleReading(chart, patterns, { school })
      citationFacts = buildZiweiCitationFacts(chart)
      if (dual?.applicable) {
        const dualText = formatDualForPrompt(dual)
        ruleReading += `\n\n${dualText}`
        chartText += `\n\n${dualText}`
      }
      allowed = collectZiweiAllowedTerms(chart, patterns)
      crossCheck = crossCheckZiweiCalendar(birth)
      ruleReading += `\n\n${formatCrossCheckForPrompt(crossCheck)}`
      chartText += `\n\n${formatCrossCheckForPrompt(crossCheck)}`
      integrity = auditZiweiChartIntegrity(chart, {
        expectSolar: chart.birthInfo
          ? { year: chart.birthInfo.year, month: chart.birthInfo.month, day: chart.birthInfo.day }
          : undefined,
      })
      const integText = formatZiweiIntegrityForPrompt(integrity)
      ruleReading += `\n\n${integText}`
      chartText += `\n\n${integText}`
      chartPayload = {
        mingGongBranch: chart.mingGongBranch,
        shenGongBranch: chart.shenGongBranch,
        wuxingJuName: chart.wuxingJuName,
        patterns: patterns.slice(0, 8).map((p) => p.name),
        timeIndex,
        ziweiSchool: school,
        trueSolar: trueSolar
          ? {
              totalCorrectionMin: trueSolar.totalCorrectionMin,
              changedTimeIndex: trueSolar.changedTimeIndex,
              changedDate: trueSolar.changedDate,
              label: trueSolar.label,
              eotMethod: trueSolar.eotMethod,
            }
          : null,
      }
    } else {
      baziChart = buildBaziChart(birth)
      chartText = formatBaziForPrompt(baziChart)
      ruleReading = buildBaziRuleReading(baziChart)
      citationFacts = buildBaziCitationFacts(baziChart)
      const ziping = detectZipingPatterns(baziChart)
      const zipText = formatZipingForPrompt(ziping)
      ruleReading += `\n\n${zipText}`
      chartText += `\n\n${zipText}`
      if (dual?.applicable) {
        const dualText = formatDualForPrompt(dual)
        ruleReading += `\n\n${dualText}`
        chartText += `\n\n${dualText}`
      }
      allowed = collectBaziAllowedTerms(baziChart)
      ziping.forEach((p) => allowed.add(p.name))
      chartPayload = { ...baziChartMeta(baziChart), zipingPatterns: ziping.map((p) => p.name) }
      crossCheck = crossCheckBaziChart(baziChart)
      ruleReading += `\n\n${formatCrossCheckForPrompt(crossCheck)}`
      chartText += `\n\n${formatCrossCheckForPrompt(crossCheck)}`
      jieQiBoundary = probeJieQiFromChart(baziChart, birth)
      if (jieQiBoundary?.nearBoundary) {
        const jqText = formatJieQiForPrompt(jieQiBoundary)
        if (jqText) {
          ruleReading += `\n\n${jqText}`
          chartText += `\n\n${jqText}`
        }
      }
    }

    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const historyBlock = formatHistoryBlock(body.history)
    const followUpOnly = !!question

    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      const stubAnswer = question
        ? `关于「${question}」：请对照规则事实自行研判；配置 API Key 后可生成针对性多轮回答。`
        : ''
      const normalized = normalizeMarkdown(question ? stubAnswer : ruleReading)
      return Response.json({
        result: normalized,
        ruleReading: normalizeMarkdown(ruleReading),
        polished: false,
        followUp: followUpOnly,
        answer: followUpOnly ? normalized : undefined,
        system: isZiwei ? 'ziwei' : 'bazi',
        chartMeta: chartPayload,
        dualBoundary,
        crossCheck,
        jieQiBoundary,
        integrity,
      })
    }

    const authUser = getAuthUser()
    const gate = canUseLlm(authUser)
    if (!gate.ok) {
      const normalized = normalizeMarkdown(
        followUpOnly
          ? `关于「${question}」：${gate.error}`
          : `${ruleReading}\n\n---\n\n> ${gate.error}`,
      )
      return Response.json({
        result: followUpOnly ? normalized : normalizeMarkdown(ruleReading),
        ruleReading: normalizeMarkdown(ruleReading),
        polished: false,
        followUp: followUpOnly,
        answer: followUpOnly ? normalized : undefined,
        quotaWarning: gate.error,
        quota: gate.quota || null,
        system: isZiwei ? 'ziwei' : 'bazi',
        chartMeta: chartPayload,
        dualBoundary,
        crossCheck,
        jieQiBoundary,
        integrity,
      })
    }

    const userPrompt = question
      ? `请严格依据下列规则事实与结构化盘面，回答用户本轮追问：「${question}」。
只输出本轮回答（Markdown），不要重复整篇规则解读；可简短引用先前追问结论以保持连贯。
不得编造盘面中不存在的星曜/干支/格局；若事实不足请明确说明。
${historyBlock}

--- 规则解读 ---
${ruleReading}

--- 结构化盘面（核对用） ---
${chartText}
---`
      : `请润色下列规则解读（不得改动事实数据）。

--- 规则解读 ---
${ruleReading}

--- 结构化盘面（核对用） ---
${chartText}
---`

    const client = new OpenAI({ apiKey, baseURL })
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: POLISH_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.55,
      max_tokens: followUpOnly ? 1536 : isZiwei ? 3072 : 2048,
    })

    let result = completion.choices?.[0]?.message?.content
    let polished = true
    let citationWarning = null

    if (!result) {
      result = followUpOnly
        ? `关于「${question}」：模型无返回，请对照规则事实自行研判。`
        : ruleReading
      polished = false
    } else {
      result = normalizeMarkdown(result)
      const risk = citationRiskScore(result, allowed, citationFacts)
      const fellBack = risk.score >= 3
      logAccuracyEvent({
        kind: 'citation',
        system: isZiwei ? 'ziwei' : 'bazi',
        score: risk.score,
        fallback: fellBack,
        detail: risk.unknown,
      })
      if (fellBack) {
        citationWarning = risk.unknown
        result = followUpOnly
          ? `> 注：本轮回答疑似引入未在盘面出现的词（${risk.unknown.join('、')}），已回退提示。请对照规则事实自行研判「${question}」。`
          : `${normalizeMarkdown(ruleReading)}\n\n---\n\n> 注：模型润色疑似引入未在盘面出现的词（${risk.unknown.join('、')}），已回退规则解读。`
        polished = false
      }
    }

    const quotaAfter = consumeLlmQuota(
      authUser.id,
      followUpOnly ? 'followup' : 'polish',
      isZiwei ? 'ziwei' : 'bazi',
    )

    return Response.json({
      result: normalizeMarkdown(result),
      ruleReading: normalizeMarkdown(ruleReading),
      polished,
      citationWarning,
      followUp: followUpOnly,
      answer: followUpOnly ? normalizeMarkdown(result) : undefined,
      quota: quotaAfter,
      system: isZiwei ? 'ziwei' : 'bazi',
      chartMeta: chartPayload,
      dualBoundary,
      crossCheck,
      jieQiBoundary,
      integrity,
    })
  } catch (err) {
    console.error('API Error:', err)
    return Response.json(
      { error: err.message || '服务器开小差了，请稍后重试' },
      { status: 500 },
    )
  }
}
