import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildTaiyiChart,
  buildTaiyiRuleReading,
  collectTaiyiAllowedTerms,
  formatTaiyiForPrompt,
  type TaiyiInput,
} from '@/lib/taiyi/engine'

export const taiyiAdapter: DivinationAdapter = {
  meta: {
    id: 'taiyi',
    name: '太乙神数',
    category: 'research',
    blurb: '积年起局 · 十六神将（研究/宏观）',
    engine: 'lingjing-taiyi-lite；完整法见 py-engine/kintaiyi',
    defaultMethod: '年计（可切换月日时）',
    href: '/taiyi',
    available: true,
    researchOnly: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildTaiyiChart(input as TaiyiInput)
    return {
      system: 'taiyi',
      chart,
      ruleReading: buildTaiyiRuleReading(chart),
      promptText: formatTaiyiForPrompt(chart),
      allowedTerms: [...collectTaiyiAllowedTerms(chart)],
    }
  },
}
