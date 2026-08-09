/**
 * 可选：请求 Python sidecar；失败返回 null
 */

export async function fetchPyEngine(
  path: string,
  body?: Record<string, unknown>,
  opts?: { method?: 'GET' | 'POST' },
) {
  const base = process.env.PY_ENGINE_URL
  if (!base) return null
  const method = opts?.method || (body ? 'POST' : 'GET')
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function resolveYmdh(chart: Record<string, unknown>, input?: Record<string, unknown>) {
  const dateStr =
    (typeof input?.date === 'string' && input.date) ||
    (typeof chart.date === 'string' && chart.date) ||
    new Date().toISOString().slice(0, 10)
  const [y, m, d] = dateStr.split('-').map(Number)
  const year = Number(chart.year) || Number(input?.year) || y || new Date().getFullYear()
  const month = Number(chart.month) || m || 1
  const day = Number(chart.day) || d || 1
  const clock = typeof input?.clock === 'string' ? input.clock : '12:00'
  const hour = Number(chart.hour) || Number(clock.split(':')[0]) || 12
  return { year, month, day, hour }
}

/** 将 sidecar JSON 压成可读 Markdown 段落（保证有输出） */
export function formatSidecarMarkdown(note: string, sidecar: unknown): string {
  const lines = ['', '## Python sidecar 旁证', `- ${note}`]
  if (sidecar && typeof sidecar === 'object') {
    const s = sidecar as Record<string, unknown>
    if (s.engine) lines.push(`- 引擎：${String(s.engine)}`)
    if (s.ok === false && s.error) lines.push(`- 错误：${String(s.error)}`)
    if (s.hint) lines.push(`- 提示：${String(s.hint)}`)
    if (typeof s.text === 'string' && s.text.trim()) {
      lines.push('', '```', s.text.slice(0, 1200), '```')
    } else if (s.data != null) {
      const raw = typeof s.data === 'string' ? s.data : JSON.stringify(s.data, null, 2)
      lines.push('', '```json', raw.slice(0, 1200), '```')
    } else if (s.gua != null) {
      lines.push(`- 卦：${JSON.stringify(s.gua)}`)
    }
  }
  return lines.join('\n')
}

/** 太乙/皇极/奇门/大六壬：可选 Python 旁证 */
export async function enrichWithPyEngine(
  system: string,
  chart: Record<string, unknown>,
  input?: Record<string, unknown>,
): Promise<{ sidecar: unknown; note: string } | null> {
  const supported = ['taiyi', 'huangji', 'qimen', 'daliuren', 'jinkou']
  if (!supported.includes(system)) return null

  const { year, month, day, hour } = resolveYmdh(chart, input)

  if (system === 'taiyi') {
    const data = await fetchPyEngine('/taiyi', {
      year,
      month,
      day,
      hour,
      minute: 0,
      ji_style: Number(chart.jiStyle) || 0,
      method: 1,
    })
    if (!data) return null
    return {
      sidecar: data,
      note: data.ok
        ? '已并入 py-engine/kintaiyi 旁证'
        : 'py-engine 未装 kintaiyi，仍以 JS lite 为准',
    }
  }

  if (system === 'huangji') {
    const data = await fetchPyEngine('/huangji', {
      year,
      month,
      day,
      hour,
      minute: 0,
    })
    if (!data) return null
    return {
      sidecar: data,
      note: data.ok
        ? '已并入 py-engine/kinwangji 旁证'
        : 'py-engine 未装 kinwangji，仍以 JS lite 为准',
    }
  }

  if (system === 'qimen') {
    const data = await fetchPyEngine('/qimen', { year, month, day, hour, minute: 0 })
    if (!data) return null
    return {
      sidecar: data,
      note: data.ok
        ? '已并入 py-engine/kinqimen 旁证'
        : 'py-engine 未装 kinqimen；Node 侧 MIT 旁证仍可用',
    }
  }

  if (system === 'jinkou') {
    const data = await fetchPyEngine('/jinkou', {
      year,
      month,
      day,
      hour,
      minute: 0,
      difen: typeof chart.difen === 'string' ? chart.difen : undefined,
    })
    if (!data) return null
    return {
      sidecar: data,
      note: data.ok
        ? '已并入 py-engine/kinjinkou 旁证'
        : 'py-engine 未装 kinjinkou，仍以 JS 自研为准',
    }
  }

  const data = await fetchPyEngine('/daliuren', { year, month, day, hour, minute: 0 })
  if (!data) return null
  return {
    sidecar: data,
    note: data.ok
      ? '已并入 py-engine/kinliuren 旁证'
      : 'py-engine 未装 kinliuren，仍以 JS 自研为准',
  }
}
