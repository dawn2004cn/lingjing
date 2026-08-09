/**
 * 开源命理百科内容库
 * 参考 ziwei-doushu 的百科框架；详细论断 STAR_DB 未开源，
 * 此处基于星曜简介、合盘知识库与十二宫通用义理自行整理。
 */

import { STAR_IN_FUQI_GU, SIHUA_IN_FUQI_GU } from '@/lib/ziwei/heming-knowledge'

type StarFields = Partial<Record<
  | 'mingGong'
  | 'personality'
  | 'xiongDi'
  | 'fuQi'
  | 'ziNv'
  | 'caiBo'
  | 'jiE'
  | 'qianYi'
  | 'jiaoYou'
  | 'guanLu'
  | 'tianZhai'
  | 'fuDe'
  | 'fuMu',
  string
>>

function section(dingdiao: string, lundian: string, yiju: string, chuchu: string) {
  return [
    `**【一句话定调】**`,
    dingdiao,
    ``,
    `**【核心论断】**`,
    lundian,
    ``,
    `**【命盘依据】**`,
    yiju,
    ``,
    `**【经典出处】**`,
    chuchu,
  ].join('\n')
}

const PALACE_HINTS: Record<string, string> = {
  career: '官禄宫主事业、志向与社会角色，宜看主星庙旺、四化与三方吉煞。',
  wealth: '财帛宫主财源与理财倾向，常与官禄、田宅互参。',
  health: '疾厄宫主体质与作息节律，重在提示而非恐吓。',
  family: '兄弟宫（含合伙）主手足与合作关系，忌巨门化忌冲。',
  children: '子女宫主子女缘与创作成果，可兼看桃花杂曜。',
  move: '迁移宫主外出、变动与外部环境机遇。',
  friends: '交友/仆役宫主人际与部属，合伙尤忌化忌互冲。',
  home: '田宅宫主房产、家业与安居感。',
  spirit: '福德宫主精神满足与婚姻深层维系，合盘必参。',
  parents: '父母宫主长辈缘与早年教养影响。',
}

const ALL = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府',
  '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
] as const

const STAR_BRIEF: Record<string, string> = {
  '紫微': '紫微为帝星，主尊贵，化气为尊。落命主有领导气场、宜大平台高位。',
  '天机': '天机为智慧星，主善变机灵，化气为善。落命主聪明机变、宜辅佐策划。',
  '太阳': '太阳为男贵星，主名誉公务，化气为贵。落命主光明磊落、宜公职名声。',
  '武曲': '武曲为财星，主刚毅果决，化气为财。落命主理财能力强、宜实业金融。',
  '天同': '天同为福星，主温和享乐，化气为福。落命主性情温和、有福气。',
  '廉贞': '廉贞为次桃花星，文武兼备，化气为囚。落命主多才多艺、感情丰富。',
  '天府': '天府为南帝守财星，主稳重保守，化气为令。落命主品行端正、善守财库。',
  '太阴': '太阴为月亮富贵星，主田宅富贵，化气为富。落命主感情细腻、女命最吉。',
  '贪狼': '贪狼为桃花欲望星，多才多社交，化气为桃花。落命主多才艺、社交广。',
  '巨门': '巨门为是非口才星，主辩论传媒，化气为暗。落命主口才好、宜律师教师。',
  '天相': '天相为印星辅佐，主忠厚老实，化气为印。落命主品行端正、宜行政法务。',
  '天梁': '天梁为老人星荫星，善逢凶化吉，化气为荫。落命主慈悲善良、宜法律医学。',
  '七杀': '七杀为将星，主孤独果决冒险，化气为肃杀。落命主刚毅果决、宜军警创业。',
  '破军': '破军为破坏创新星，主六亲缘薄，化气为耗。落命主开创变动、宜技术专长。',
}

function buildStarEntry(star: string): StarFields {
  const brief = STAR_BRIEF[star] || `${star}为十四主星之一。`
  const fuqi = STAR_IN_FUQI_GU[star]

  const entry: StarFields = {
    mingGong: section(
      brief,
      `${star}入命，定一生格局气质。宜结合庙旺利陷、辅弼昌曲与三方四正会照综合判断，不可单星论断。`,
      `看命宫主星、亮度、四化，以及财帛、官禄、迁移三方会照。`,
      `《骨髓赋》：看命之要，先看命宫。命宫主星定其格局，三方四正定其用武。`,
    ),
    personality: section(
      `${star}气质主导性情偏好。`,
      brief,
      `命宫主星 + 福德宫互参，辅星（昌曲魁钺辅弼）可修饰性格层次。`,
      `倪海夏《天纪》：星性示势，心性定局；知命不执。`,
    ),
  }

  if (fuqi) {
    entry.fuQi = section(
      fuqi.summary,
      `吉象：${fuqi.good}\n\n注意事项：${fuqi.bad}\n\n配偶倾向：${fuqi.spouse_traits}\n\n婚期：${fuqi.timing}${fuqi.ni_quote ? `\n\n倪师：${fuqi.ni_quote}` : ''}`,
      `夫妻宫主星为${star}时，必同时看福德宫与四化（${Object.entries(SIHUA_IN_FUQI_GU).map(([k, v]) => `${k}：${v}`).join('；')}）。`,
      `《紫微斗数全书》夫妻宫论 + 倪海夏《天纪》双宫联参法。`,
    )
  }

  Object.keys(PALACE_HINTS).forEach((topic) => {
    const fieldMap: Record<string, keyof StarFields> = {
      career: 'guanLu',
      wealth: 'caiBo',
      health: 'jiE',
      family: 'xiongDi',
      children: 'ziNv',
      move: 'qianYi',
      friends: 'jiaoYou',
      home: 'tianZhai',
      spirit: 'fuDe',
      parents: 'fuMu',
    }
    const field = fieldMap[topic]
    entry[field] = section(
      `${star}入相关宫位，气质影响该领域的表达方式。`,
      `${brief}\n\n${PALACE_HINTS[topic]}`,
      `以该宫主星为${star}为前提，结合亮度、四化、三方四正与大限流年。`,
      `《紫微斗数全集》诸星得地诀 · 倪师宫位互参法。`,
    )
  })

  return entry
}

export const OPEN_STAR_DB: Record<string, StarFields> = Object.fromEntries(
  ALL.map((star) => [star, buildStarEntry(star)]),
)

export { STAR_BRIEF }
