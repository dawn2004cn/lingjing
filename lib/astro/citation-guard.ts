/**
 * LLM 输出引用护栏：检测未出现在盘面/规则允许集中的星名、干支、宫位
 * 宫位名幻觉权重更高（易误导解读结构）
 */

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴',
  '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
]

/** 十二宫名（命理语境；出现且不在 allowed 记为宫位幻觉） */
const PALACES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '仆役宫', '官禄宫', '田宅宫', '福德宫', '父母宫',
  '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '仆役', '官禄', '田宅', '福德', '父母',
  '身宫',
]

function normalizePalaceAlias(name: string): string[] {
  const base = name.endsWith('宫') ? name.slice(0, -1) : name
  const aliases = [base, `${base}宫`]
  if (base === '交友' || base === '仆役') {
    aliases.push('交友', '交友宫', '仆役', '仆役宫')
  }
  return aliases
}

export function citationRiskScore(text: string, allowed: Set<string>): {
  score: number
  unknown: string[]
  /** 分项：星曜 / 干支 / 宫位 */
  breakdown?: { stars: string[]; ganzhi: string[]; palaces: string[] }
} {
  const unknown: string[] = []
  const seen = new Set<string>()
  const stars: string[] = []
  const ganzhi: string[] = []
  const palaces: string[] = []
  let score = 0

  const allowPalace = (name: string) => {
    for (const a of normalizePalaceAlias(name)) {
      if (allowed.has(a)) return true
    }
    return false
  }

  for (const palace of PALACES) {
    if (text.includes(palace) && !allowPalace(palace)) {
      if (!seen.has(palace)) {
        seen.add(palace)
        unknown.push(palace)
        palaces.push(palace)
        score += 2
      }
    }
  }

  for (const star of MAJOR_STARS) {
    if (text.includes(star) && !allowed.has(star)) {
      if (!seen.has(star)) {
        seen.add(star)
        unknown.push(star)
        stars.push(star)
        score += 1
      }
    }
  }

  for (let i = 0; i < text.length - 1; i++) {
    const a = text[i]
    const b = text[i + 1]
    if (GAN.includes(a) && ZHI.includes(b)) {
      const gz = a + b
      if (!allowed.has(gz) && !allowed.has(a) && !seen.has(gz)) {
        const pillarOk = [...allowed].some((t) => t.includes(gz) || t === gz)
        if (!pillarOk) {
          seen.add(gz)
          unknown.push(gz)
          ganzhi.push(gz)
          score += 1
        }
      }
    }
  }

  return {
    score,
    unknown: unknown.slice(0, 12),
    breakdown: { stars, ganzhi, palaces },
  }
}
