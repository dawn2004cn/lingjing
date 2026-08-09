import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildLiuyaoChart,
  buildLiuyaoRuleReading,
  collectLiuyaoAllowedTerms,
  formatLiuyaoForPrompt,
  type LiuyaoInput,
} from '@/lib/liuyao/engine'

export const liuyaoAdapter: DivinationAdapter = {
  meta: {
    id: 'liuyao',
    name: '易经六爻',
    category: 'zhanbu',
    blurb: '纳甲排盘 · 六亲六兽 · 世应动爻',
    engine: 'lingjing-liuyao（自研纳甲，非 GPL）',
    defaultMethod: '时间起卦 / 铜钱 / 手动',
    href: '/liuyao',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildLiuyaoChart(input as LiuyaoInput)
    return {
      system: 'liuyao',
      chart,
      ruleReading: buildLiuyaoRuleReading(chart),
      promptText: formatLiuyaoForPrompt(chart),
      allowedTerms: [...collectLiuyaoAllowedTerms(chart)],
    }
  },
}
