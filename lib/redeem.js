/**
 * 专业档兑换码（支付网关前的可运营闭环）
 */

import { randomBytes } from 'crypto'
import { getDb } from './db'
import { normalizePlanId } from './plan'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPart(len) {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function normalizeRedeemCode(raw) {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (s.startsWith('LJ')) return s
  if (s.length === 8) return `LJ${s}`
  return s
}

/** 展示形态 LJ-XXXX-XXXX */
export function formatRedeemCode(normalized) {
  const s = normalizeRedeemCode(normalized).replace(/^LJ/, '')
  if (s.length !== 8) return `LJ-${s}`
  return `LJ-${s.slice(0, 4)}-${s.slice(4)}`
}

export function mintRedeemCodeValue() {
  return `LJ${randomPart(8)}`
}

/**
 * @param {{ plan?: string, maxUses?: number, note?: string, expiresAt?: string|null, createdBy?: number, count?: number }} opts
 */
export function createRedeemCodes(opts = {}) {
  const plan = normalizePlanId(opts.plan || 'pro')
  if (plan !== 'pro') {
    throw new Error('当前仅支持生成专业档兑换码')
  }
  const maxUses = Math.max(1, Math.min(1000, Number(opts.maxUses) || 1))
  const count = Math.max(1, Math.min(50, Number(opts.count) || 1))
  const note = opts.note ? String(opts.note).slice(0, 120) : null
  const expiresAt = opts.expiresAt || null
  const createdBy = opts.createdBy || null
  const db = getDb()
  const insert = db.prepare(
    `INSERT INTO redeem_codes (code, plan, max_uses, note, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const created = []
  const tx = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      let code = mintRedeemCodeValue()
      let tries = 0
      while (tries < 5) {
        try {
          const info = insert.run(code, plan, maxUses, note, expiresAt, createdBy)
          created.push({
            id: Number(info.lastInsertRowid),
            code,
            display: formatRedeemCode(code),
            plan,
            maxUses,
            note,
            expiresAt,
          })
          break
        } catch (e) {
          tries += 1
          code = mintRedeemCodeValue()
          if (tries >= 5) throw e
        }
      }
    }
  })
  tx()
  return created
}

export function listRedeemCodes(limit = 50) {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, code, plan, max_uses, used_count, note, expires_at, created_at, disabled
       FROM redeem_codes
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(Math.min(200, Math.max(1, limit)))
    .map((r) => ({
      ...r,
      display: formatRedeemCode(r.code),
      remaining: Math.max(0, r.max_uses - r.used_count),
    }))
}

export function disableRedeemCode(id) {
  const db = getDb()
  db.prepare('UPDATE redeem_codes SET disabled = 1 WHERE id = ?').run(id)
  return { ok: true }
}

/**
 * @returns {{ ok: true, plan: string, display: string } | { ok: false, error: string }}
 */
export function redeemCodeForUser(userId, rawCode) {
  const db = getDb()
  const user = db.prepare('SELECT id, role, plan FROM users WHERE id = ?').get(userId)
  if (!user) return { ok: false, error: '用户不存在' }
  if (user.role === 'admin') {
    return { ok: false, error: '管理员本身不限额度，无需兑换' }
  }

  const normalized = normalizeRedeemCode(rawCode)
  if (!normalized.startsWith('LJ') || normalized.length < 10) {
    return { ok: false, error: '兑换码格式无效' }
  }

  const run = db.transaction(() => {
    const row = db
      .prepare('SELECT * FROM redeem_codes WHERE code = ?')
      .get(normalized)
    if (!row || row.disabled) return { ok: false, error: '兑换码无效或已停用' }
    if (row.expires_at) {
      const exp = Date.parse(row.expires_at)
      if (Number.isFinite(exp) && exp < Date.now()) {
        return { ok: false, error: '兑换码已过期' }
      }
    }
    if (row.used_count >= row.max_uses) {
      return { ok: false, error: '兑换码已用尽' }
    }
    const already = db
      .prepare('SELECT id FROM redeem_redemptions WHERE code_id = ? AND user_id = ?')
      .get(row.id, userId)
    if (already) return { ok: false, error: '你已使用过该兑换码' }

    const plan = normalizePlanId(row.plan)
    db.prepare(
      'INSERT INTO redeem_redemptions (code_id, user_id, plan) VALUES (?, ?, ?)',
    ).run(row.id, userId, plan)
    db.prepare(
      'UPDATE redeem_codes SET used_count = used_count + 1 WHERE id = ?',
    ).run(row.id)
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId)
    return { ok: true, plan, display: formatRedeemCode(normalized) }
  })

  return run()
}
