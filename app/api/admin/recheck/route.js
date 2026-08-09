import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  birthInputFromRecord,
  computePrecisionFlags,
} from '@/lib/astro/precision-flags'

const CROSS_STATUSES = new Set(['match', 'sect_diff', 'partial', 'mismatch', 'skipped'])

function applyFlags(db, id, flags) {
  const crossStatus = CROSS_STATUSES.has(flags.crossStatus) ? flags.crossStatus : 'skipped'
  db.prepare(`
    UPDATE fortune_records SET
      boundary_hour = ?,
      boundary_jieqi = ?,
      true_solar_shift = ?,
      cross_status = ?
    WHERE id = ?
  `).run(
    flags.boundaryHour ? 1 : 0,
    flags.boundaryJieqi ? 1 : 0,
    flags.trueSolarShift ? 1 : 0,
    crossStatus,
    id,
  )
  return {
    id,
    crossStatus,
    boundaryHour: flags.boundaryHour,
    boundaryJieqi: flags.boundaryJieqi,
    trueSolarShift: flags.trueSolarShift,
    summary: flags.crossReport?.summary || null,
    pillars: flags.crossReport?.pillars?.primary || null,
  }
}

function recomputeRows(db, rows) {
  const results = []
  for (const r of rows) {
    try {
      const flags = computePrecisionFlags({
        ...birthInputFromRecord(r),
        withReport: true,
      })
      // 解析失败仍为 skipped 时，标记 partial 以免回填队列死循环
      if (flags.crossStatus === 'skipped') {
        db.prepare(`
          UPDATE fortune_records SET cross_status = 'partial'
          WHERE id = ?
        `).run(r.id)
        results.push({
          id: r.id,
          crossStatus: 'partial',
          error: '无法完成交叉校验，已标为 partial',
        })
        continue
      }
      results.push(applyFlags(db, r.id, flags))
    } catch (e) {
      db.prepare(`
        UPDATE fortune_records SET cross_status = 'partial'
        WHERE id = ?
      `).run(r.id)
      results.push({ id: r.id, crossStatus: 'partial', error: e.message || '复算失败' })
    }
  }
  return results
}

export async function POST(req) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { recordId, allMismatch, backfill } = body || {}
  const db = getDb()
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200)

  if (backfill) {
    // 旧记录默认 cross_status=skipped，按 id 升序回填，可多次调用直到清零
    const rows = db
      .prepare(`
        SELECT * FROM fortune_records
        WHERE COALESCE(cross_status, 'skipped') = 'skipped'
        ORDER BY id ASC
        LIMIT ?
      `)
      .all(limit)
    const results = recomputeRows(db, rows)
    const remaining = db
      .prepare(`SELECT COUNT(*) as c FROM fortune_records WHERE COALESCE(cross_status, 'skipped') = 'skipped'`)
      .get().c
    return Response.json({
      ok: true,
      mode: 'backfill',
      count: results.length,
      remaining,
      results,
    })
  }

  if (allMismatch) {
    const rows = db
      .prepare(`SELECT * FROM fortune_records WHERE cross_status = 'mismatch' ORDER BY id DESC LIMIT ?`)
      .all(limit)
    const results = recomputeRows(db, rows)
    return Response.json({
      ok: true,
      mode: 'allMismatch',
      count: results.length,
      results,
    })
  }

  const id = Number(recordId)
  if (!id) {
    return Response.json({ error: '缺少 recordId / backfill / allMismatch' }, { status: 400 })
  }

  const row = db.prepare(`SELECT * FROM fortune_records WHERE id = ?`).get(id)
  if (!row) {
    return Response.json({ error: '记录不存在' }, { status: 404 })
  }

  const flags = computePrecisionFlags({
    ...birthInputFromRecord(row),
    withReport: true,
  })
  const result = applyFlags(db, id, flags)

  return Response.json({ ok: true, mode: 'one', result })
}
