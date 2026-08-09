import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  auditDaliurenIntegrity,
  buildDaliurenChart,
  buildDaliurenRuleReading,
  collectDaliurenAllowedTerms,
  formatDaliurenForPrompt,
  type DaliurenInput,
} from '@/lib/daliuren/engine'

export const daliurenAdapter: DivinationAdapter = {
  meta: {
    id: 'daliuren',
    name: '大六壬',
    category: 'zhanbu',
    blurb: '月将加时 · 四课三传 · 十二天将 · 须人工复核',
    engine: 'lingjing-daliuren（九宗门；边缘课体已分门）',
    defaultMethod: '昼贵/夜贵可切换',
    href: '/daliuren',
    available: true,
    requiresHumanReview: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const chart = buildDaliurenChart(input as DaliurenInput)
    return {
      system: 'daliuren',
      chart,
      ruleReading: buildDaliurenRuleReading(chart),
      promptText: formatDaliurenForPrompt(chart),
      allowedTerms: [...collectDaliurenAllowedTerms(chart)],
      integrity: auditDaliurenIntegrity(chart),
    }
  },
}
