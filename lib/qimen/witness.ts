/**
 * 奇门旁证：MIT qimendunjia-standalone（不替换主引擎）
 */

import type { QimenChart } from './engine'

let cachedMod: {
  calculateBrief?: (d: Date) => {
    error?: string
    message?: string
    info?: { ju?: string; fu?: string; shi?: string }
  }
  calculate?: (d: Date) => {
    error?: string
    message?: string
    info?: { ju?: string; fu?: string; shi?: string }
  }
} | null | undefined

function loadWitnessMod() {
  if (cachedMod !== undefined) return cachedMod
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMod = require('qimendunjia-standalone')
  } catch {
    cachedMod = null
  }
  return cachedMod
}

/** 解析旁证局文案，如「阳遁六局 (上元)」 */
export function parseWitnessJu(juText?: string): { yangDun: boolean; ju: number; yuan?: string } | null {
  if (!juText) return null
  const yang = juText.includes('阳')
  const yin = juText.includes('阴')
  if (!yang && !yin) return null
  const m = juText.match(/([一二三四五六七八九1-9])局/)
  if (!m) return null
  const map: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const ju = map[m[1]] || Number(m[1])
  if (!(ju >= 1 && ju <= 9)) return null
  const yuanM = juText.match(/(上元|中元|下元)/)
  return { yangDun: yang, ju, yuan: yuanM?.[1] }
}

export function juAlignStatus(
  chart: Pick<QimenChart, 'yangDun' | 'ju'>,
  parsed: { yangDun: boolean; ju: number } | null,
): 'match' | 'diff' | 'unknown' {
  if (!parsed) return 'unknown'
  return chart.yangDun === parsed.yangDun && chart.ju === parsed.ju ? 'match' : 'diff'
}

export function attachQimenWitness(
  chart: QimenChart,
  date: string,
  clock: string,
): QimenChart {
  try {
    const mod = loadWitnessMod()
    if (!mod) {
      chart.witness = {
        engine: 'qimendunjia-standalone',
        status: 'skip',
        summary: '旁证包未安装',
        juAlign: 'unknown',
      }
      return chart
    }
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = clock.split(':').map(Number)
    const dt = new Date(y, m - 1, d, hh || 12, mm || 0, 0)
    const brief = (mod.calculateBrief || mod.calculate)?.(dt) as
      | { error?: string; message?: string; info?: { ju?: string; fu?: string; shi?: string } }
      | undefined
    if (!brief || brief.error) {
      chart.witness = {
        engine: 'qimendunjia-standalone',
        status: 'fail',
        summary: brief?.message || brief?.error || '旁证计算失败',
        juAlign: 'unknown',
      }
      return chart
    }
    const info = brief.info || {}
    const parsed = parseWitnessJu(info.ju)
    const juAlign = juAlignStatus(chart, parsed)
    chart.witness = {
      engine: 'qimendunjia-standalone',
      ju: info.ju,
      fu: info.fu,
      shi: info.shi,
      status: 'ok',
      parsed: parsed || undefined,
      juAlign,
      summary:
        juAlign === 'match'
          ? `旁证局=${info.ju || '—'}（与主引擎一致）；${info.fu || ''}；${info.shi || ''}`
          : `旁证局=${info.ju || '—'}（与主引擎 ${chart.yangDun ? '阳' : '阴'}遁${chart.ju}局 ${juAlign === 'diff' ? '不一致' : '未解析'}）；${info.fu || ''}；${info.shi || ''}`,
    }
  } catch (e) {
    chart.witness = {
      engine: 'qimendunjia-standalone',
      status: 'skip',
      summary: `旁证未加载：${e instanceof Error ? e.message : String(e)}`,
      juAlign: 'unknown',
    }
  }
  return chart
}
