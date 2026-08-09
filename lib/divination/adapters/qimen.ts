import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  auditQimenIntegrity,
  buildQimenChart,
  buildQimenRuleReading,
  collectQimenAllowedTerms,
  formatQimenForPrompt,
  type QimenInput,
} from '@/lib/qimen/engine'

export const qimenAdapter: DivinationAdapter = {
  meta: {
    id: 'qimen',
    name: '奇门遁甲',
    category: 'zhanbu',
    blurb: '时家拆补 · 九宫神星门干',
    engine: 'lingjing-qimen-chaibu（自研；可旁证 3meta）',
    defaultMethod: '时家拆补法',
    href: '/qimen',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildQimenChart(input as QimenInput)
    const integrity = auditQimenIntegrity(chart)
    return {
      system: 'qimen',
      chart,
      ruleReading: buildQimenRuleReading(chart),
      promptText: formatQimenForPrompt(chart),
      allowedTerms: [...collectQimenAllowedTerms(chart)],
      integrity,
    }
  },
}
