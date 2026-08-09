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

/** 太乙 / 皇极：在 JS lite 盘上附加完整法旁证（有则写 meta） */
export async function enrichWithPyEngine(
  system: string,
  chart: Record<string, unknown>,
  input?: Record<string, unknown>,
): Promise<{ sidecar: unknown; note: string } | null> {
  if (system !== 'taiyi' && system !== 'huangji') return null

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
