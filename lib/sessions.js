/**
 * 解读会话：排盘结果 + 多轮追问持久化
 */

import { randomBytes } from 'crypto'
import { getDb } from './db'

const MAX_THREAD = 40
const MAX_RESULT_CHARS = 120_000

export function mintSessionPublicId() {
  return `S${randomBytes(8).toString('hex')}`
}

function safeJsonParse(raw, fallback) {
  if (raw == null || raw === '') return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function serializeSession(row) {
  if (!row) return null
  return {
    id: row.id,
    publicId: row.public_id,
    userId: row.user_id,
    system: row.system,
    title: row.title,
    birth: safeJsonParse(row.birth_json, {}),
    result: row.result_md || '',
    thread: safeJsonParse(row.thread_json, []),
    meta: safeJsonParse(row.meta_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function clampThread(thread) {
  if (!Array.isArray(thread)) return []
  return thread
    .slice(-MAX_THREAD)
    .map((t) => ({
      question: String(t?.question || '').slice(0, 2000),
      answer: String(t?.answer || '').slice(0, 20000),
    }))
    .filter((t) => t.question || t.answer)
}

function birthTitle(birth, system) {
  const name = birth?.name || '未命名'
  const sys = system === 'ziwei' ? '紫微' : '八字'
  const date = birth?.birthDate || ''
  return `${name} · ${sys}${date ? ` · ${date}` : ''}`
}

/**
 * @returns {{ ok: true, session: object } | { ok: false, error: string }}
 */
export function createSession(userId, { system, birth, result, thread, meta } = {}) {
  if (!userId) return { ok: false, error: '未登录' }
  const db = getDb()
  const sys = system === 'ziwei' ? 'ziwei' : 'bazi'
  const birthObj = birth && typeof birth === 'object' ? birth : {}
  const title = birthTitle(birthObj, sys)
  const publicId = mintSessionPublicId()
  const resultMd = String(result || '').slice(0, MAX_RESULT_CHARS)
  const threadJson = JSON.stringify(clampThread(thread || []))
  const birthJson = JSON.stringify(birthObj)
  const metaJson = JSON.stringify(meta && typeof meta === 'object' ? meta : {})

  const info = db
    .prepare(
      `INSERT INTO analysis_sessions
        (public_id, user_id, system, title, birth_json, result_md, thread_json, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(publicId, userId, sys, title, birthJson, resultMd, threadJson, metaJson)

  const row = db.prepare('SELECT * FROM analysis_sessions WHERE id = ?').get(info.lastInsertRowid)
  return { ok: true, session: serializeSession(row) }
}

export function getSessionByPublicId(userId, publicId) {
  if (!userId || !publicId) return null
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM analysis_sessions WHERE public_id = ? AND user_id = ?`)
    .get(String(publicId), userId)
  return serializeSession(row)
}

export function listSessionsForUser(userId, limit = 30) {
  if (!userId) return []
  const db = getDb()
  return db
    .prepare(
      `SELECT * FROM analysis_sessions
       WHERE user_id = ?
       ORDER BY datetime(updated_at) DESC
       LIMIT ?`,
    )
    .all(userId, Math.min(100, Math.max(1, limit)))
    .map(serializeSession)
}

/**
 * 更新主解读与/或追问线程
 */
export function updateSession(userId, publicId, patch = {}) {
  if (!userId || !publicId) return { ok: false, error: '参数不完整' }
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM analysis_sessions WHERE public_id = ? AND user_id = ?`)
    .get(String(publicId), userId)
  if (!row) return { ok: false, error: '会话不存在' }

  let title = row.title
  let birthJson = row.birth_json
  let resultMd = row.result_md
  let threadJson = row.thread_json
  let metaJson = row.meta_json
  let system = row.system

  if (patch.birth && typeof patch.birth === 'object') {
    birthJson = JSON.stringify(patch.birth)
    title = birthTitle(patch.birth, system)
  }
  if (patch.system === 'ziwei' || patch.system === 'bazi') {
    system = patch.system
    title = birthTitle(safeJsonParse(birthJson, {}), system)
  }
  if (typeof patch.result === 'string') {
    resultMd = patch.result.slice(0, MAX_RESULT_CHARS)
  }
  if (Array.isArray(patch.thread)) {
    threadJson = JSON.stringify(clampThread(patch.thread))
  }
  if (patch.meta && typeof patch.meta === 'object') {
    const prev = safeJsonParse(metaJson, {})
    metaJson = JSON.stringify({ ...prev, ...patch.meta })
  }
  if (typeof patch.title === 'string' && patch.title.trim()) {
    title = patch.title.trim().slice(0, 120)
  }

  db.prepare(
    `UPDATE analysis_sessions
     SET title = ?, system = ?, birth_json = ?, result_md = ?, thread_json = ?, meta_json = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).run(title, system, birthJson, resultMd, threadJson, metaJson, row.id)

  const next = db.prepare('SELECT * FROM analysis_sessions WHERE id = ?').get(row.id)
  return { ok: true, session: serializeSession(next) }
}

/** 追加一轮追问 */
export function appendSessionTurn(userId, publicId, { question, answer }) {
  const session = getSessionByPublicId(userId, publicId)
  if (!session) return { ok: false, error: '会话不存在' }
  const thread = clampThread([
    ...(session.thread || []),
    { question, answer },
  ])
  return updateSession(userId, publicId, { thread })
}

export function deleteSession(userId, publicId) {
  if (!userId || !publicId) return { ok: false, error: '参数不完整' }
  const db = getDb()
  const info = db
    .prepare(`DELETE FROM analysis_sessions WHERE public_id = ? AND user_id = ?`)
    .run(String(publicId), userId)
  if (!info.changes) return { ok: false, error: '会话不存在' }
  return { ok: true }
}

/** 纯函数：供回归 */
export function normalizeThreadForStore(thread) {
  return clampThread(thread)
}
