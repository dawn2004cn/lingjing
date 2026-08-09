import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildTiebanChart,
  buildTiebanRuleReading,
  collectTiebanAllowedTerms,
  formatTiebanForPrompt,
  type TiebanInput,
} from '@/lib/tieban/engine'

export const tiebanAdapter: DivinationAdapter = {
  meta: {
    id: 'tieban',
    name: '铁版神数',
    category: 'research',
    blurb: '结构排盘演示 · 条文库需授权',
    engine: 'lingjing-tieban-structure（无商业条文）',
    defaultMethod: '四柱 → 本命数/考刻/辟卦',
    href: '/tieban',
    available: true,
    researchOnly: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildTiebanChart(input as unknown as TiebanInput)
    return {
      system: 'tieban',
      chart,
      ruleReading: buildTiebanRuleReading(chart),
      promptText: formatTiebanForPrompt(chart),
      allowedTerms: [...collectTiebanAllowedTerms(chart)],
    }
  },
}
