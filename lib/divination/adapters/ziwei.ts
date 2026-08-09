import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildChartWithPatterns,
  formatChartForPrompt,
  type FormBirthInput,
} from '@/lib/ziwei'
import { buildZiweiRuleReading, collectZiweiAllowedTerms } from '@/lib/ziwei/rule-reading'
import {
  auditZiweiChartIntegrity,
  formatZiweiIntegrityForPrompt,
} from '@/lib/astro/ziwei-integrity'

export const ziweiAdapter: DivinationAdapter = {
  meta: {
    id: 'ziwei',
    name: '紫微斗数',
    category: 'mingli',
    blurb: '十二宫命盘 · 格局 · 大限流年',
    engine: 'iztro + 十四主星完整性旁证',
    defaultMethod: '早子=0 / 晚子=12；历法旁证共用日柱流派',
    href: '/',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const birth = input as unknown as FormBirthInput
    const { chart, patterns, trueSolar, timeIndex } = buildChartWithPatterns(birth)
    let ruleReading = buildZiweiRuleReading(chart, patterns)
    let promptText = formatChartForPrompt(chart, patterns, { trueSolar, timeIndex })
    const integrity = auditZiweiChartIntegrity(chart, {
      expectSolar: chart.birthInfo
        ? { year: chart.birthInfo.year, month: chart.birthInfo.month, day: chart.birthInfo.day }
        : undefined,
    })
    const integText = formatZiweiIntegrityForPrompt(integrity)
    ruleReading += `\n\n${integText}`
    promptText += `\n\n${integText}`
    return {
      system: 'ziwei',
      chart: { chart, patterns, trueSolar, timeIndex },
      ruleReading,
      promptText,
      allowedTerms: [...collectZiweiAllowedTerms(chart, patterns)],
      integrity,
    }
  },
}
