/**
 * 粗检 LLM 输出是否引用了未出现在盘面的干支/星名（降级用）
 */

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴',
  '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
]

export function citationRiskScore(text: string, allowed: Set<string>): {
  score: number
  unknown: string[]
} {
  const unknown: string[] = []
  const seen = new Set<string>()

  for (const star of MAJOR_STARS) {
    if (text.includes(star) && !allowed.has(star)) {
      if (!seen.has(star)) {
        seen.add(star)
        unknown.push(star)
      }
    }
  }

  // 干支对：连续天干+地支
  for (let i = 0; i < text.length - 1; i++) {
    const a = text[i]
    const b = text[i + 1]
    if (GAN.includes(a) && ZHI.includes(b)) {
      const gz = a + b
      if (!allowed.has(gz) && !allowed.has(a) && !seen.has(gz)) {
        // 若单字干支在允许集也不算严重；仅当整柱不在盘中时记一次
        const pillarOk = [...allowed].some((t) => t.includes(gz) || t === gz)
        if (!pillarOk) {
          seen.add(gz)
          unknown.push(gz)
        }
      }
    }
  }

  return { score: unknown.length, unknown: unknown.slice(0, 12) }
}
