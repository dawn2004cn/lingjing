/**
 * 专业档订单骨架（mock 演示支付；真实微信/支付宝通道可后续替换 provider）
 */

import { randomBytes } from 'crypto'
import { getDb } from './db'
import { normalizePlanId } from './plan'

function envInt(name, fallback) {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

/** 专业档标价（分）；默认 9900 = ¥99 */
export function getProPriceFen() {
  return envInt('PLAN_PRO_PRICE_FEN', 9900)
}

export function mockPayAllowed() {
  return process.env.PLAN_ALLOW_MOCK_PAY !== '0'
}

export function mintOrderNo() {
  const d = new Date()
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('')
  return `LJ${stamp}${randomBytes(3).toString('hex').toUpperCase()}`
}

export function formatAmountYuan(fen) {
  return (Number(fen) / 100).toFixed(2)
}

/**
 * @returns {{ ok: true, order: object } | { ok: false, error: string }}
 */
export function createProOrder(userId) {
  const db = getDb()
  const user = db.prepare('SELECT id, role, plan FROM users WHERE id = ?').get(userId)
  if (!user) return { ok: false, error: '用户不存在' }
  if (user.role === 'admin') return { ok: false, error: '管理员无需购买' }
  if (normalizePlanId(user.plan) === 'pro') return { ok: false, error: '你已是专业档' }

  // 复用未支付订单，避免刷单
  const pending = db
    .prepare(
      `SELECT * FROM plan_orders
       WHERE user_id = ? AND plan = 'pro' AND status = 'pending'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(userId)
  if (pending) {
    return {
      ok: true,
      order: serializeOrder(pending),
      reused: true,
    }
  }

  const orderNo = mintOrderNo()
  const amountFen = getProPriceFen()
  const info = db
    .prepare(
      `INSERT INTO plan_orders (order_no, user_id, plan, amount_fen, status, provider)
       VALUES (?, ?, 'pro', ?, 'pending', 'mock')`,
    )
    .run(orderNo, userId, amountFen)

  const order = db.prepare('SELECT * FROM plan_orders WHERE id = ?').get(info.lastInsertRowid)
  return { ok: true, order: serializeOrder(order), reused: false }
}

function serializeOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    plan: row.plan,
    amountFen: row.amount_fen,
    amountYuan: formatAmountYuan(row.amount_fen),
    status: row.status,
    provider: row.provider,
    paidAt: row.paid_at,
    note: row.note,
    createdAt: row.created_at,
  }
}

/**
 * 演示支付确认：将 pending → paid 并开通 pro
 * 生产可改为微信/支付宝回调验签后调用 markOrderPaid
 */
export function confirmMockPayment(userId, orderIdOrNo) {
  if (!mockPayAllowed()) {
    return { ok: false, error: '演示支付已关闭（PLAN_ALLOW_MOCK_PAY=0）' }
  }
  const db = getDb()
  const key = String(orderIdOrNo || '')
  const order = db
    .prepare(
      `SELECT * FROM plan_orders WHERE user_id = ? AND (id = ? OR order_no = ?)`,
    )
    .get(userId, Number(key) || -1, key)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status === 'paid') {
    return { ok: true, order: serializeOrder(order), alreadyPaid: true }
  }
  if (order.status !== 'pending') {
    return { ok: false, error: `订单状态不可支付：${order.status}` }
  }

  const result = db.transaction(() => {
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE plan_orders
       SET status = 'paid', paid_at = ?, provider = 'mock', note = COALESCE(note, 'mock-pay')
       WHERE id = ? AND status = 'pending'`,
    ).run(now, order.id)
    db.prepare(`UPDATE users SET plan = 'pro' WHERE id = ?`).run(userId)
    return db.prepare('SELECT * FROM plan_orders WHERE id = ?').get(order.id)
  })()

  return { ok: true, order: serializeOrder(result), alreadyPaid: false }
}

/** 供未来真实通道回调复用 */
export function markOrderPaidByOrderNo(orderNo, provider = 'wechat') {
  const db = getDb()
  const order = db.prepare('SELECT * FROM plan_orders WHERE order_no = ?').get(orderNo)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status === 'paid') return { ok: true, order: serializeOrder(order), alreadyPaid: true }
  if (order.status !== 'pending') return { ok: false, error: '订单状态不可支付' }

  const paid = db.transaction(() => {
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE plan_orders SET status = 'paid', paid_at = ?, provider = ? WHERE id = ? AND status = 'pending'`,
    ).run(now, provider, order.id)
    db.prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(
      normalizePlanId(order.plan),
      order.user_id,
    )
    return db.prepare('SELECT * FROM plan_orders WHERE id = ?').get(order.id)
  })()

  return { ok: true, order: serializeOrder(paid), alreadyPaid: false }
}

export function listOrdersForUser(userId, limit = 20) {
  const db = getDb()
  return db
    .prepare(
      `SELECT * FROM plan_orders WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(userId, Math.min(100, Math.max(1, limit)))
    .map(serializeOrder)
}

export function listAllOrders(limit = 50) {
  const db = getDb()
  return db
    .prepare(
      `SELECT o.*, u.username
       FROM plan_orders o
       LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC
       LIMIT ?`,
    )
    .all(Math.min(200, Math.max(1, limit)))
    .map((r) => ({ ...serializeOrder(r), username: r.username }))
}

export function cancelPendingOrder(userId, orderId) {
  const db = getDb()
  const order = db
    .prepare(`SELECT * FROM plan_orders WHERE id = ? AND user_id = ?`)
    .get(orderId, userId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status !== 'pending') return { ok: false, error: '仅待支付订单可取消' }
  db.prepare(`UPDATE plan_orders SET status = 'cancelled' WHERE id = ?`).run(orderId)
  return { ok: true }
}
