import { getAdapter, isValidSystemId, listSystems } from '@/lib/divination/registry'
import { enrichWithPyEngine, formatSidecarMarkdown, compareDaliurenSidecar, compareJinkouSidecar } from '@/lib/divination/py-engine-client'
import OpenAI from 'openai'
import { citationRiskScore } from '@/lib/astro/citation-guard'
import { normalizeMarkdown } from '@/lib/markdown/normalize'
import { logAccuracyEvent } from '@/lib/astro/accuracy-events'

export async function GET() {
  return Response.json({ systems: listSystems() })
}

export async function POST(request, context) {
  try {
    const params = await context.params
    const system = params?.system
    if (!isValidSystemId(system)) {
      return Response.json({ error: `未知术数系统：${system}` }, { status: 400 })
    }
    const adapter = getAdapter(system)
    if (!adapter?.meta.available) {
      return Response.json({ error: '该系统暂未开放排盘' }, { status: 503 })
    }

    const body = await request.json()
    const polish = !!body.polish
    const built = adapter.build(body)

    // 可选 Python sidecar：太乙/皇极/奇门/大六壬（未配置则跳过）
    if (['taiyi', 'huangji', 'qimen', 'daliuren', 'jinkou'].includes(system)) {
      const enrich = await enrichWithPyEngine(system, built.chart || {}, body)
      if (enrich) {
        built.meta = { ...(built.meta || {}), pyEngine: enrich.sidecar, pyNote: enrich.note }
        const sidecarOk = enrich.sidecar && typeof enrich.sidecar === 'object' && enrich.sidecar.ok
        if (built.integrity) {
          built.integrity = {
            ...built.integrity,
            summary: `${built.integrity.summary}；${enrich.note}`,
          }
        } else {
          built.integrity = {
            status: sidecarOk ? 'ok' : 'warn',
            summary: enrich.note,
          }
        }
        // 保证旁证段落进入用户可见输出
        const compareLines =
          system === 'daliuren' && enrich.sidecar && typeof enrich.sidecar === 'object'
            ? enrich.sidecar.compare?.lines ||
              compareDaliurenSidecar(built.chart || {}, enrich.sidecar).lines
            : system === 'jinkou' && enrich.sidecar && typeof enrich.sidecar === 'object'
              ? enrich.sidecar.compare?.lines ||
                compareJinkouSidecar(built.chart || {}, enrich.sidecar).lines
              : undefined
        const appendix = formatSidecarMarkdown(enrich.note, enrich.sidecar, compareLines)
        built.ruleReading = `${built.ruleReading}${appendix}`
        built.promptText = `${built.promptText}${appendix}`
      }
    }

    if (!polish) {
      return Response.json({
        ...built,
        polished: false,
        result: normalizeMarkdown(built.ruleReading),
      })
    }

    const apiKey = process.env.LLM_API_KEY
    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      return Response.json({
        ...built,
        polished: false,
        result: normalizeMarkdown(built.ruleReading),
      })
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
    })
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            '你是命理/占卜文案润色助手。只润色规则事实，禁止编造盘面中不存在的术语、卦名、干支、神将。直接输出 Markdown。',
        },
        {
          role: 'user',
          content: question
            ? `请依据下列规则事实回答追问「${question}」。\n\n${built.ruleReading}\n\n---\n${built.promptText}`
            : `请润色下列规则解读（不得改动事实）。\n\n${built.ruleReading}`,
        },
      ],
      temperature: 0.55,
      max_tokens: 2560,
    })

    let result = completion.choices?.[0]?.message?.content
    let polished = true
    let citationWarning = null
    if (!result) {
      result = built.ruleReading
      polished = false
    } else {
      result = normalizeMarkdown(result)
      const risk = citationRiskScore(result, new Set(built.allowedTerms))
      logAccuracyEvent({
        kind: 'citation',
        system,
        score: risk.score,
        fallback: risk.score >= 3,
        detail: risk.unknown,
      })
      if (risk.score >= 3) {
        citationWarning = risk.unknown
        result = `${normalizeMarkdown(built.ruleReading)}\n\n---\n\n> 注：润色疑似引入未在盘面出现的词，已回退规则解读。`
        polished = false
      }
    }

    return Response.json({
      ...built,
      polished,
      citationWarning,
      result: normalizeMarkdown(result),
    })
  } catch (err) {
    console.error('divination error', err)
    return Response.json({ error: err.message || '排盘失败' }, { status: 500 })
  }
}
