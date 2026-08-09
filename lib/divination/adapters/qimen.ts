import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  auditQimenIntegrity,
  buildQimenChart,
  buildQimenRuleReading,
  collectQimenAllowedTerms,
  formatQimenForPrompt,
  type QimenInput,
} from '@/lib/qimen/engine'
import { attachQimenWitness } from '@/lib/qimen/witness'

export const qimenAdapter: DivinationAdapter = {
  meta: {
    id: 'qimen',
    name: '奇门遁甲',
    category: 'zhanbu',
    blurb: '时家拆补 · 值符值使 · MIT 旁证 · 须人工复核',
    engine: 'lingjing-qimen-chaibu + qimendunjia-standalone 旁证',
    defaultMethod: '时家拆补法',
    href: '/qimen',
    available: true,
    requiresHumanReview: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    let chart = buildQimenChart(input as QimenInput)
    const date = typeof input.date === 'string' ? input.date : new Date().toISOString().slice(0, 10)
    const clock = typeof input.clock === 'string' ? input.clock : '12:00'
    chart = attachQimenWitness(chart, date, clock)
    const integrity = auditQimenIntegrity(chart)
    if (chart.witness?.status === 'ok') {
      integrity.summary = `${integrity.summary}；旁证 ${chart.witness.summary}`
    } else if (chart.witness) {
      integrity.status = integrity.status === 'fail' ? 'fail' : 'warn'
      integrity.summary = `${integrity.summary}；${chart.witness.summary}`
    }
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
