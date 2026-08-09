import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildXiaoliurenChart,
  buildXiaoliurenRuleReading,
  collectXiaoliurenAllowedTerms,
  formatXiaoliurenForPrompt,
  type XiaoliurenInput,
} from '@/lib/xiaoliuren/engine'

export const xiaoliurenAdapter: DivinationAdapter = {
  meta: {
    id: 'xiaoliuren',
    name: '小六壬',
    category: 'zhanbu',
    blurb: '月日时三宫 · 六神歌诀',
    engine: 'lingjing-xiaoliuren（自研）',
    defaultMethod: '农历月日时顺推',
    href: '/xiaoliuren',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildXiaoliurenChart(input as XiaoliurenInput)
    return {
      system: 'xiaoliuren',
      chart,
      ruleReading: buildXiaoliurenRuleReading(chart),
      promptText: formatXiaoliurenForPrompt(chart),
      allowedTerms: [...collectXiaoliurenAllowedTerms(chart)],
    }
  },
}
