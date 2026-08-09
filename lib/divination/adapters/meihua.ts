import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildMeihuaChart,
  buildMeihuaRuleReading,
  collectMeihuaAllowedTerms,
  formatMeihuaForPrompt,
  type MeihuaInput,
} from '@/lib/meihua/engine'

export const meihuaAdapter: DivinationAdapter = {
  meta: {
    id: 'meihua',
    name: '梅花易数',
    category: 'zhanbu',
    blurb: '时间/数字/笔画起卦 · 本互变 · 体用五行',
    engine: 'lingjing-meihua（自研）+ lunar-javascript',
    defaultMethod: '时间 / 数字 / 汉字笔画',
    href: '/meihua',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildMeihuaChart(input as MeihuaInput)
    return {
      system: 'meihua',
      chart,
      ruleReading: buildMeihuaRuleReading(chart),
      promptText: formatMeihuaForPrompt(chart),
      allowedTerms: [...collectMeihuaAllowedTerms(chart)],
    }
  },
}
