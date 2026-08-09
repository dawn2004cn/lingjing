import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildHuangjiChart,
  buildHuangjiRuleReading,
  collectHuangjiAllowedTerms,
  formatHuangjiForPrompt,
  type HuangjiInput,
} from '@/lib/huangji/engine'

export const huangjiAdapter: DivinationAdapter = {
  meta: {
    id: 'huangji',
    name: '皇极经世',
    category: 'research',
    blurb: '元会运世 · 宏观气运定位',
    engine: 'lingjing-huangji；完整卦链见 py-engine/kinwangji',
    defaultMethod: '公元年 → 元会运世',
    href: '/huangji',
    available: true,
    researchOnly: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildHuangjiChart(input as HuangjiInput)
    return {
      system: 'huangji',
      chart,
      ruleReading: buildHuangjiRuleReading(chart),
      promptText: formatHuangjiForPrompt(chart),
      allowedTerms: [...collectHuangjiAllowedTerms(chart)],
    }
  },
}
