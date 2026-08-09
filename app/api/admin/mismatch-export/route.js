import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  birthInputFromRecord,
  computePrecisionFlags,
} from '@/lib/astro/precision-flags'

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * 导出交叉异常复核报告（mismatch + partial，可选含复算摘要）
 * GET ?format=csv|md&recompute=1
 */
export async function GET(req) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'csv').toLowerCase()
  const recompute = url.searchParams.get('recompute') === '1'
  const includeSect = url.searchParams.get('sect') === '1'

  const db = getDb()
  const statuses = includeSect
    ? `('mismatch', 'partial', 'sect_diff')`
    : `('mismatch', 'partial')`

  const rows = db
    .prepare(`
      SELECT f.*, u.username
      FROM fortune_records f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.cross_status IN ${statuses}
      ORDER BY
        CASE f.cross_status WHEN 'mismatch' THEN 0 WHEN 'partial' THEN 1 ELSE 2 END,
        f.created_at DESC
      LIMIT 200
    `)
    .all()

  const lines = []
  const headers = [
    'id', 'username', 'name', 'system', 'calendar', 'birth_date', 'birth_time',
    'day_sect', 'cross_status', 'boundary_hour', 'boundary_jieqi', 'true_solar_shift',
    'use_true_solar', 'province', 'city', 'created_at',
    'recheck_status', 'recheck_pillars', 'recheck_summary',
  ]

  if (format === 'md') {
    lines.push('# 灵镜交叉复核报告')
    lines.push('')
    lines.push(`生成时间：${new Date().toISOString()}`)
    lines.push(`记录数：${rows.length}${recompute ? '（含即时复算）' : ''}`)
    lines.push('')
  } else {
    lines.push(headers.join(','))
  }

  for (const r of rows) {
    let recheckStatus = ''
    let recheckPillars = ''
    let recheckSummary = ''
    if (recompute) {
      try {
        const flags = computePrecisionFlags({
          ...birthInputFromRecord(r),
          withReport: true,
        })
        recheckStatus = flags.crossStatus
        recheckPillars = flags.crossReport?.pillars?.primary || ''
        recheckSummary = flags.crossReport?.summary || ''
      } catch (e) {
        recheckStatus = 'error'
        recheckSummary = e.message || '复算失败'
      }
    }

    const birthTime = r.birth_clock || r.birth_hour || ''
    if (format === 'md') {
      lines.push(`## #${r.id} ${r.name || '未命名'}（${r.cross_status}）`)
      lines.push(`- 用户：${r.username || '—'}`)
      lines.push(`- 体系：${r.system === 'ziwei' ? '紫微' : '八字'} · 流派${Number(r.day_sect) === 1 ? '1' : '2'}`)
      lines.push(`- 生辰：${r.calendar_type} ${r.birth_date} ${birthTime}`)
      lines.push(`- 标志：时辰交界=${r.boundary_hour} 节气=${r.boundary_jieqi} 真太阳跨=${r.true_solar_shift}`)
      if (recompute) {
        lines.push(`- 复算：${recheckStatus} · ${recheckPillars}`)
        if (recheckSummary) lines.push(`- 摘要：${recheckSummary}`)
      }
      lines.push(`- 入库：${r.created_at}`)
      lines.push('')
    } else {
      lines.push([
        r.id,
        r.username,
        r.name,
        r.system,
        r.calendar_type,
        r.birth_date,
        birthTime,
        Number(r.day_sect) === 1 ? 1 : 2,
        r.cross_status,
        r.boundary_hour,
        r.boundary_jieqi,
        r.true_solar_shift,
        r.use_true_solar,
        r.province,
        r.city,
        r.created_at,
        recheckStatus,
        recheckPillars,
        recheckSummary,
      ].map(csvEscape).join(','))
    }
  }

  const body = lines.join('\n')
  const stamp = new Date().toISOString().slice(0, 10)
  if (format === 'md') {
    return new Response(body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="lingjing-cross-review-${stamp}.md"`,
      },
    })
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lingjing-cross-review-${stamp}.csv"`,
    },
  })
}
