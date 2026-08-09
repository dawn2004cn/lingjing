/**
 * 合盘辅助：从命盘提取关键宫位摘要，供 AI prompt 使用
 */

import type { ZiweiChart } from '@/lib/ziwei/types'
import { BRANCHES, STEMS } from '@/lib/ziwei/constants'
import {
  HEMING_METHODOLOGY,
  STAR_IN_FUQI_GU,
  SIHUA_IN_FUQI_GU,
} from '@/lib/ziwei/heming-knowledge'

function palaceLine(chart: ZiweiChart, name: string) {
  const p = chart.palaces.find((x) => x.name === name || x.name === name.replace('宫', ''))
    || chart.palaces.find((x) => x.name.includes(name.replace('宫', '')))
  if (!p) return `${name}：未知`
  const majors = p.stars.filter((s) => s.type === 'major')
    .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}`)
    .join('、') || '空宫'
  const stem = STEMS[p.stem] || ''
  const branch = BRANCHES[p.branch] || ''
  return `${p.name}（${stem}${branch}）：${majors}`
}

export function summarizeChartForHeming(label: string, chart: ZiweiChart): string {
  const g = chart.birthInfo.gender === 'male' ? '男' : '女'
  const ming = chart.palaces.find((p) => p.isMingGong)
  const mingStars = ming?.stars.filter((s) => s.type === 'major').map((s) => s.name) || []
  const fuqi = chart.palaces.find((p) => p.name.includes('夫妻'))
  const fuqiStar = fuqi?.stars.find((s) => s.type === 'major')?.name
  const fuqiNote = fuqiStar && STAR_IN_FUQI_GU[fuqiStar]
    ? `（参考：${STAR_IN_FUQI_GU[fuqiStar].summary}）`
    : ''

  return [
    `### ${label}`,
    `- 姓名：${chart.birthInfo.name || '未提供'}（${g}）`,
    `- 公历：${chart.birthInfo.year}-${chart.birthInfo.month}-${chart.birthInfo.day}`,
    `- 五行局：${chart.wuxingJuName}`,
    `- 命宫地支：${BRANCHES[chart.mingGongBranch]} · 身宫：${BRANCHES[chart.shenGongBranch]}`,
    `- 命宫主星：${mingStars.join('、') || '空'}`,
    palaceLine(chart, '命宫'),
    palaceLine(chart, '夫妻'),
    palaceLine(chart, '福德'),
    palaceLine(chart, '官禄'),
    palaceLine(chart, '财帛'),
    palaceLine(chart, '交友') || palaceLine(chart, '仆役'),
    fuqiNote ? `- 夫妻宫提示${fuqiNote}` : '',
  ].filter(Boolean).join('\n')
}

export function buildHemingSystemPrompt(): string {
  return `你是精通紫微斗数合盘的命理师，严格遵循倪海夏《天纪》体系。
必须同时看双方的命宫、夫妻宫、福德宫，不可只看夫妻宫。

请输出 Markdown，结构建议：
1. 【缘分总评】匹配度与一句话结论
2. 【命格互参】双方命宫气质是否互补
3. 【夫妻与福德】双宫联参
4. 【相处建议】温和可执行的建议
5. 【婚期/合作提示】（若用户提问则侧重回答）

语气客观、温和，拒绝恐吓。严禁编造未给出的星位。

参考方法论摘录：
${HEMING_METHODOLOGY.slice(0, 3500)}

四化在夫妻宫简表：
${Object.entries(SIHUA_IN_FUQI_GU).map(([k, v]) => `- ${k}：${v}`).join('\n')}
`
}

export function buildHemingUserPrompt(
  chartA: ZiweiChart,
  chartB: ZiweiChart,
  question?: string,
): string {
  return [
    '请对下列双方命盘做合盘分析。',
    summarizeChartForHeming('甲方', chartA),
    '',
    summarizeChartForHeming('乙方', chartB),
    question ? `\n用户追问：${question}` : '',
  ].join('\n')
}
