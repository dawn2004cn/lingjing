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
      }
      return chart
    }
    const info = brief.info || {}
    chart.witness = {
      engine: 'qimendunjia-standalone',
      ju: info.ju,
      fu: info.fu,
      shi: info.shi,
      status: 'ok',
      summary: `旁证局=${info.ju || '—'}；${info.fu || ''}；${info.shi || ''}`,
    }
  } catch (e) {
    chart.witness = {
      engine: 'qimendunjia-standalone',
      status: 'skip',
      summary: `旁证未加载：${e instanceof Error ? e.message : String(e)}`,
    }
  }
  return chart
}
