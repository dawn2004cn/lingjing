/**
 * LLM 输出引用护栏
 * - 词表层：未在允许集出现的星名 / 干支 / 宫位（宫位加权）
 * - 语义 lite：抽取「星入宫 / 宫有星」断言，对照盘面事实索引
 */

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴',
  '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
].sort((a, b) => b.length - a.length)

/** 十二宫名（命理语境；出现且不在 allowed 记为宫位幻觉） */
const PALACES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '仆役宫', '官禄宫', '田宅宫', '福德宫', '父母宫',
  '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '仆役', '官禄', '田宅', '福德', '父母',
  '身宫',
].sort((a, b) => b.length - a.length)

export type CitationFacts = {
  system?: 'ziwei' | 'bazi' | 'generic'
  /** 星名 → 可落宫别名集合 */
  starPalaces?: Record<string, string[]>
  dayMaster?: string
  pillars?: Partial<Record<'year' | 'month' | 'day' | 'time', string>>
}

export type StarPalaceClaim = { star: string; palace: string; raw: string }

function normalizePalaceAlias(name: string): string[] {
  const base = name.endsWith('宫') ? name.slice(0, -1) : name
  const aliases = [base, `${base}宫`]
  if (base === '交友' || base === '仆役') {
    aliases.push('交友', '交友宫', '仆役', '仆役宫')
  }
  return aliases
}

function palaceMatch(a: string, b: string): boolean {
  const aa = new Set(normalizePalaceAlias(a))
  return normalizePalaceAlias(b).some((x) => aa.has(x))
}

/** 从紫微盘构建语义事实索引 */
export function buildZiweiCitationFacts(chart: {
  palaces?: Array<{
    name: string
    stars?: Array<{ name: string }>
    borrowedStars?: string[]
  }>
}): CitationFacts {
  const starPalaces: Record<string, string[]> = {}
  const add = (star: string, palaceName: string) => {
    if (!star) return
    const list = starPalaces[star] || (starPalaces[star] = [])
    for (const a of normalizePalaceAlias(palaceName)) {
      if (!list.includes(a)) list.push(a)
    }
  }
  for (const p of chart.palaces || []) {
    for (const s of p.stars || []) add(s.name, p.name)
    for (const name of p.borrowedStars || []) add(name, p.name)
  }
  return { system: 'ziwei', starPalaces }
}

/** 从八字盘构建语义事实索引 */
export function buildBaziCitationFacts(chart: {
  dayMaster?: string
  pillars?: {
    year?: { ganZhi?: string }
    month?: { ganZhi?: string }
    day?: { ganZhi?: string }
    time?: { ganZhi?: string }
  }
}): CitationFacts {
  return {
    system: 'bazi',
    dayMaster: chart.dayMaster,
    pillars: {
      year: chart.pillars?.year?.ganZhi,
      month: chart.pillars?.month?.ganZhi,
      day: chart.pillars?.day?.ganZhi,
      time: chart.pillars?.time?.ganZhi,
    },
  }
}

/**
 * 抽取「星↔宫」共现断言（窗口/句式）
 * 例：紫微在命宫、命宫有紫微、紫微入夫妻宫
 */
export function extractStarPalaceClaims(text: string): StarPalaceClaim[] {
  const claims: StarPalaceClaim[] = []
  const seen = new Set<string>()

  const push = (star: string, palace: string, raw: string) => {
    const key = `${star}@${palace}`
    if (seen.has(key)) return
    seen.add(key)
    claims.push({ star, palace, raw })
  }

  // 星 … 在/入/守/坐 … 宫
  for (const star of MAJOR_STARS) {
    let from = 0
    while (from < text.length) {
      const i = text.indexOf(star, from)
      if (i < 0) break
      const window = text.slice(i, i + star.length + 12)
      const m = window.match(
        new RegExp(`^${star}(?:星)?(?:在|入|守|坐于?|居于?)(.{1,6}?)(宫)?`),
      )
      if (m) {
        const palace = (m[1] + (m[2] || '')).replace(/[，。、；：\s]/g, '')
        if (palace && PALACES.some((p) => palace.includes(p) || p.includes(palace))) {
          const hit = PALACES.find((p) => palace.includes(p) || p.includes(palace)) || palace
          push(star, hit, window.slice(0, 16))
        }
      }
      from = i + star.length
    }
  }

  // 宫 … 有/见/主星为 … 星
  for (const palace of PALACES) {
    let from = 0
    while (from < text.length) {
      const i = text.indexOf(palace, from)
      if (i < 0) break
      const window = text.slice(i, i + palace.length + 14)
      const m = window.match(
        new RegExp(`^${palace}(?:主星)?(?:有|见|为|是|坐|会)?(.{0,4}?)(${MAJOR_STARS.join('|')})`),
      )
      if (m) {
        push(m[2], palace, window.slice(0, 18))
      }
      from = i + palace.length
    }
  }

  return claims
}

function semanticMismatches(
  text: string,
  facts?: CitationFacts | null,
): { claims: string[]; score: number } {
  if (!facts) return { claims: [], score: 0 }
  const bad: string[] = []
  let score = 0

  if (facts.starPalaces) {
    for (const c of extractStarPalaceClaims(text)) {
      const places = facts.starPalaces[c.star]
      if (!places || !places.length) {
        // 星不在盘：词表层也会抓；此处只记关系
        continue
      }
      const ok = places.some((p) => palaceMatch(p, c.palace))
      if (!ok) {
        bad.push(`${c.star}≠${c.palace}`)
        score += 3
      }
    }
  }

  if (facts.dayMaster && /日主/.test(text)) {
    const m = text.match(/日主\s*([甲乙丙丁戊己庚辛壬癸])/)
    if (m && m[1] !== facts.dayMaster) {
      bad.push(`日主≠${m[1]}`)
      score += 3
    }
  }

  if (facts.pillars) {
    const labels: Array<[string, keyof NonNullable<CitationFacts['pillars']>]> = [
      ['年柱', 'year'],
      ['月柱', 'month'],
      ['日柱', 'day'],
      ['时柱', 'time'],
    ]
    for (const [label, key] of labels) {
      const expect = facts.pillars[key]
      if (!expect) continue
      const re = new RegExp(`${label}\\s*([${GAN}][${ZHI}])`)
      const m = text.match(re)
      if (m && m[1] !== expect) {
        bad.push(`${label}≠${m[1]}`)
        score += 3
      }
    }
  }

  return { claims: bad, score }
}

export function citationRiskScore(
  text: string,
  allowed: Set<string>,
  facts?: CitationFacts | null,
): {
  score: number
  unknown: string[]
  /** 分项：星曜 / 干支 / 宫位 / 语义关系 */
  breakdown?: {
    stars: string[]
    ganzhi: string[]
    palaces: string[]
    relations: string[]
  }
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

  const sem = semanticMismatches(text, facts)
  for (const c of sem.claims) {
    if (!seen.has(c)) {
      seen.add(c)
      unknown.push(c)
    }
  }
  score += sem.score

  return {
    score,
    unknown: unknown.slice(0, 12),
    breakdown: { stars, ganzhi, palaces, relations: sem.claims },
  }
}
