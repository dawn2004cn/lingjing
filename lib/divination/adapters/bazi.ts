import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import { buildBaziChart, formatBaziForPrompt, type BaziFormInput } from '@/lib/bazi/engine'
import { buildBaziRuleReading, collectBaziAllowedTerms } from '@/lib/bazi/rule-reading'
import { detectZipingPatterns, formatZipingForPrompt } from '@/lib/bazi/ziping'

export const baziAdapter: DivinationAdapter = {
  meta: {
    id: 'bazi',
    name: '子平八字',
    category: 'mingli',
    blurb: '四柱命理 · 格局用神 · 大运流年',
    engine: 'lunar-javascript + tyme4ts 旁证 + 自研子平格局',
    defaultMethod: '日柱流派2（23:00 不跨日）',
    href: '/',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const birth = input as unknown as BaziFormInput
    const chart = buildBaziChart(birth)
    const patterns = detectZipingPatterns(chart)
    let ruleReading = buildBaziRuleReading(chart)
    ruleReading += `\n\n${formatZipingForPrompt(patterns)}`
    let promptText = formatBaziForPrompt(chart)
    promptText += `\n\n${formatZipingForPrompt(patterns)}`
    const allowed = [...collectBaziAllowedTerms(chart)]
    patterns.forEach((p) => allowed.push(p.name))
    return {
      system: 'bazi',
      chart: { ...chart, zipingPatterns: patterns },
      ruleReading,
      promptText,
      allowedTerms: allowed,
      meta: { zipingPatterns: patterns.map((p) => p.name) },
    }
  },
}
