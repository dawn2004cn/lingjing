import type { DivinationAdapter, DivinationBuildInput, DivinationBuildResult } from '../types'
import {
  buildLiuyaoChart,
  buildLiuyaoRuleReading,
  collectLiuyaoAllowedTerms,
  formatLiuyaoForPrompt,
  type LiuyaoInput,
  type YaoValue,
} from '@/lib/liuyao/engine'

function parseYaoValues(input: DivinationBuildInput): YaoValue[] | undefined {
  if (Array.isArray(input.yaoValues) && input.yaoValues.length === 6) {
    return input.yaoValues as YaoValue[]
  }
  const text = typeof input.yaoText === 'string' ? input.yaoText.trim() : ''
  if (!text) return undefined
  const parts = text.split(/[\s,，、]+/).map((x) => Number(x))
  if (parts.length !== 6 || parts.some((n) => ![6, 7, 8, 9].includes(n))) return undefined
  return parts as YaoValue[]
}

export const liuyaoAdapter: DivinationAdapter = {
  meta: {
    id: 'liuyao',
    name: '易经六爻',
    category: 'zhanbu',
    blurb: '京氏八宫 · 纳甲六亲 · 日月建合冲 · 世应空亡',
    engine: 'lingjing-liuyao（自研纳甲，非 GPL）',
    defaultMethod: '时间（可复现伪随机）/ 铜钱 / 手动六爻',
    href: '/liuyao',
    available: true,
  },
  build(input: DivinationBuildInput): DivinationBuildResult {
    const yaoValues = parseYaoValues(input)
    const chart = buildLiuyaoChart({
      ...(input as LiuyaoInput),
      yaoValues,
      method: yaoValues ? 'manual' : ((input.method as LiuyaoInput['method']) || 'time'),
    })
    return {
      system: 'liuyao',
      chart,
      ruleReading: buildLiuyaoRuleReading(chart),
      promptText: formatLiuyaoForPrompt(chart),
      allowedTerms: [...collectLiuyaoAllowedTerms(chart)],
    }
  },
}
