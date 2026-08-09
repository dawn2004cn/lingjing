/**
 * 准确度事件落库（citation 等可观测信号）
 */

import { getDb } from '@/lib/db'

export function ensureAccuracyEventsTable() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS accuracy_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      system TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      fallback INTEGER NOT NULL DEFAULT 0,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export function logAccuracyEvent(opts: {
  kind: string
  system?: string
  score?: number
  fallback?: boolean
  detail?: string | string[] | null
}) {
  try {
    ensureAccuracyEventsTable()
    const db = getDb()
    const detail =
      opts.detail == null
        ? null
        : Array.isArray(opts.detail)
          ? opts.detail.join('、')
          : String(opts.detail)
    db.prepare(`
      INSERT INTO accuracy_events (kind, system, score, fallback, detail)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      opts.kind,
      opts.system || null,
      opts.score ?? 0,
      opts.fallback ? 1 : 0,
      detail,
    )
  } catch (e) {
    console.warn('logAccuracyEvent failed', e)
  }
}

export function getCitationStats() {
  ensureAccuracyEventsTable()
  const db = getDb()
  const total = db.prepare(`SELECT COUNT(*) as c FROM accuracy_events WHERE kind = 'citation'`).get().c
  const fallbacks = db.prepare(`SELECT COUNT(*) as c FROM accuracy_events WHERE kind = 'citation' AND fallback = 1`).get().c
  const avg = db.prepare(`SELECT AVG(score) as a FROM accuracy_events WHERE kind = 'citation'`).get().a
  const recent = db.prepare(`
    SELECT id, system, score, fallback, detail, created_at
    FROM accuracy_events
    WHERE kind = 'citation' AND fallback = 1
    ORDER BY created_at DESC
    LIMIT 15
  `).all()
  const bySystem = db
    .prepare(
      `
    SELECT
      COALESCE(system, 'unknown') as system,
      COUNT(*) as total,
      SUM(CASE WHEN fallback = 1 THEN 1 ELSE 0 END) as fallbacks,
      AVG(score) as avgScore
    FROM accuracy_events
    WHERE kind = 'citation'
    GROUP BY COALESCE(system, 'unknown')
    ORDER BY total DESC
  `,
    )
    .all()
    .map((row: { system: string; total: number; fallbacks: number; avgScore: number | null }) => ({
      system: row.system,
      total: row.total,
      fallbacks: row.fallbacks,
      fallbackPct: row.total ? Math.round((row.fallbacks / row.total) * 1000) / 10 : 0,
      avgScore: row.avgScore != null ? Math.round(Number(row.avgScore) * 10) / 10 : 0,
    }))
  return {
    total,
    fallbacks,
    fallbackPct: total ? Math.round((fallbacks / total) * 1000) / 10 : 0,
    avgScore: avg != null ? Math.round(Number(avg) * 10) / 10 : 0,
    recentFallbacks: recent,
    bySystem,
  }
}
