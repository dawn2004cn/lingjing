/**
 * LLM 输出引用护栏
 * - 词表层：未在允许集出现的星名 / 干支 / 宫位（宫位加权）
 * - 语义事实图：星入宫、本命四化、化忌落宫、命身宫、对宫/三方、格局名、八字日主柱位喜用
 */

import { BRANCHES } from '@/lib/ziwei/constants'
import { getSiHuaByStem } from '@/lib/ziwei/sihua'

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const SI_HUA = ['禄', '权', '科', '忌'] as const
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴',
  '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
].sort((a, b) => b.length - a.length)

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
  /** 本命四化：星名 → 禄|权|科|忌 */
  natalSiHua?: Record<string, string>
  /** 本命四化落宫：忌 → [夫妻宫,…] */
  siHuaFall?: Partial<Record<(typeof SI_HUA)[number], string[]>>
  /** 宫 → 对宫 */
  palaceOpposite?: Record<string, string>
  /** 宫 → 三方四正（含本宫） */
  palaceSanFang?: Record<string, string[]>
  mingGong?: string
  shenGong?: string
  mingBranch?: string
  patterns?: string[]
  wuxingJu?: string
  dayMaster?: string
  pillars?: Partial<Record<'year' | 'month' | 'day' | 'time', string>>
  xiYong?: string[]
  jiShen?: string[]
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

function addPalaceAlias(list: string[], palaceName: string) {
  for (const a of normalizePalaceAlias(palaceName)) {
    if (!list.includes(a)) list.push(a)
  }
}

/** 从紫微盘构建语义事实图 */
export function buildZiweiCitationFacts(chart: {
  palaces?: Array<{
    name: string
    branch?: number
    stars?: Array<{ name: string; siHua?: string }>
    borrowedStars?: string[]
  }>
  mingGongBranch?: number
  shenGongBranch?: number
  wuxingJuName?: string
  lunarInfo?: { yearStem?: number }
}): CitationFacts {
  const starPalaces: Record<string, string[]> = {}
  const natalSiHua: Record<string, string> = {}
  const palaceOpposite: Record<string, string> = {}
  const palaceSanFang: Record<string, string[]> = {}
  const byBranch = new Map<number, string>()

  const addStar = (star: string, palaceName: string) => {
    if (!star) return
    const list = starPalaces[star] || (starPalaces[star] = [])
    addPalaceAlias(list, palaceName)
  }

  for (const p of chart.palaces || []) {
    if (typeof p.branch === 'number') byBranch.set(p.branch, p.name)
    for (const s of p.stars || []) {
      addStar(s.name, p.name)
      if (s.siHua && SI_HUA.includes(s.siHua as (typeof SI_HUA)[number])) {
        natalSiHua[s.name] = s.siHua
      }
    }
    for (const name of p.borrowedStars || []) addStar(name, p.name)
  }

  for (const p of chart.palaces || []) {
    if (typeof p.branch !== 'number') continue
    const opp = byBranch.get((p.branch + 6) % 12)
    if (opp) {
      for (const a of normalizePalaceAlias(p.name)) palaceOpposite[a] = opp
    }
    const san = [0, 4, 6, 8]
      .map((d) => byBranch.get((p.branch + d) % 12))
      .filter(Boolean) as string[]
    for (const a of normalizePalaceAlias(p.name)) {
      palaceSanFang[a] = san
    }
  }

  const stem = chart.lunarInfo?.yearStem
  const siHuaFall: CitationFacts['siHuaFall'] = {}
  if (stem != null) {
    const transforms = getSiHuaByStem(stem)
    for (const sh of SI_HUA) {
      const star = transforms[sh]
      if (!star) continue
      natalSiHua[star] = natalSiHua[star] || sh
      siHuaFall[sh] = [...(starPalaces[star] || [])]
    }
  }

  const mingGong =
    typeof chart.mingGongBranch === 'number'
      ? byBranch.get(chart.mingGongBranch)
      : undefined
  const shenGong =
    typeof chart.shenGongBranch === 'number'
      ? byBranch.get(chart.shenGongBranch)
      : undefined

  return {
    system: 'ziwei',
    starPalaces,
    natalSiHua,
    siHuaFall,
    palaceOpposite,
    palaceSanFang,
    mingGong,
    shenGong,
    mingBranch:
      typeof chart.mingGongBranch === 'number'
        ? BRANCHES[chart.mingGongBranch]
        : undefined,
    wuxingJu: chart.wuxingJuName,
  }
}

/** 附带格局名的事实图 */
export function withZiweiPatterns(
  facts: CitationFacts,
  patterns: Array<{ name: string } | string>,
): CitationFacts {
  return {
    ...facts,
    patterns: patterns.map((p) => (typeof p === 'string' ? p : p.name)),
  }
}

/** 从八字盘构建语义事实图 */
export function buildBaziCitationFacts(chart: {
  dayMaster?: string
  pillars?: {
    year?: { ganZhi?: string }
    month?: { ganZhi?: string }
    day?: { ganZhi?: string }
    time?: { ganZhi?: string }
  }
  yongShen?: { xiYong?: string[]; jiShen?: string[] }
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
    xiYong: chart.yongShen?.xiYong,
    jiShen: chart.yongShen?.jiShen,
  }
}

export function extractStarPalaceClaims(text: string): StarPalaceClaim[] {
  const claims: StarPalaceClaim[] = []
  const seen = new Set<string>()

  const push = (star: string, palace: string, raw: string) => {
    const key = `${star}@${palace}`
    if (seen.has(key)) return
    seen.add(key)
    claims.push({ star, palace, raw })
  }

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

  for (const palace of PALACES) {
    let from = 0
    while (from < text.length) {
      const i = text.indexOf(palace, from)
      if (i < 0) break
      const window = text.slice(i, i + palace.length + 14)
      const m = window.match(
        new RegExp(`^${palace}(?:主星)?(?:有|见|为|是|坐|会)?(.{0,4}?)(${MAJOR_STARS.join('|')})`),
      )
      if (m) push(m[2], palace, window.slice(0, 18))
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
  const push = (label: string, w = 3) => {
    bad.push(label)
    score += w
  }

  if (facts.starPalaces) {
    for (const c of extractStarPalaceClaims(text)) {
      const places = facts.starPalaces[c.star]
      if (!places?.length) continue
      if (!places.some((p) => palaceMatch(p, c.palace))) {
        push(`${c.star}≠${c.palace}`)
      }
    }
  }

  // 星化禄/权/科/忌
  if (facts.natalSiHua) {
    for (const star of MAJOR_STARS) {
      if (!text.includes(star)) continue
      const re = new RegExp(`${star}化([禄权科忌])`)
      const m = text.match(re)
      if (!m) continue
      const expect = facts.natalSiHua[star]
      if (expect && expect !== m[1]) push(`${star}化≠${m[1]}`)
      if (!expect) {
        // 盘面未载该星四化却断言 — 若星在盘仍可能是流年化，仅当本命索引存在且无该星时严判
        // 宽松：无本命四化记录则跳过
      }
    }
  }

  // 化忌入/落/在某宫
  if (facts.siHuaFall) {
    for (const sh of SI_HUA) {
      const re = new RegExp(`化${sh}(?:入|落|在|飞入)([^，。；\\s]{1,6})`)
      const m = text.match(re)
      if (!m) continue
      const palaceHit = PALACES.find((p) => m[1].includes(p) || p.includes(m[1].replace(/宫$/, '')))
      if (!palaceHit) continue
      const falls = facts.siHuaFall[sh] || []
      if (falls.length && !falls.some((p) => palaceMatch(p, palaceHit))) {
        push(`化${sh}落≠${palaceHit}`)
      }
    }
  }

  // 命宫地支 / 命宫名
  if (facts.mingBranch || facts.mingGong) {
    const mBranch = text.match(/命宫(?:在|为|属)?\s*([子丑寅卯辰巳午未申酉戌亥])/)
    if (mBranch && facts.mingBranch && mBranch[1] !== facts.mingBranch) {
      push(`命宫支≠${mBranch[1]}`)
    }
    const mName = text.match(/命宫(?:是|为)\s*(兄弟|夫妻|子女|财帛|疾厄|迁移|交友|仆役|官禄|田宅|福德|父母)?宫?/)
    // 命宫名通常就是「命宫」，断言「命宫是夫妻」才算错
    if (mName && mName[1] && facts.mingGong) {
      const claimed = `${mName[1]}宫`
      if (!palaceMatch(facts.mingGong, '命宫') && !palaceMatch(claimed, facts.mingGong)) {
        // 仅当声称命宫等于其他宫名
        if (claimed !== '命宫') push(`命宫名≠${claimed}`)
      }
    }
  }

  // A对宫是B
  if (facts.palaceOpposite) {
    const re = /([\u4e00-\u9fff]{1,3}宫)对宫(?:是|为|即)?\s*([\u4e00-\u9fff]{1,3}宫)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const expect = facts.palaceOpposite[m[1]] || facts.palaceOpposite[m[1].replace(/宫$/, '')]
      if (expect && !palaceMatch(expect, m[2])) {
        push(`${m[1]}对宫≠${m[2]}`)
      }
    }
  }

  // 成XX格
  if (facts.patterns) {
    const re = /成([\u4e00-\u9fff]{2,12}格)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const name = m[1]
      const ok = facts.patterns.some(
        (p) => p === name || name.includes(p) || p.includes(name.replace(/格$/, '')),
      )
      if (!ok) push(`格局≠${name}`)
    }
  }

  if (facts.wuxingJu && /局/.test(text)) {
    const m = text.match(/([水木金火土]二?局|[水木金火土][\u4e00-\u9fff]?局)/)
    // 宽松：若出现「X局」且与事实局名完全无关
    if (m && facts.wuxingJu && !facts.wuxingJu.includes(m[1].replace(/局$/, '')) && !m[1].includes(facts.wuxingJu.replace(/局$/, ''))) {
      // only flag if clear mismatch like 水二局 vs 火六局
      const juRe = /([水木金火土])[二三四五十]?[六]?局/
      const a = facts.wuxingJu.match(juRe)
      const b = m[1].match(juRe)
      if (a && b && a[1] !== b[1]) push(`局≠${m[1]}`)
    }
  }

  if (facts.dayMaster && /日主/.test(text)) {
    const m = text.match(/日主\s*([甲乙丙丁戊己庚辛壬癸])/)
    if (m && m[1] !== facts.dayMaster) push(`日主≠${m[1]}`)
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
      if (m && m[1] !== expect) push(`${label}≠${m[1]}`)
    }
  }

  if (facts.xiYong?.length) {
    const m = text.match(/喜用[神]?[为是：:]\s*([金木水火土]+)/)
    if (m) {
      const claimed = [...m[1]]
      if (claimed.some((x) => !facts.xiYong!.includes(x))) {
        push(`喜用≠${m[1]}`)
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
