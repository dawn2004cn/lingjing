import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildJinkouChart,
  buildJinkouRuleReading,
  collectJinkouAllowedTerms,
  formatJinkouForPrompt,
  type JinkouInput,
} from '@/lib/jinkou/engine'

export const jinkouAdapter: DivinationAdapter = {
  meta: {
    id: 'jinkou',
    name: '金口诀',
    category: 'zhanbu',
    blurb: '人元·贵神·将神·地分 · 六壬简式',
    engine: 'lingjing-jinkou；完整法见 py-engine/kinjinkou',
    defaultMethod: '月将加时 + 地分四位',
    href: '/jinkou',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildJinkouChart(input as JinkouInput)
    return {
      system: 'jinkou',
      chart,
      ruleReading: buildJinkouRuleReading(chart),
      promptText: formatJinkouForPrompt(chart),
      allowedTerms: [...collectJinkouAllowedTerms(chart)],
      integrity: {
        status: 'ok',
        summary: '金口诀四位结构完整',
      },
    }
  },
}
